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
const NAV = [{
  label: 'About',
  href: 'https://unicornmeateth.com/#about'
}, {
  label: 'Buy 🍖',
  href: 'https://unicornmeateth.com/#trading'
}, {
  label: 'Wrap 🦄🍖',
  href: 'https://unicornmeateth.com/#wrap'
}, {
  label: '🦄 Herd',
  href: 'https://unicornmeateth.com/#join-herd'
}, {
  label: '🦄🍖 Grinder',
  href: 'https://unicornmeateth.com/grinder-association'
}, {
  label: '🍲 Swap',
  href: '/swap',
  active: true
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
    className: n.active ? 'active' : ''
  }, n.label))), /*#__PURE__*/React.createElement("div", {
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
  }, NAV.map(n => /*#__PURE__*/React.createElement("a", {
    key: n.label,
    href: n.href,
    style: {
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
    // it null and StatsPanel hides the stat rather than showing fake seed data (P2).
    volEth: liveMode ? null : USER_SEED.volEth,
    swaps: USER_SEED.swaps,
    daysSinceLastSwap: 0, // mock: "today"
    // Holder multiplier (bps; 10000 = 1x) and the w🍖 balance it derives from.
    holderBps: liveMode ? null : holderMultiplierBps(USER_SEED.holderTokens),
    holderTokens: liveMode ? null : USER_SEED.holderTokens
  });
  // Real wallet balances (live mode only); null keeps SwapCard's illustrative placeholder.
  const [balances, setBalances] = useState(null);
  // Settled-but-unclaimed raffle the connected user won, or null (P6).
  const [claimable, setClaimable] = useState(null);
  const [claiming, setClaiming] = useState(false);
  // Bonus prizes queued for the next draw (getQueuedPrizeTokens / NFTs). They bundle into the
  // ETH pot atomically when someone draws, so together with the pot they ARE the prize.
  const [queued, setQueued] = useState(liveMode ? null : QUEUED_SEED);
  const [pot, setPot] = useState({
    eth: POT_SEED.eth,
    threshold: POT_SEED.threshold
  });
  // Drawable once the pot reaches the threshold (and the Cauldron is not retired).
  const [drawable, setDrawable] = useState(liveMode ? false : POT_SEED.eth >= POT_SEED.threshold);
  const [retired, setRetired] = useState(false);
  const [raffle, setRaffle] = useState({ ...RAFFLE_SEED });
  // Completed-round history for the "Past winners" panel (on-chain via getRoundResult).
  const [history, setHistory] = useState(liveMode ? [] : HISTORY_SEED);
  const [earned, setEarned] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [drawing, setDrawing] = useState(false);

  // There is no time window. Every swap earns entries, so the raffle is always accruing
  // (unless retired); the pot reaching the threshold is what enables draw(), not entry.
  const entriesLive = !retired;
  // The prize a winner takes is the current pot ETH plus any bonus prizes queued for the
  // next draw (they bundle in atomically at draw time).
  const prize = useMemo(() => ({
    ethFloat: pot.eth,
    tokens: (queued && queued.tokens) || [],
    nfts: (queued && queued.nfts) || []
  }), [pot.eth, queued]);

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
        setRetired(Boolean(potState.retired));
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
      }
      // Bonus prizes queued for the next draw (independent of fill state).
      try {
        const q = await window.CAULDRON.readQueuedPrizes();
        if (q) {
          setQueued({
            tokens: q.tokens.map(t => ({ sym: t.sym || trunc(t.address), amount: compact(t.amount), glyph: '🎁' })),
            nfts: q.nfts.map(n => ({ collection: trunc(n.address), id: '#' + n.tokenId, glyph: '🖼️' }))
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
  // Scan for an unclaimed prize once per account change (P6). Kept out of the 15s poll
  // loop because it walks WinnerDrawn logs in chunked getLogs calls.
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
    // The pot grows past the threshold (no cap); reaching it makes the raffle drawable.
    setPot(p => {
      const eth = p.eth + feeEth;
      if (eth >= p.threshold) setDrawable(true);
      return { ...p, eth };
    });
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

      // C1: get a real expected-output quote from QuoterV2 (buys quote net of the Cauldron
      // fee; sells quote the gross WETH out the router enforces amountOutMinimum against).
      const quotedOut = await window.CAULDRON.quote({
        side,
        amountInWei
      });
      if (!quotedOut) throw new Error('Could not fetch a price quote. Try again.');

      // H2: apply the user's selected slippage tolerance to the real quote to get minOut.
      const slipBps = Math.min(10000, Math.max(0, Math.round((slippage || 0.5) * 100)));
      const minOutWei = quotedOut.mul(10000 - slipBps).div(10000);

      pushToast('🪄', 'Confirm in wallet…', `Swap via The Cauldron`);
      await window.CAULDRON.swap({
        side,
        amountInWei,
        minOutWei
      });
      await refreshChainState(account);
      setFlashKey(k => k + 1);
      if (entriesLive) setEarned({
        entries: willEarn,
        total: raffle.userEntries + willEarn,
        id: Date.now()
      });
      pushToast('✅', 'Swap confirmed!', side === 'buy' ? 'w🍖 received in wallet' : 'ETH received in wallet');
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
        // Mock: pick the connected demo account as winner so the claim flow is reviewable.
        await new Promise(r => setTimeout(r, 700));
        const winnerAddr = account || USER_SEED.addr;
        const roundId = raffle.roundId || 1;
        const raffleId = String(roundId);
        setHistory(rows => [{
          roundId,
          winner: winnerAddr,
          prizeEthFloat: pot.eth,
          participantCount: raffle.participants || 0,
          drawnAtBlock: 0
        }, ...rows].slice(0, 8));
        setClaimable({
          raffleId,
          prizeEthFloat: pot.eth
        });
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
        pushToast('🎲', 'Winner drawn', `${trunc(winnerAddr)} won round #${raffleId}`);
      }
    } catch (e) {
      const msg = e && (e.shortMessage || e.message) || 'unknown';
      pushToast('⚠️', 'Draw failed', msg.slice(0, 80));
    } finally {
      setDrawing(false);
    }
  }

  // Claim a settled raffle prize the connected account won (P6).
  async function handleClaim() {
    if (!claimable || claiming) return;
    setClaiming(true);
    try {
      if (liveMode) {
        pushToast('🪄', 'Confirm in wallet…', `Claiming raffle #${claimable.raffleId}`);
        await window.CAULDRON.claim(claimable.raffleId);
        pushToast('🏆', 'Prize claimed!', `Raffle #${claimable.raffleId} paid out to your wallet.`);
        setClaimable(null);
        await refreshChainState(account);
      } else {
        await new Promise(r => setTimeout(r, 700));
        pushToast('🏆', 'Prize claimed!', `Raffle #${claimable.raffleId} paid out (preview).`);
        setClaimable(null);
      }
    } catch (e) {
      const msg = e && (e.shortMessage || e.message) || 'unknown';
      pushToast('⚠️', 'Claim failed', msg.slice(0, 80));
    } finally {
      setClaiming(false);
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, {
    connected: connected,
    account: account,
    onConnect: handleConnect
  }), /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("header", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "unicornmeateth.com"), /*#__PURE__*/React.createElement("h1", null, "Unicorn ", /*#__PURE__*/React.createElement("span", {
    className: "glow"
  }, "Meat"), " \uD83E\uDD84\uD83C\uDF56"), /*#__PURE__*/React.createElement("p", null, "Unicorn Meat (w\uD83C\uDF56) is a wrapped ERC-20 token created in 2016 by Alex Van de Sande (avsa) of the Ethereum Foundation. Deployed as an April Fools experiment, its Meat Grinder code later became the template for The DAO refund proposal. Ownership is renounced; no more can ever be created. ", /*#__PURE__*/React.createElement("a", {
    href: "https://unicornmeateth.com/provenance",
    style: {
      color: 'var(--gold-deep)',
      fontWeight: 800,
      textDecoration: 'underline'
    }
  }, "Read the full story.")), /*#__PURE__*/React.createElement("p", {
    className: "hero-sub"
  }, "The Cauldron is the official swap interface for w\uD83C\uDF56. Every trade earns raffle entries. Hold w\uD83C\uDF56 for bonus weight. When the pot fills, a winner is drawn automatically."), !liveMode && /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--brew-deep)'
    }
  }, "\uD83E\uDDEA Preview mode \xB7 contract not yet deployed \xB7 all numbers are illustrative")), entriesLive && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(RaffleBanner, {
    raffle: raffle,
    prize: prize,
    drawable: drawable,
    onDraw: handleDraw,
    drawing: drawing
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement(StatsPanel, {
    stats: stats,
    flashKey: flashKey
  }), /*#__PURE__*/React.createElement(HolderBonus, {
    holderBps: stats.holderBps,
    holderTokens: stats.holderTokens
  }), /*#__PURE__*/React.createElement(RaffleStanding, {
    raffleLive: entriesLive,
    roundEntries: raffle.userEntries,
    totalEntries: raffle.totalEntries
  })), /*#__PURE__*/React.createElement("div", {
    className: "col col-center"
  }, /*#__PURE__*/React.createElement(SwapCard, {
    connected: connected,
    raffleActive: entriesLive,
    earned: earned,
    intensity: CAULDRON_CONFIG.intensity,
    onSwap: handleSwap,
    onConnect: handleConnect,
    liveMode: liveMode,
    balances: balances
  }), /*#__PURE__*/React.createElement(ClaimPrize, {
    claimable: claimable,
    busy: claiming,
    onClaim: handleClaim
  }), /*#__PURE__*/React.createElement(HowItWorks, null)), /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement(CauldronPot, {
    eth: pot.eth,
    threshold: pot.threshold,
    intensity: CAULDRON_CONFIG.intensity,
    queued: queued
  }), /*#__PURE__*/React.createElement(RoundHistory, {
    rows: history,
    userAddress: account
  }))), /*#__PURE__*/React.createElement("div", {
    className: "foot"
  }, "\uD83C\uDF56 Routes through Uniswap V3 \xB7 w🍖 token ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, trunc(TOKEN.address)))), /*#__PURE__*/React.createElement(Toasts, {
    toasts: toasts
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
