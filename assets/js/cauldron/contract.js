// contract.js - Cauldron on-chain bindings (read + write).
//
// Pre-deployment shim. The Cauldron contract is not yet on mainnet, so this module is
// inert until `window.CAULDRON.address` is populated. While inert, every reader returns
// `null`, and app.js keeps rendering from the mocked data in data.js.
//
// To go live, set `window.CAULDRON.address = '0x…'` BEFORE this script runs (eg. inline
// in swap.html, or via a future deploy artifact), or call `Cauldron.setAddress(...)`
// before the React app mounts.
//
// Wallet path is the site's standard one: ethers v5 via the UMD bundle that steak.html
// already loads. window.ethereum is the injected provider; walletkit (the WalletConnect
// integration used by steak) can hook in later by feeding a Web3Provider-compatible
// provider into setWalletProvider().

(function () {
  'use strict';

  const READ_RPC = 'https://ethereum.publicnode.com';

  // Pair config. The Cauldron only trades a single token/ETH pair, set at deploy time.
  // These match what the contract's constructor will be called with.
  const TOKEN_ADDRESS = '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'; // w🍖
  const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';   // Uniswap V3 SwapRouter
  const V3_QUOTER = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';   // Uniswap V3 QuoterV2

  // Pool fee tier for the w🍖/WETH pair, in hundredths of a bip (10000 = 1%).
  // Confirmed against the Uniswap V3 factory (0x1F98...F984): the 1% tier is the only
  // tier with a deployed, liquid pool for this pair (pool 0xc3b9903f07c7b7614b9b5b490c7ce89bd688282e);
  // the 0.3% and 0.05% tiers have no pool. Re-verify before mainnet if liquidity migrates.
  const POOL_FEE = 10000;

  // Token decimals (w🍖 = 3, confirmed on-chain). data.js also exposes this via TOKEN.decimals,
  // but contract.js loads first, so keep a local copy.
  const TOKEN_DECIMALS = 3;

  // Default swap fee in bps, matching the contract's `feeBps` default (0.3%). Used as a
  // fallback for quote math when the live `feeBps()` read is unavailable.
  const FEE_BPS_DEFAULT = 30;

  // publicnode caps eth_getLogs at 50,000 blocks per request - query history in chunks.
  const GETLOGS_CHUNK = 49000;

  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
  ];

  // Minimal ERC-721 metadata ABI for resolving NFT prizes to a collection name + card image.
  const ERC721_META_ABI = [
    'function name() view returns (string)',
    'function tokenURI(uint256) view returns (string)',
  ];

  const QUOTER_V2_ABI = [
    'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
  ];

  // Minimal Uniswap V3 SwapRouter ABI for the direct-swap bypass (no Cauldron, no fee, no entries).
  const V3_ROUTER_ABI = [
    'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
  ];

  // Loaded asynchronously from /assets/data/cauldron-abi.json so we don't inline a 25KB
  // JSON blob into every script bundle.
  let _cauldronAbi = null;
  const _abiReady = fetch('/assets/data/cauldron-abi.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((abi) => { _cauldronAbi = abi; })
    .catch(() => { _cauldronAbi = null; });

  const state = {
    address: null,          // set this to go live
    walletProvider: null,   // injected Web3Provider (from walletkit or window.ethereum)
    account: null,
  };

  // Truncate an address for compact display (0x1234…abcd). Self-contained so it does not depend on
  // data.js load order.
  function _short(addr) {
    return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : '';
  }

  // Convenience: chain reads use the read-only RPC; writes use the wallet provider.
  function readProvider() {
    if (!window.ethers) return null;
    return new window.ethers.providers.JsonRpcProvider(READ_RPC);
  }

  function cauldronContract(provider) {
    if (!state.address || !_cauldronAbi || !window.ethers) return null;
    return new window.ethers.Contract(state.address, _cauldronAbi, provider);
  }

  function tokenContract(provider) {
    if (!window.ethers) return null;
    return new window.ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
  }

  function quoterContract(provider) {
    if (!window.ethers) return null;
    return new window.ethers.Contract(V3_QUOTER, QUOTER_V2_ABI, provider);
  }

  function isLive() {
    return Boolean(state.address && _cauldronAbi && window.ethers);
  }

  function setAddress(addr) {
    state.address = addr || null;
  }

  function setWalletProvider(provider) {
    if (!window.ethers || !provider) {
      state.walletProvider = null;
      return;
    }
    state.walletProvider = new window.ethers.providers.Web3Provider(provider, 'any');
  }

  async function connectInjected() {
    if (!window.ethereum) throw new Error('No injected wallet found.');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    state.account = accounts && accounts[0] ? accounts[0] : null;
    setWalletProvider(window.ethereum);
    return state.account;
  }

  // ---- site-wide walletkit bridge ----
  //
  // The rest of the site (steak.html, etc.) routes wallet connections through
  // window.unicornMeatWalletKit - a Reown/WalletConnect-backed singleton defined
  // in /assets/js/walletkit-integration.js. We let it own the wallet picker UI
  // and connection lifecycle; cauldron just listens for the resulting state.
  //
  // Usage from app.js:
  //   const addr = await Cauldron.connectViaWalletKit();      // opens modal, awaits connect
  //   Cauldron.onWalletChange(addr => { ... });                // subscribe to changes
  //
  // No-ops if walletkit is missing - falls back to connectInjected so the page
  // still works if walletkit-integration.js failed to load.

  const _walletListeners = new Set();
  function _emitWalletChange() {
    for (const cb of _walletListeners) { try { cb(state.account); } catch (_e) {} }
  }
  function onWalletChange(cb) {
    _walletListeners.add(cb);
    return () => _walletListeners.delete(cb);
  }

  function _syncFromWalletKit() {
    const wk = window.unicornMeatWalletKit;
    if (!wk) return false;
    if (wk.isConnected && wk.account && wk.account.address) {
      state.account = wk.account.address;
      // The walletkit creates its own Web3Provider; reuse it so signing flows
      // hit the same wallet session the rest of the site uses.
      if (wk.provider) {
        state.walletProvider = wk.provider;
      } else if (window.ethereum) {
        setWalletProvider(window.ethereum);
      }
      return true;
    }
    return false;
  }

  // Poll loop: walletkit's internal events aren't exposed publicly, so we
  // observe its public state. Cheap (a property read every 600ms) and resilient
  // to whichever wallet provider eventually fulfills the connection.
  let _watchTimer = null;
  function _startWatching() {
    if (_watchTimer) return;
    let last = state.account;
    _watchTimer = setInterval(() => {
      _syncFromWalletKit();
      if (state.account !== last) {
        last = state.account;
        _emitWalletChange();
      }
    }, 600);
  }

  function _hookWalletKit() {
    const wk = window.unicornMeatWalletKit;
    if (!wk) return;
    // Wrap walletkit's handleConnection/handleDisconnection so we get instant
    // notification on top of the polling fallback. Idempotent: re-wrapping is
    // detected by the _cauldronHooked flag.
    if (!wk._cauldronHooked) {
      const origConnect = wk.handleConnection && wk.handleConnection.bind(wk);
      const origDisconnect = wk.handleDisconnection && wk.handleDisconnection.bind(wk);
      if (origConnect) {
        wk.handleConnection = async function (account) {
          const ret = await origConnect(account);
          _syncFromWalletKit();
          _emitWalletChange();
          return ret;
        };
      }
      if (origDisconnect) {
        wk.handleDisconnection = async function () {
          const ret = await origDisconnect();
          state.account = null;
          state.walletProvider = null;
          _emitWalletChange();
          return ret;
        };
      }
      wk._cauldronHooked = true;
    }
    // If walletkit was already connected before we hooked in, sync now.
    if (_syncFromWalletKit()) _emitWalletChange();
  }

  // Try immediately; if walletkit isn't ready yet (its DOMContentLoaded init may
  // not have run when contract.js executes), retry until it is or timeout.
  let _attempts = 0;
  function _waitForWalletKit() {
    if (window.unicornMeatWalletKit) { _hookWalletKit(); _startWatching(); return; }
    if (_attempts++ > 50) return; // ~10s, then give up - page still works with connectInjected
    setTimeout(_waitForWalletKit, 200);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _waitForWalletKit);
    } else {
      _waitForWalletKit();
    }
  }

  async function connectViaWalletKit() {
    const wk = window.unicornMeatWalletKit;
    if (!wk) {
      // Walletkit unavailable - fall back to a plain injected connect.
      return connectInjected();
    }
    _hookWalletKit();
    // If already connected, return immediately.
    if (_syncFromWalletKit()) return state.account;
    // Open the site's wallet picker modal and resolve once a connection lands.
    wk.openWalletModal();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsub();
        reject(new Error('Wallet connect timed out.'));
      }, 180_000);
      const unsub = onWalletChange((addr) => {
        if (addr) { clearTimeout(timeout); unsub(); resolve(addr); }
      });
    });
  }

  // ---- reads ----

  async function readPotState() {
    await _abiReady;
    if (!isLive()) return null;
    const c = cauldronContract(readProvider());
    if (!c) return null;
    const [pot, threshold, paused, drawable, unclaimedRounds] = await Promise.all([
      c.pot(), c.potThreshold(), c.paused(), c.drawable(), c.unclaimedRounds(),
    ]);
    return {
      ethWei: pot,
      thresholdWei: threshold,
      ethFloat: Number(window.ethers.utils.formatEther(pot)),
      thresholdFloat: Number(window.ethers.utils.formatEther(threshold)),
      paused,
      drawable,
      unclaimedRounds: unclaimedRounds.toNumber(),
    };
  }

  // The current (open) round. There is no time window: entries accrue on every swap and the
  // round stays open until someone calls draw() (which is enabled once the pot reaches the
  // threshold). Returns the live entry standing for the round and the connected user.
  async function readRaffleState(userAddress) {
    await _abiReady;
    if (!isLive()) return null;
    const c = cauldronContract(readProvider());
    if (!c) return null;
    const roundId = await c.currentRound();
    const [participants, totalWeight, boost] = await Promise.all([
      c.getParticipantCount(roundId),
      c.totalSqrtWeight(roundId),
      c.getRoundBoost(roundId),
    ]);
    let userEntries = window.ethers.BigNumber.from(0);
    if (userAddress) {
      try { userEntries = await c.getEntries(roundId, userAddress); } catch (_e) {}
    }
    return {
      roundId: roundId.toNumber(),
      participants: participants.toNumber(),
      totalSqrtWeight: totalWeight.toString(),
      userEntries: userEntries.toString(),
      // Permissionless ETH boost folded into this round's prize at draw time. Held apart from
      // the pot, so it never moves the draw threshold or earns entries.
      roundBoostFloat: Number(window.ethers.utils.formatEther(boost)),
    };
  }

  // Resolve raw (address, amount) ERC-20 prize pairs into display objects, best-effort
  // reading each token's symbol + decimals so amounts format correctly. `amount` is a float.
  // Rewrite ipfs:// (and ipfs://ipfs/) URIs to an HTTP gateway so the browser can load them.
  function _ipfsToHttp(uri) {
    if (!uri || typeof uri !== 'string') return uri;
    if (uri.startsWith('ipfs://ipfs/')) return 'https://ipfs.io/ipfs/' + uri.slice(12);
    if (uri.startsWith('ipfs://')) return 'https://ipfs.io/ipfs/' + uri.slice(7);
    return uri;
  }

  // Resolve ERC-721 prize NFTs to display metadata: the collection name (name()), and the card's
  // own name + image from its tokenURI JSON (handles ipfs:// and base64/utf8 data URIs). Every
  // lookup is best-effort and isolated: on any failure the entry still carries address + tokenId,
  // so the UI can fall back to a styled placeholder. Never throws.
  async function _resolveNftPrizes(addresses, ids) {
    const provider = readProvider();
    const out = [];
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const tokenId = ids[i].toString();
      const entry = { address, tokenId, collection: null, name: null, image: null, originalContract: null };
      try {
        const nft = new window.ethers.Contract(address, ERC721_META_ABI, provider);
        const [collection, uriRaw] = await Promise.all([
          nft.name().catch(() => null),
          nft.tokenURI(tokenId).catch(() => null),
        ]);
        entry.collection = collection || null;
        const uri = _ipfsToHttp(uriRaw);
        if (uri) {
          let json = null;
          if (uri.startsWith('data:application/json;base64,')) {
            json = JSON.parse(atob(uri.slice('data:application/json;base64,'.length)));
          } else if (uri.startsWith('data:application/json,')) {
            json = JSON.parse(decodeURIComponent(uri.slice('data:application/json,'.length)));
          } else {
            const r = await fetch(uri);
            if (r.ok) json = await r.json();
          }
          if (json) {
            entry.name = json.name || null;
            entry.image = _ipfsToHttp(json.image || json.image_url || null);
            // Wrapped legacy NFTs (eg. Wrapped CryptoPokemons) carry the original pre-wrap contract
            // in an attribute, so we can deep-link its provenance instead of the wrapper.
            const attrs = Array.isArray(json.attributes) ? json.attributes : [];
            const orig = attrs.find(a => a && typeof a.trait_type === 'string' &&
              a.trait_type.toLowerCase() === 'original contract');
            if (orig && /^0x[0-9a-fA-F]{40}$/.test(String(orig.value || '').trim())) {
              entry.originalContract = String(orig.value).trim().toLowerCase();
            }
          }
        }
      } catch (_e) { /* leave placeholders; UI renders collection + id */ }
      out.push(entry);
    }
    return out;
  }

  async function _resolveTokenPrizes(addresses, amounts) {
    const provider = readProvider();
    const out = [];
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      let sym = null;
      let decimals = 18;
      try {
        const t = new window.ethers.Contract(addr, ERC20_ABI, provider);
        const [s, d] = await Promise.all([t.symbol(), t.decimals()]);
        sym = s;
        decimals = Number(d);
      } catch (_e) { /* non-standard token: fall back to address + raw amount */ }
      let amount;
      try {
        amount = Number(window.ethers.utils.formatUnits(amounts[i], decimals));
      } catch (_e) {
        amount = Number(amounts[i].toString());
      }
      out.push({ address: addr, sym, amount });
    }
    return out;
  }

  // Bundled prizes for a specific raffle (getRoundPrizeTokens / getRoundPrizeNFTs). The
  // ETH part of the prize is the raffle's prizeETH (see readRaffleState.prizeEthFloat).
  async function readRafflePrizes(raffleId) {
    await _abiReady;
    if (!isLive() || !raffleId) return null;
    const c = cauldronContract(readProvider());
    if (!c) return null;
    const [[tokens, amounts], [nfts, ids]] = await Promise.all([
      c.getRoundPrizeTokens(raffleId),
      c.getRoundPrizeNFTs(raffleId),
    ]);
    return {
      tokens: await _resolveTokenPrizes(tokens, amounts),
      nfts: await _resolveNftPrizes(nfts, ids),
    };
  }

  // Bonus prizes queued for a specific round (getQueuedPrizesForRound / getQueuedNFTsForRound).
  // Defaults to the current round (the prizes that bundle into the next draw).
  async function readQueuedPrizes(roundId) {
    await _abiReady;
    if (!isLive()) return null;
    const c = cauldronContract(readProvider());
    if (!c) return null;
    const rid = roundId == null ? await c.currentRound() : roundId;
    const [[tokens, amounts], [nfts, ids]] = await Promise.all([
      c.getQueuedPrizesForRound(rid),
      c.getQueuedNFTsForRound(rid),
    ]);
    return {
      roundId: window.ethers.BigNumber.from(rid).toNumber(),
      tokens: await _resolveTokenPrizes(tokens, amounts),
      nfts: await _resolveNftPrizes(nfts, ids),
    };
  }

  async function readUserStats(userAddress) {
    await _abiReady;
    if (!isLive() || !userAddress) return null;
    const provider = readProvider();
    const c = cauldronContract(provider);
    if (!c) return null;
    const [lifetime, count, lastBlock, current, multBps] = await Promise.all([
      c.lifetimeVolume(userAddress),
      c.swapCount(userAddress),
      c.lastSwapBlock(userAddress),
      provider.getBlockNumber(),
      c.getHolderMultiplier(userAddress),
    ]);
    // amountIn is denominated in whatever was input to swap(): ETH on buys, w🍖 on sells.
    // For the headline "lifetime volume in ETH" the right number requires per-event
    // accounting (buy ethSide vs sell ethSide). Until we have an indexer, expose the raw
    // lifetimeVolume from the contract and surface the count + last activity clearly.
    return {
      lifetimeVolumeRaw: lifetime.toString(),
      swapCount: count.toNumber(),
      lastSwapBlock: lastBlock.toNumber(),
      daysSinceLastSwap: lastBlock.isZero()
        ? null
        : Math.max(0, Math.floor(((current - lastBlock.toNumber()) * 12) / 86400)), // ~12s/block
      // Holder multiplier in bps (10000 = 1x), sampled from the live w🍖 balance at draw time.
      holderMultiplierBps: multBps.toNumber(),
    };
  }

  // Completed-round history for the "Past winners" panel. Reads getRoundResult for the most recent
  // `max` drawn rounds (completedRounds() == currentRound - 1). All on-chain, no indexer needed.
  async function readRoundHistory(max = 8) {
    await _abiReady;
    if (!isLive()) return [];
    const c = cauldronContract(readProvider());
    if (!c) return [];
    let done;
    try {
      done = (await c.completedRounds()).toNumber();
    } catch (_e) {
      return [];
    }
    const rows = [];
    for (let id = done; id >= 1 && rows.length < max; id--) {
      try {
        // getRoundResult gives the headline numbers; getRound adds the auto-pay delivery flags so the
        // panel can show whether the prize was paid out automatically or is still awaiting a claim.
        const [res, full] = await Promise.all([c.getRoundResult(id), c.getRound(id)]);
        // Bundled ERC-20 / ERC-721 prizes for this round, so the panel can show the full bundle, not
        // just the ETH. Best-effort: a failed read just leaves the row ETH-only.
        let tokens = [];
        let nfts = [];
        try {
          const [[tAddrs, tAmts], [nAddrs, nIds]] = await Promise.all([
            c.getRoundPrizeTokens(id),
            c.getRoundPrizeNFTs(id),
          ]);
          if (tAddrs.length) {
            const resolved = await _resolveTokenPrizes(tAddrs, tAmts);
            tokens = resolved.map((t) => ({
              sym: t.sym || _short(t.address),
              amount: window.compact ? window.compact(t.amount) : String(t.amount),
            }));
          }
          nfts = nAddrs.map((addr, i) => ({ label: _short(addr) + ' #' + nIds[i].toString() }));
        } catch (_e) { /* leave bundle empty */ }
        rows.push({
          roundId: id,
          winner: res.winner,
          prizeEthFloat: Number(window.ethers.utils.formatEther(res.prizeETH)),
          participantCount: res.participantCount.toNumber(),
          drawnAtBlock: res.drawnAtBlock.toNumber(),
          settled: full.settled,
          tokens,
          nfts,
        });
      } catch (_e) { /* skip unreadable round */ }
    }
    return rows;
  }

  async function readFeeBps() {
    await _abiReady;
    if (!isLive()) return null;
    const c = cauldronContract(readProvider());
    if (!c) return null;
    try {
      return (await c.feeBps()).toNumber();
    } catch (_e) {
      return null;
    }
  }

  // Real wallet balances for the connected account (P1). ETH via the provider, w🍖 via
  // the ERC20. Returns wei BigNumbers plus float convenience values. Null if no account.
  async function readBalances(userAddress) {
    if (!window.ethers || !userAddress) return null;
    const provider = readProvider();
    if (!provider) return null;
    const tok = tokenContract(provider);
    const [ethWei, tokenWei] = await Promise.all([
      provider.getBalance(userAddress),
      tok.balanceOf(userAddress),
    ]);
    return {
      ethWei,
      tokenWei,
      ethFloat: Number(window.ethers.utils.formatEther(ethWei)),
      tokenFloat: Number(window.ethers.utils.formatUnits(tokenWei, TOKEN_DECIMALS)),
    };
  }

  // Read the w🍖 token's on-chain symbol + decimals so the UI never assumes them. Falls back to
  // the known w🍖 / 3-decimal values if the read fails. Cached after the first successful read.
  let _tokenMeta = null;
  async function readTokenMeta() {
    if (_tokenMeta) return _tokenMeta;
    if (!window.ethers) return { symbol: 'w🍖', decimals: TOKEN_DECIMALS };
    const provider = readProvider();
    if (!provider) return { symbol: 'w🍖', decimals: TOKEN_DECIMALS };
    try {
      const tok = tokenContract(provider);
      const [symbol, decimals] = await Promise.all([tok.symbol(), tok.decimals()]);
      _tokenMeta = { symbol, decimals: Number(decimals) };
      return _tokenMeta;
    } catch (_e) {
      return { symbol: 'w🍖', decimals: TOKEN_DECIMALS };
    }
  }

  // Recent permissionless prize boosts for a round (PrizeBoosted events, newest first). Defaults to
  // the current round. Boosts top up that round's ETH prize without earning entries or moving the
  // draw threshold. Scanned client-side in chunks (no indexer).
  async function readRecentBoosts(roundId, max = 5, lookbackBlocks = 200000) {
    await _abiReady;
    if (!isLive()) return [];
    const provider = readProvider();
    const c = cauldronContract(provider);
    if (!c) return [];
    try {
      const rid = roundId == null ? await c.currentRound() : roundId;
      const head = await provider.getBlockNumber();
      const from = Math.max(0, head - lookbackBlocks);
      const filter = c.filters.PrizeBoosted(window.ethers.BigNumber.from(rid));
      const evs = await _queryFilterChunked(c, filter, from, head);
      const rows = evs.map((ev) => ({
        booster: ev.args.booster,
        amountEth: Number(window.ethers.utils.formatEther(ev.args.amount)),
        blockNumber: ev.blockNumber,
      }));
      rows.sort((a, b) => b.blockNumber - a.blockNumber);
      return rows.slice(0, max);
    } catch (_e) {
      return [];
    }
  }

  // Lifetime-volume leaderboard, built client-side from SwapTracked events (the contract exposes no
  // enumeration of swappers). Each event carries the swapper's running lifetimeVolume + swapCount, so
  // we keep the highest (latest) figure seen per address and rank descending. lifetimeVolume mixes
  // ETH (buys) and w🍖 (sells) units on-chain, so it is surfaced as a raw activity figure, not ETH.
  async function readLeaderboard(max = 8, lookbackBlocks = 400000) {
    await _abiReady;
    if (!isLive()) return [];
    const provider = readProvider();
    const c = cauldronContract(provider);
    if (!c) return [];
    try {
      const head = await provider.getBlockNumber();
      const from = Math.max(0, head - lookbackBlocks);
      const evs = await _queryFilterChunked(c, c.filters.SwapTracked(), from, head);
      const best = new Map();
      for (const ev of evs) {
        const addr = ev.args.swapper;
        const vol = ev.args.lifetimeVolume;
        const count = ev.args.swapCount.toNumber();
        const prev = best.get(addr);
        // lifetimeVolume only ever grows, so the largest value is the most recent.
        if (!prev || vol.gt(prev.vol)) best.set(addr, { vol, count });
      }
      const rows = Array.from(best.entries()).map(([address, v]) => ({
        address,
        volumeRaw: Number(window.ethers.utils.formatEther(v.vol)),
        swaps: v.count,
      }));
      rows.sort((a, b) => b.volumeRaw - a.volumeRaw);
      return rows.slice(0, max);
    } catch (_e) {
      return [];
    }
  }

  // Live ETH/USD spot price from CoinGecko's free simple-price API (no key, CORS-enabled). Used only
  // for the swap card's USD display, so a failure (offline, rate limit, blocker) just falls back to
  // the static ETH_USD constant. Independent of the contract, so it works in both mock and live mode.
  async function readEthUsd() {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!r.ok) return null;
      const j = await r.json();
      const p = j && j.ethereum && j.ethereum.usd;
      return typeof p === 'number' && p > 0 ? p : null;
    } catch (_e) {
      return null;
    }
  }

  // ---- live pricing (QuoterV2) ----

  // Ask Uniswap's QuoterV2 for the real expected output of a swap (C1). QuoterV2's
  // quoteExactInputSingle is a non-view function (it mutates then reverts internally), so
  // it must be invoked via callStatic to read the return value without sending a tx.
  //
  // For a BUY the Cauldron collects its fee from the ETH input before forwarding to the
  // router, so we quote against the net forwarded amount to match what the pool sees.
  // For a SELL the router runs on the full token amountIn and the Cauldron collects its fee
  // from the WETH output afterwards; the router enforces amountOutMinimum against the
  // gross WETH out, so the quote (and the slippage floor derived from it) is on the gross.
  //
  // Returns the expected output as a BigNumber: tokens-out (3 decimals) for a buy, gross
  // WETH-out (18 decimals) for a sell. Null if the quoter cannot be reached.
  //
  // `useCauldron` (default true) quotes the Cauldron path: a buy nets the 0.3% fee out of the input
  // before it hits the pool. For the direct bypass (useCauldron false) the full input hits the pool, so
  // the buy quote is on the gross amount.
  async function quote({ side, amountInWei, useCauldron = true }) {
    if (!window.ethers || !amountInWei) return null;
    const provider = readProvider();
    const q = quoterContract(provider);
    if (!q) return null;

    let quoteAmountIn = amountInWei;
    if (side === 'buy' && useCauldron) {
      const feeBps = await readFeeBps();
      const bps = feeBps == null ? FEE_BPS_DEFAULT : feeBps;
      const fee = amountInWei.mul(bps).div(10000);
      quoteAmountIn = amountInWei.sub(fee);
    }

    const params = {
      tokenIn: side === 'buy' ? WETH_ADDRESS : TOKEN_ADDRESS,
      tokenOut: side === 'buy' ? TOKEN_ADDRESS : WETH_ADDRESS,
      amountIn: quoteAmountIn,
      fee: POOL_FEE,
      sqrtPriceLimitX96: 0,
    };
    const res = await q.callStatic.quoteExactInputSingle(params);
    // QuoterV2 returns (amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate).
    return res.amountOut;
  }

  // ---- writes ----

  async function approveTokenIfNeeded(amountIn) {
    if (!isLive() || !state.walletProvider || !state.account) return;
    const signer = state.walletProvider.getSigner();
    const tok = tokenContract(signer);
    const allowance = await tok.allowance(state.account, state.address);
    if (allowance.gte(amountIn)) return;
    const tx = await tok.approve(state.address, window.ethers.constants.MaxUint256);
    await tx.wait();
  }

  function buildSwapParams({ side, amountIn, minOut, recipient }) {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
    if (side === 'buy') {
      return {
        tokenIn: WETH_ADDRESS,
        tokenOut: TOKEN_ADDRESS,
        fee: POOL_FEE,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: 0,
      };
    }
    return {
      tokenIn: TOKEN_ADDRESS,
      tokenOut: WETH_ADDRESS,
      fee: POOL_FEE,
      recipient, // contract overrides this to itself on sells - supply as informational
      deadline,
      amountIn,
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: 0,
    };
  }

  async function swap({ side, amountInWei, minOutWei }) {
    if (!isLive()) throw new Error('Cauldron is not yet deployed.');
    if (!state.walletProvider || !state.account) throw new Error('Connect a wallet first.');
    const signer = state.walletProvider.getSigner();
    const c = cauldronContract(signer);
    if (!c) throw new Error('Cauldron contract unavailable.');

    if (side === 'sell') {
      await approveTokenIfNeeded(amountInWei);
    }
    const params = buildSwapParams({
      side,
      amountIn: amountInWei,
      minOut: minOutWei,
      recipient: state.account,
    });
    const overrides = side === 'buy' ? { value: amountInWei } : {};
    const tx = await c.swap(params, overrides);
    const receipt = await tx.wait();
    return receipt;
  }

  // Direct-swap bypass: route straight to the Uniswap V3 SwapRouter, skipping the Cauldron entirely.
  // No 0.3% fee, no raffle entries, no holder bonus. Same pool and liquidity. Does not require the
  // Cauldron to be deployed or unpaused. Note: a direct SELL delivers WETH to the user (the Cauldron's
  // native-ETH unwrap is part of the Cauldron path, not the bare router), so the UI labels this.
  async function swapDirect({ side, amountInWei, minOutWei }) {
    if (!window.ethers) throw new Error('Wallet library not loaded.');
    if (!state.walletProvider || !state.account) throw new Error('Connect a wallet first.');
    const signer = state.walletProvider.getSigner();
    const router = new window.ethers.Contract(V3_ROUTER, V3_ROUTER_ABI, signer);

    if (side === 'sell') {
      const tok = tokenContract(signer);
      const allowance = await tok.allowance(state.account, V3_ROUTER);
      if (allowance.lt(amountInWei)) {
        const atx = await tok.approve(V3_ROUTER, window.ethers.constants.MaxUint256);
        await atx.wait();
      }
    }
    const params = buildSwapParams({
      side,
      amountIn: amountInWei,
      minOut: minOutWei,
      recipient: state.account,
    });
    const overrides = side === 'buy' ? { value: amountInWei } : {};
    const tx = await router.exactInputSingle(params, overrides);
    return tx.wait();
  }

  // Draw the current round. Callable by anyone once the pot has reached the threshold; it
  // picks a sqrt-weighted winner from every entry since the last draw, commits the pot (plus
  // any queued bonus prizes) as the prize, and opens a fresh round. The prize is auto-paid to
  // the winner inside the draw, so no follow-up action is needed on the normal path; claim() is
  // only a fallback if a payout leg fails. Reverts with PotBelowThreshold if the pot is not
  // full. Works even while paused.
  async function draw() {
    if (!isLive()) throw new Error('Cauldron is not yet deployed.');
    if (!state.walletProvider || !state.account) throw new Error('Connect a wallet first.');
    const signer = state.walletProvider.getSigner();
    const c = cauldronContract(signer);
    if (!c) throw new Error('Cauldron contract unavailable.');
    const tx = await c.draw();
    return tx.wait();
  }

  // Fallback claim: deliver the still-owed legs of a round whose auto-pay did not fully land at
  // draw time. On the normal path the prize is auto-paid and this is never needed; it reverts
  // (RoundAlreadySettled) once a round is fully settled.
  async function claim(raffleId) {
    if (!isLive()) throw new Error('Cauldron is not yet deployed.');
    if (!state.walletProvider || !state.account) throw new Error('Connect a wallet first.');
    const signer = state.walletProvider.getSigner();
    const c = cauldronContract(signer);
    if (!c) throw new Error('Cauldron contract unavailable.');
    const tx = await c.claim(raffleId);
    return tx.wait();
  }

  // Permissionlessly top up the current round's ETH prize. Anyone can boost, including while the
  // contract is paused (so the launch round can be seeded). The sent ETH is held apart from the pot,
  // so it never earns raffle entries, never moves the draw threshold, and never triggers a draw; it
  // is folded into the prize when that round draws. Reverts (InvalidParams) on a zero amount.
  async function boostPrize(amountWei) {
    if (!isLive()) throw new Error('Cauldron is not yet deployed.');
    if (!state.walletProvider || !state.account) throw new Error('Connect a wallet first.');
    if (!amountWei || amountWei.lte(0)) throw new Error('Enter an amount to boost.');
    const signer = state.walletProvider.getSigner();
    const c = cauldronContract(signer);
    if (!c) throw new Error('Cauldron contract unavailable.');
    const tx = await c.boostPrize({ value: amountWei });
    return tx.wait();
  }

  // ---- recent winners (event-driven, no indexer) ----

  // Query an event filter across a wide block range in <=49k-block chunks, because
  // publicnode (and most public RPCs) cap eth_getLogs at 50k blocks per request (Perf1).
  async function _queryFilterChunked(c, filter, from, to) {
    const out = [];
    for (let start = from; start <= to; start += GETLOGS_CHUNK + 1) {
      const end = Math.min(start + GETLOGS_CHUNK, to);
      try {
        const evs = await c.queryFilter(filter, start, end);
        for (const ev of evs) out.push(ev);
      } catch (_e) { /* skip a bad chunk rather than abort the whole scan */ }
    }
    return out;
  }

  // Find a drawn round the connected user won whose auto-pay did not fully land, so the UI can
  // surface the fallback claim button. Prizes are pushed to the winner at draw time, so this is
  // only non-null in the rare case a leg failed to deliver (the winner could not receive the ETH,
  // or a bundled token/NFT transfer reverted). A round is settled once every leg is delivered, so
  // `!r.settled` is exactly "something is still owed". Scans WinnerDrawn events (winner is an
  // indexed topic) in chunks, newest-first, and confirms against getRound.
  async function findClaimableForUser(userAddress, lookbackBlocks = 200000) {
    await _abiReady;
    if (!isLive() || !userAddress) return null;
    const provider = readProvider();
    const c = cauldronContract(provider);
    if (!c) return null;
    try {
      const head = await provider.getBlockNumber();
      const from = Math.max(0, head - lookbackBlocks);
      const filter = c.filters.WinnerDrawn(null, userAddress);
      const evs = await _queryFilterChunked(c, filter, from, head);
      for (let i = evs.length - 1; i >= 0; i--) {
        const roundId = evs[i].args.roundId;
        const r = await c.getRound(roundId);
        if (r.drawn && !r.settled && r.winner && r.winner.toLowerCase() === userAddress.toLowerCase()) {
          return {
            raffleId: roundId.toString(),
            prizeEthFloat: Number(window.ethers.utils.formatEther(r.prizeETH)),
            ethOwed: !r.ethPaid && r.prizeETH.gt(0),
            tokensOwed: !r.tokensPaid,
          };
        }
      }
    } catch (_e) { /* RPC range issues - treat as nothing claimable */ }
    return null;
  }

  // Subscribe to WinnerDrawn events from the contract. Returns an unsubscribe fn.
  // Without a deployment this no-ops; once live, we keep an in-memory ring of the last N.
  async function watchRecentWinners(onUpdate, lookbackBlocks = 50000, max = 5) {
    await _abiReady;
    if (!isLive()) return () => {};
    const provider = readProvider();
    const c = cauldronContract(provider);
    if (!c) return () => {};

    const ring = [];
    const push = (roundId, winner, blockNumber) => {
      ring.unshift({ raffleId: roundId.toString(), winner, blockNumber });
      if (ring.length > max) ring.length = max;
      onUpdate(ring.slice());
    };

    try {
      const head = await provider.getBlockNumber();
      const from = Math.max(0, head - lookbackBlocks);
      const filter = c.filters.WinnerDrawn();
      // Chunked: a single 50k-block queryFilter is rejected/capped by publicnode (Perf1).
      const past = await _queryFilterChunked(c, filter, from, head);
      for (const ev of past.slice(-max)) {
        push(ev.args.roundId, ev.args.winner, ev.blockNumber);
      }
    } catch (_e) { /* RPC may not support filter range - silent */ }

    const handler = (roundId, winner, _participants, _weight, ev) => {
      push(roundId, winner, ev.blockNumber);
    };
    c.on('WinnerDrawn', handler);
    return () => c.off('WinnerDrawn', handler);
  }

  window.CAULDRON = {
    // Config. `address` is a live getter/setter over the internal state, so BOTH
    // `window.CAULDRON.address = '0x...'` and `setAddress('0x...')` work and `.address`
    // always reflects the address the reads actually use.
    get address() { return state.address; },
    set address(v) { state.address = v || null; },
    setAddress,
    setWalletProvider,
    TOKEN_ADDRESS, WETH_ADDRESS, V3_ROUTER, V3_QUOTER, POOL_FEE,

    // State
    isLive,
    abiReady: _abiReady,
    get account() { return state.account; },

    // Wallet
    connectInjected,
    connectViaWalletKit,
    onWalletChange,

    // Reads
    readPotState,
    readRaffleState,
    readRafflePrizes,
    readQueuedPrizes,
    readUserStats,
    readFeeBps,
    readBalances,
    readRoundHistory,
    readTokenMeta,
    readRecentBoosts,
    readLeaderboard,
    readEthUsd,
    findClaimableForUser,

    // Pricing
    quote,

    // Writes
    swap,
    swapDirect,
    draw,
    claim,
    boostPrize,

    // Events
    watchRecentWinners,
  };
})();
