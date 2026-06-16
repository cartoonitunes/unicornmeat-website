// app.jsx - The Cauldron: layout, state orchestration, nav.
//
// Two operating modes:
//   1. MOCK MODE (current default): window.CAULDRON.address is null. All state comes from
//      data.js seeds; the swap CTA simulates a 950ms confirmation. Used for design review
//      and as a graceful fallback before the contract is deployed.
//   2. LIVE MODE: window.CAULDRON.address is a deployed Cauldron contract address. State
//      is read on mount and on swap-confirm from the chain (pot, raffle, user stats,
//      recent winners). The swap CTA invokes Cauldron.swap() through the connected
//      wallet. Wallet connect uses window.ethereum (via contract.js).
//
// Mode is chosen once at mount based on Cauldron.isLive().

const {
  useState,
  useEffect,
  useMemo,
  useRef
} = React;
const CAULDRON_CONFIG = {
  intensity: 'tasteful',
  brew: ['#8B5CF6', '#C026D3', '#5B21B6'],
  displayFont: 'Inter Tight'
};
// Mirrors the site-wide nav (index.html / steak.html): clean text labels, no emojis. About first
// (context for new visitors), Swap as the primary CTA pill, then Steak / Market / ENS, plus a "More"
// dropdown for the rest. "ENS" is the former "Herd" link, renamed to say what it actually is.
const NAV = [{
  label: 'About',
  href: 'https://unicornmeateth.com/#about'
}, {
  label: 'Swap',
  href: '/swap',
  active: true,
  cta: true
}, {
  label: 'Steak',
  href: '/steak'
}, {
  label: 'Market',
  href: '/market'
}, {
  label: 'ENS',
  href: 'https://unicornmeateth.com/#join-herd'
}];
const NAV_MORE = [{
  label: 'Wrap',
  href: 'https://unicornmeateth.com/#wrap'
}, {
  label: 'Grinder',
  href: '/grinder-association'
}, {
  label: 'Provenance',
  href: '/provenance'
}, {
  label: 'Paper',
  href: '/paper.pdf',
  target: '_blank'
}];
function Nav({
  connected,
  account,
  onConnect
}) {
  const [open, setOpen] = useState(false);
  const shownAddr = account || USER_SEED.addr;
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-in"
  }, /*#__PURE__*/React.createElement("a", {
    className: "brand",
    href: "https://unicornmeateth.com"
  }, /*#__PURE__*/React.createElement("img", {
    className: "logo-img",
    src: "/assets/images/home-two/unicornmeat-logo.webp",
    alt: ""
  }), " Unicorn Meat"), /*#__PURE__*/React.createElement("div", {
    className: "nav-links"
  }, NAV.map(n => /*#__PURE__*/React.createElement("a", {
    key: n.label,
    href: n.href,
    className: ((n.cta ? 'um-nav-cta ' : '') + (n.active ? 'um-nav-active' : '')).trim()
  }, n.label)), /*#__PURE__*/React.createElement("details", {
    className: "nav-more"
  }, /*#__PURE__*/React.createElement("summary", null, "More"), /*#__PURE__*/React.createElement("div", {
    className: "nav-more-menu"
  }, NAV_MORE.map(n => /*#__PURE__*/React.createElement("a", {
    key: n.label,
    href: n.href,
    target: n.target || null,
    rel: n.target ? 'noopener' : null
  }, n.label))))), /*#__PURE__*/React.createElement("div", {
    className: "nav-right"
  }, connected ? /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), trunc(shownAddr)) : /*#__PURE__*/React.createElement("button", {
    className: "btn connect-wallet-btn",
    onClick: onConnect
  }, "Connect Wallet"), /*#__PURE__*/React.createElement("button", {
    className: "gear hamb",
    onClick: () => setOpen(o => !o),
    style: {
      width: 38,
      height: 38
    }
  }, "\u2630"))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '6px 20px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderTop: '1px solid var(--gold-line)'
    }
  }, NAV.concat(NAV_MORE).map(n => /*#__PURE__*/React.createElement("a", {
    key: n.label,
    href: n.href,
    target: n.target || null,
    rel: n.target ? 'noopener' : null,
    style: n.cta ? {
      alignSelf: 'flex-start',
      margin: '2px 0',
      padding: '6px 14px',
      fontWeight: 700,
      color: '#B45309',
      textDecoration: 'none',
      border: '1.5px solid var(--gold)',
      borderRadius: 8
    } : {
      padding: '8px 4px',
      fontWeight: 700,
      color: n.active ? 'var(--gold-deep)' : 'var(--ink-2)',
      textDecoration: 'none'
    }
  }, n.label))));
}
function Toasts({
  toasts
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "toast-wrap"
  }, toasts.map(t => /*#__PURE__*/React.createElement("div", {
    className: "toast",
    key: t.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, t.ic), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t1"
  }, t.t1), /*#__PURE__*/React.createElement("div", {
    className: "t2"
  }, t.t2)))));
}
function App() {
  const liveMode = Boolean(window.CAULDRON && window.CAULDRON.isLive && window.CAULDRON.isLive());

  // In mock mode the page mounts already "connected" so reviewers see the full UI.
  // In live mode the user must click Connect to populate `account` and unlock stats reads.
  // We also pick up an existing wallet session if walletkit is already connected
  // from another page (steak.html shares the same singleton).
  const initialAccount = window.unicornMeatWalletKit && window.unicornMeatWalletKit.isConnected && window.unicornMeatWalletKit.account && window.unicornMeatWalletKit.account.address || null;
  const [connected, setConnected] = useState(!liveMode || Boolean(initialAccount));
  const [account, setAccount] = useState(initialAccount);

  // Subscribe to wallet changes from the site's walletkit (covers connects from
  // other pages, accountsChanged in MetaMask, and disconnects).
  useEffect(() => {
    if (!window.CAULDRON || !window.CAULDRON.onWalletChange) return;
    const unsub = window.CAULDRON.onWalletChange(addr => {
      setAccount(addr);
      setConnected(Boolean(addr) || !liveMode);
    });
    return () => unsub();
  }, [liveMode]);
  const [stats, setStats] = useState({
    // Lifetime volume on-chain mixes ETH (buys) and token (sells) units, so it is
    // ambiguous to show as a single ETH figure without an indexer. In live mode we leave
    // it null and the stats tab hides the stat rather than showing fake seed data (P2).
    volEth: liveMode ? null : USER_SEED.volEth,
    swaps: liveMode ? 0 : USER_SEED.swaps,
    daysSinceLastSwap: liveMode ? null : 0, // mock: "today"
    // Holder multiplier (bps; 10000 = 1x) and the w🍖 balance it derives from.
    holderBps: liveMode ? null : holderMultiplierBps(USER_SEED.holderTokens),
    holderTokens: liveMode ? null : USER_SEED.holderTokens
  });
  // Real wallet balances (live mode only); null keeps SwapCard's illustrative placeholder.
  const [balances, setBalances] = useState(null);
  // A round the connected user won whose auto-pay did not fully land (the fallback-claim case), or
  // null. On the normal path prizes are auto-paid at draw, so this stays null.
  const [claimable, setClaimable] = useState(null);
  const [claiming, setClaiming] = useState(false);
  // Bonus prizes queued for the current round (getQueuedPrizesForRound). They bundle into the ETH
  // pot atomically when that round draws, so together with the pot they ARE the prize.
  const [queued, setQueued] = useState(liveMode ? null : QUEUED_SEED);
  const [pot, setPot] = useState(liveMode ? {
    eth: 0,
    threshold: 0
  } : {
    eth: POT_SEED.eth,
    threshold: POT_SEED.threshold
  });
  // Drawable once the pot reaches the threshold.
  const [drawable, setDrawable] = useState(liveMode ? false : POT_SEED.eth >= POT_SEED.threshold);
  // Emergency pause: while paused, swaps revert (the contract also deploys paused). Mock = open.
  const [paused, setPaused] = useState(false);
  // Bypass toggle: ON routes through the Cauldron (fee + entries); OFF swaps directly on Uniswap V3.
  const [useCauldron, setUseCauldron] = useState(true);
  const [raffle, setRaffle] = useState(liveMode ? {
    roundId: 0,
    participants: 0,
    totalEntries: 0,
    userEntries: 0
  } : { ...RAFFLE_SEED });
  // Completed-round history for the "Past winners" panel (on-chain via getRoundResult).
  const [history, setHistory] = useState(liveMode ? [] : HISTORY_SEED);
  const [earned, setEarned] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [drawing, setDrawing] = useState(false);
  // Permissionless prize boost for the current round (getRoundBoost + PrizeBoosted events). A boost
  // tops up the round's prize without earning entries or moving the draw threshold, and works even
  // while paused.
  const [boostEth, setBoostEth] = useState(liveMode ? 0 : BOOST_SEED.roundEth);
  const [recentBoosts, setRecentBoosts] = useState(liveMode ? [] : BOOST_SEED.recent);
  const [boosting, setBoosting] = useState(false);
  // Lifetime-volume leaderboard, scanned from SwapTracked events client-side (no indexer).
  const [leaderboard, setLeaderboard] = useState(liveMode ? [] : LEADERBOARD_SEED);
  // Token symbol read from chain (never assumed). Defaults to the known w🍖 until the read lands.
  const [tokenSym, setTokenSym] = useState(TOKEN.symbol);
  // Live ETH/USD price (CoinGecko); falls back to the ETH_USD constant until the fetch lands. Drives
  // the swap card USD figures in both mock and live mode so they track the real market, not $3,000.
  const [ethUsd, setEthUsd] = useState(ETH_USD);

  // Every (Cauldron) swap earns entries, so the raffle accrues continuously while open. When paused,
  // swaps revert, so no entries accrue. When the bypass is off the user trades directly and earns none.
  const entriesLive = !paused && useCauldron;
  // The prize a winner takes is the current pot ETH, plus any permissionless boost for this round,
  // plus any bonus prizes queued for the next draw (all bundle in atomically at draw time).
  const prize = useMemo(() => ({
    ethFloat: pot.eth + (boostEth || 0),
    tokens: (queued && queued.tokens) || [],
    nfts: (queued && queued.nfts) || []
  }), [pot.eth, boostEth, queued]);

  useEffect(() => {
    const r = document.documentElement;
    const brew = CAULDRON_CONFIG.brew;
    r.style.setProperty('--brew', brew[0]);
    r.style.setProperty('--brew-2', brew[1]);
    r.style.setProperty('--brew-deep', brew[2] || brew[0]);
    r.style.setProperty('--display', `'${CAULDRON_CONFIG.displayFont}', system-ui, sans-serif`);
  }, []);

  // -------- LIVE: subscribe to chain reads + winner events --------
  async function refreshChainState(addr) {
    if (!liveMode) return;
    try {
      const [potState, raffleState] = await Promise.all([window.CAULDRON.readPotState(), window.CAULDRON.readRaffleState(addr)]);
      if (potState) {
        setPot({
          eth: potState.ethFloat,
          threshold: potState.thresholdFloat
        });
        setDrawable(Boolean(potState.drawable));
        setPaused(Boolean(potState.paused));
      }
      if (raffleState) {
        // On-chain weights are sqrt(wei) (~1e9 scale). Normalize to the same sqrt(ETH)*16
        // convention the swap preview uses so the counts are human-readable and consistent
        // with "This swap earns ~N entries" (P3). Odds are a ratio, so the shared scale
        // factor cancels and win odds are unchanged. Entries accrue continuously; the round
        // is always open until someone draws.
        setRaffle({
          roundId: raffleState.roundId,
          participants: raffleState.participants,
          totalEntries: Math.round(Number(raffleState.totalSqrtWeight) * ENTRY_DISPLAY_SCALE),
          userEntries: Math.round(Number(raffleState.userEntries) * ENTRY_DISPLAY_SCALE)
        });
        if (raffleState.roundBoostFloat != null) setBoostEth(raffleState.roundBoostFloat);
      }
      // Recent prize boosts for the current round (PrizeBoosted events) and the lifetime-volume
      // leaderboard (SwapTracked events). Both are client-side event scans, so they tolerate failure.
      try {
        const b = await window.CAULDRON.readRecentBoosts();
        if (b) setRecentBoosts(b);
      } catch (_e) {}
      try {
        const lb = await window.CAULDRON.readLeaderboard();
        if (lb && lb.length) setLeaderboard(lb);
      } catch (_e) {}
      // Bonus prizes queued for the next draw (independent of fill state).
      try {
        const q = await window.CAULDRON.readQueuedPrizes();
        if (q) {
          setQueued({
            tokens: q.tokens.map(t => ({ sym: t.sym || trunc(t.address), amount: compact(t.amount), glyph: '🎁' })),
            nfts: q.nfts.map(n => ({
              collection: n.collection || trunc(n.address),
              name: n.name || null,
              image: n.image || null,
              id: '#' + n.tokenId,
              address: n.address,
              tokenId: n.tokenId,
              glyph: '🖼️'
            }))
          });
        }
      } catch (_e) {}
      // Completed-round history for the Past winners panel (on-chain, no indexer).
      try {
        const h = await window.CAULDRON.readRoundHistory(8);
        if (h) setHistory(h);
      } catch (_e) {}
      if (addr) {
        const u = await window.CAULDRON.readUserStats(addr);
        if (u) {
          // lifetimeVolumeRaw mixes ETH (buys) and token (sells) in the contract; until an
          // indexer ships, surface swapCount + daysSinceLastSwap and keep volume hidden (P2,
          // volEth stays null). Never substitute the mock seed for a real account.
          setStats(s => ({
            ...s,
            swaps: u.swapCount,
            daysSinceLastSwap: u.daysSinceLastSwap,
            holderBps: u.holderMultiplierBps
          }));
        }
        // Real wallet balances for the swap card + insufficient-balance gating (P1).
        // Cheap (two reads), so it is fine to refresh on every poll.
        try {
          const b = await window.CAULDRON.readBalances(addr);
          if (b) {
            setBalances(b);
            setStats(s => ({ ...s, holderTokens: b.tokenFloat }));
          }
        } catch (_e) {}
      } else {
        setBalances(null);
      }
    } catch (e) {
      console.warn('Cauldron read failed', e);
    }
  }
  useEffect(() => {
    if (!liveMode) return;
    refreshChainState(account);
    const iv = setInterval(() => refreshChainState(account), 15000);
    return () => clearInterval(iv);
  }, [liveMode, account]);
  // Read the token's actual symbol from chain rather than assuming it; falls back to the known w🍖.
  useEffect(() => {
    if (!liveMode || !window.CAULDRON || !window.CAULDRON.readTokenMeta) return;
    let cancelled = false;
    window.CAULDRON.readTokenMeta().then(m => {
      if (!cancelled && m && m.symbol) setTokenSym(m.symbol);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [liveMode]);
  // Live ETH/USD price from CoinGecko (both modes). Fetch on mount and refresh every 2 minutes; on any
  // failure the ETH_USD fallback stays in place.
  useEffect(() => {
    if (!window.CAULDRON || !window.CAULDRON.readEthUsd) return;
    let cancelled = false;
    const load = () => window.CAULDRON.readEthUsd().then(p => {
      if (!cancelled && p) setEthUsd(p);
    }).catch(() => {});
    load();
    const iv = setInterval(load, 120000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);
  // Scan for a failed-auto-pay prize the user can still collect, once per account change. Kept out
  // of the 15s poll loop because it walks WinnerDrawn logs in chunked getLogs calls. Normally returns
  // null (prizes are auto-paid at draw); it is non-null only when an auto-pay leg failed to deliver.
  useEffect(() => {
    if (!liveMode || !account) {
      setClaimable(null);
      return;
    }
    let cancelled = false;
    window.CAULDRON.findClaimableForUser(account).then(c => {
      if (!cancelled) setClaimable(c);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [liveMode, account]);

  function pushToast(ic, t1, t2) {
    const id = Date.now() + Math.random();
    setToasts(a => [...a, {
      id,
      ic,
      t1,
      t2
    }]);
    setTimeout(() => setToasts(a => a.filter(x => x.id !== id)), 3800);
  }

  // Mock-mode swap handler: optimistic UI update without a real tx. Awaited by the swap
  // card, which keeps the button busy until this resolves (M2); the short delay preserves
  // the "Brewing your swap…" beat.
  async function handleMockSwap({
    ethVol,
    feeEth,
    output,
    side,
    willEarn
  }) {
    await new Promise(r => setTimeout(r, 950));
    setStats(s => ({
      ...s,
      volEth: s.volEth + ethVol,
      swaps: s.swaps + 1,
      daysSinceLastSwap: 0
    }));
    // A Cauldron swap grows the pot (no cap); reaching the threshold makes it drawable. A direct
    // bypass swap pays no fee, so the pot is untouched.
    if (useCauldron) {
      setPot(p => {
        const eth = p.eth + feeEth;
        if (eth >= p.threshold) setDrawable(true);
        return { ...p, eth };
      });
    }
    setFlashKey(k => k + 1);
    let newTotal = raffle.userEntries;
    if (entriesLive) {
      setRaffle(r => ({
        ...r,
        userEntries: r.userEntries + willEarn,
        totalEntries: r.totalEntries + willEarn
      }));
      newTotal = raffle.userEntries + willEarn;
      setEarned({
        entries: willEarn,
        total: newTotal,
        id: Date.now()
      });
    }
    const outStr = side === 'buy' ? `${commas(output, 0)} w🍖` : `${commas(output, 4)} ETH`;
    pushToast('🪄', 'Swap confirmed!', `You received ${outStr}${entriesLive ? `. +${commas(willEarn)} entries` : ''}`);
  }

  // Live-mode swap handler: submits a real Cauldron.swap() through the connected wallet,
  // then refreshes chain state so the UI reflects on-chain truth (not optimistic guesses).
  async function handleLiveSwap({
    amount,
    side,
    slippage,
    willEarn
  }) {
    if (!window.ethers) {
      pushToast('⚠️', 'Wallet library not loaded', 'Refresh the page and try again.');
      return;
    }
    try {
      const eth = window.ethers;
      // Build amountIn from the RAW amount the user typed (M3): buys are ETH (18 dp), sells
      // are w🍖 (token decimals). Parsing the raw string avoids the float round-trip that
      // produced values like "4209999.9999999995" and threw in parseUnits. Truncate to the
      // unit's decimals so an over-precise entry still parses.
      const amountInWei = side === 'buy' ? eth.utils.parseEther(truncDecimals(amount, 18)) : eth.utils.parseUnits(truncDecimals(amount, TOKEN.decimals), TOKEN.decimals);

      // C1: get a real expected-output quote from QuoterV2. The Cauldron path quotes a buy net of the
      // 0.3% fee; the direct bypass quotes the full input against the pool.
      const quotedOut = await window.CAULDRON.quote({
        side,
        amountInWei,
        useCauldron
      });
      if (!quotedOut) throw new Error('Could not fetch a price quote. Try again.');

      // H2: apply the user's selected slippage tolerance to the real quote to get minOut.
      const slipBps = Math.min(10000, Math.max(0, Math.round((slippage || 0.5) * 100)));
      const minOutWei = quotedOut.mul(10000 - slipBps).div(10000);

      if (useCauldron) {
        pushToast('🪄', 'Confirm in wallet…', 'Swap via The Cauldron');
        await window.CAULDRON.swap({ side, amountInWei, minOutWei });
      } else {
        pushToast('🪄', 'Confirm in wallet…', 'Direct swap on Uniswap V3');
        await window.CAULDRON.swapDirect({ side, amountInWei, minOutWei });
      }
      await refreshChainState(account);
      setFlashKey(k => k + 1);
      if (entriesLive) setEarned({
        entries: willEarn,
        total: raffle.userEntries + willEarn,
        id: Date.now()
      });
      const got = side === 'buy' ? 'w🍖 received in wallet' : (useCauldron ? 'ETH received in wallet' : 'WETH received in wallet');
      pushToast('✅', 'Swap confirmed!', got);
    } catch (e) {
      const msg = e && (e.shortMessage || e.message) || 'unknown';
      pushToast('⚠️', 'Swap failed', msg.slice(0, 80));
    }
  }
  const handleSwap = liveMode ? handleLiveSwap : handleMockSwap;

  // Draw the round. Available once the pot reaches the threshold; the winner is never picked
  // automatically. Anyone calls draw() to pick the sqrt-weighted winner, which commits the
  // pot + queued prizes and opens a fresh round.
  async function handleDraw() {
    if (drawing) return;
    setDrawing(true);
    try {
      if (liveMode) {
        pushToast('🪄', 'Confirm in wallet…', 'Drawing the winner');
        await window.CAULDRON.draw();
        pushToast('🎲', 'Winner drawn', 'The round has been drawn; a fresh one is open.');
        await refreshChainState(account);
        try {
          const c = await window.CAULDRON.findClaimableForUser(account);
          setClaimable(c);
        } catch (_e) {}
      } else {
        // Mock: simulate an auto-paid draw. The prize is pushed to the winner inside the draw, so no
        // claim panel appears on the normal path; the history row is marked auto-paid.
        await new Promise(r => setTimeout(r, 700));
        const winnerAddr = account || USER_SEED.addr;
        const roundId = raffle.roundId || 1;
        const raffleId = String(roundId);
        setHistory(rows => [{
          roundId,
          winner: winnerAddr,
          prizeEthFloat: pot.eth,
          participantCount: raffle.participants || 0,
          drawnAtBlock: 0,
          settled: true
        }, ...rows].slice(0, 8));
        // Open a fresh round with entries reset and the pot emptied.
        setRaffle(r => ({
          roundId: (r.roundId || 1) + 1,
          participants: 0,
          userEntries: 0,
          totalEntries: 0
        }));
        setPot(p => ({
          ...p,
          eth: 0
        }));
        setDrawable(false);
        pushToast('🎲', 'Winner drawn', `${trunc(winnerAddr)} won round #${raffleId} · prize auto-paid`);
      }
    } catch (e) {
      const msg = e && (e.shortMessage || e.message) || 'unknown';
      pushToast('⚠️', 'Draw failed', msg.slice(0, 80));
    } finally {
      setDrawing(false);
    }
  }

  // Fallback collect: deliver the still-owed legs of a round whose auto-pay did not fully land.
  async function handleClaim() {
    if (!claimable || claiming) return;
    setClaiming(true);
    try {
      if (liveMode) {
        pushToast('🪄', 'Confirm in wallet…', `Collecting raffle #${claimable.raffleId}`);
        await window.CAULDRON.claim(claimable.raffleId);
        pushToast('🏆', 'Prize collected!', `Raffle #${claimable.raffleId} paid out to your wallet.`);
        setClaimable(null);
        await refreshChainState(account);
      } else {
        await new Promise(r => setTimeout(r, 700));
        pushToast('🏆', 'Prize collected!', `Raffle #${claimable.raffleId} paid out (preview).`);
        setClaimable(null);
      }
    } catch (e) {
      const msg = e && (e.shortMessage || e.message) || 'unknown';
      pushToast('⚠️', 'Claim failed', msg.slice(0, 80));
    } finally {
      setClaiming(false);
    }
  }
  // Boost the current round's prize. Sends ETH to boostPrize(), which tops up the round prize without
  // earning entries or moving the draw threshold. Works even while paused.
  async function handleBoost(amountEth) {
    if (boosting || !amountEth || amountEth <= 0) return;
    setBoosting(true);
    try {
      if (liveMode) {
        if (!window.ethers) throw new Error('Wallet library not loaded.');
        const amountWei = window.ethers.utils.parseEther(truncDecimals(String(amountEth), 18));
        pushToast('🔥', 'Confirm in wallet…', `Boosting the prize by ${fmtEth(amountEth)} ETH`);
        await window.CAULDRON.boostPrize(amountWei);
        pushToast('🔥', 'Prize boosted!', `+${fmtEth(amountEth)} ETH added to round #${raffle.roundId || ''} prize.`);
        await refreshChainState(account);
      } else {
        await new Promise(r => setTimeout(r, 700));
        setBoostEth(b => b + amountEth);
        setRecentBoosts(rows => [{
          booster: account || USER_SEED.addr,
          amountEth
        }, ...rows].slice(0, 5));
        pushToast('🔥', 'Prize boosted!', `+${fmtEth(amountEth)} ETH added to the prize (preview).`);
      }
    } catch (e) {
      const msg = e && (e.shortMessage || e.message) || 'unknown';
      pushToast('⚠️', 'Boost failed', msg.slice(0, 80));
    } finally {
      setBoosting(false);
    }
  }
  async function handleConnect() {
    // Always route through the site's walletkit (Reown/WalletConnect) so the
    // cauldron page uses the same wallet picker, session, and UX as the rest
    // of unicornmeateth.com. Falls back gracefully if walletkit isn't loaded.
    try {
      const addr = await window.CAULDRON.connectViaWalletKit();
      if (addr) {
        setAccount(addr);
        setConnected(true);
        pushToast('🦄', 'Wallet connected', trunc(addr));
      } else if (!liveMode) {
        // Mock mode + no walletkit: still flip the connect state for the UI.
        setConnected(true);
        pushToast('🦄', 'Wallet connected', trunc(USER_SEED.addr));
      }
    } catch (e) {
      pushToast('⚠️', 'Could not connect', e && (e.shortMessage || e.message) || 'no wallet found');
    }
  }
  return React.createElement(React.Fragment, null,
    React.createElement(Nav, { connected: connected, account: account, onConnect: handleConnect }),
    React.createElement("div", { className: "shell" },
      React.createElement("header", { className: "hero" },
        React.createElement("div", { className: "eyebrow" }, "unicornmeateth.com"),
        React.createElement("h1", null, "Unicorn ", React.createElement("span", { className: "glow" }, "Meat"), " 🦄🍖"),
        React.createElement("p", { className: "hero-sub" }, "Swap w🍖, a 2016 Ethereum Foundation token by avsa."),
        React.createElement("div", { style: { marginTop: 6, textAlign: 'center' } }, React.createElement("a", { href: "/provenance", style: { color: 'var(--gold-deep)', fontWeight: 800, textDecoration: 'underline', fontSize: 15 } }, "Read the story.")),
        !liveMode && React.createElement("p", { style: { marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--brew-deep)' } }, "🧪 Preview mode · contract not yet deployed · all numbers are illustrative"),
        paused && React.createElement("div", { className: "pause-banner" }, React.createElement("strong", null, "⏸️ The Cauldron is not yet active."), " Swaps are disabled until the owner unpauses. You can still boost the prize to seed the launch round.")
      ),
      React.createElement("div", { className: "layout" },
        React.createElement("div", { className: "swap-col" },
          React.createElement(SwapCard, { connected: connected, raffleActive: entriesLive, earned: earned, intensity: CAULDRON_CONFIG.intensity, onSwap: handleSwap, onConnect: handleConnect, liveMode: liveMode, balances: balances, useCauldron: useCauldron, onToggleCauldron: setUseCauldron, paused: paused, tokenSym: tokenSym, ethUsd: ethUsd }),
          React.createElement(ClaimPrize, { claimable: claimable, busy: claiming, onClaim: handleClaim })
        ),
        React.createElement("div", { className: "round-col" },
          React.createElement(RoundStatus, { raffle: raffle, pot: pot, boostEth: boostEth, prize: prize, drawable: drawable, onDraw: handleDraw, drawing: drawing, paused: paused, raffleLive: entriesLive })
        ),
        React.createElement(HowItWorks, null),
        React.createElement(SecondaryTabs, { stats: stats, flashKey: flashKey, leaderboard: leaderboard, history: history, account: account, ethUsd: ethUsd, boost: { roundId: raffle.roundId, boostEth: boostEth, recent: recentBoosts, onBoost: handleBoost, busy: boosting, connected: connected, onConnect: handleConnect, paused: paused } })
      ),
      React.createElement("div", { className: "foot" },
        "🍖 Routes through Uniswap V3 · ", tokenSym, " token ", React.createElement("span", { className: "mono" }, trunc(TOKEN.address)),
        " · ",
        React.createElement("a", {
          className: "foot-link",
          href: "https://etherscan.io/address/0x8Bd3c60B270eF1e4c5c10fb6f5e4BFAba52c5eBf",
          target: "_blank",
          rel: "noopener noreferrer"
        }, "Verified Contract: ", React.createElement("span", { className: "mono" }, "0x8Bd3…eBf"))
      )
    ),
    React.createElement(Toasts, { toasts: toasts })
  );
}

// Defer the first render until the ABI has loaded, so liveMode is decided correctly: isLive() needs
// the ABI in hand. If a deployed address is set but the ABI fetch has not resolved at mount, the page
// would otherwise lock into mock mode. abiReady resolves even if the fetch fails (then mock mode is
// correct). Falls back to an immediate mount if the bridge is unavailable.
function mountCauldron() {
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
}
if (window.CAULDRON && window.CAULDRON.abiReady && typeof window.CAULDRON.abiReady.then === 'function') {
  window.CAULDRON.abiReady.then(mountCauldron, mountCauldron);
} else {
  mountCauldron();
}
