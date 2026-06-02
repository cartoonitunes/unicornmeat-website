// panels.jsx - presentational panels for The Cauldron (stats, raffle standing, recent winners, pot, raffle)

// ---------- Your Stats ----------
function StatsPanel({
  stats,
  flashKey
}) {
  const daysSince = stats.daysSinceLastSwap;
  const sinceLabel = daysSince == null ? 'never' : daysSince === 0 ? 'today' : daysSince === 1 ? '1d ago' : `${daysSince}d ago`;
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "\uD83D\uDCCA"), /*#__PURE__*/React.createElement("h3", null, "Your Stats"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pill",
    style: {
      fontSize: 12
    }
  }, "last: ", sinceLabel)), /*#__PURE__*/React.createElement("div", {
    className: "stat-grid"
  }, stats.volEth != null && /*#__PURE__*/React.createElement("div", {
    className: "stat",
    key: 'v' + flashKey
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Lifetime Volume"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, fmtEth(stats.volEth), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--muted)'
    }
  }, "ETH")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, fmtUsd(stats.volEth * ETH_USD))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    key: 's' + flashKey
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Total Swaps"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, commas(stats.swaps)), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "via The Cauldron"))));
}

// ---------- Your Raffle Standing ----------
// Trimmed to the two fields the contract directly exposes for the current round:
// roundEntries = getEntries(currentRound, user); odds = roundEntries / totalSqrtWeight.
// Lifetime wins / all-time entries / best win require an event indexer, so they are
// intentionally absent until one ships.
function RaffleStanding({
  raffleLive,
  roundEntries,
  totalEntries
}) {
  const odds = raffleLive && totalEntries ? roundEntries / totalEntries * 100 : 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "\uD83C\uDF9F\uFE0F"), /*#__PURE__*/React.createElement("h3", null, "Raffle Standing"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pill",
    style: {
      fontSize: 12,
      color: raffleLive ? 'var(--brew-deep)' : 'var(--muted)',
      borderColor: raffleLive ? 'var(--brew)' : 'var(--gold-line)'
    }
  }, raffleLive ? '● Live' : '○ Idle')), /*#__PURE__*/React.createElement("div", {
    className: "stat-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat",
    style: {
      borderColor: 'rgba(139,92,246,.3)',
      background: 'rgba(139,92,246,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "This Round"), /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      color: raffleLive ? 'var(--brew-deep)' : 'var(--muted)'
    }
  }, raffleLive ? commas(roundEntries) : '0'), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, raffleLive ? 'entries' : 'no raffle running')), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Win Odds"), /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      color: raffleLive ? 'var(--brew-deep)' : 'var(--muted)'
    }
  }, raffleLive ? `${odds.toFixed(odds < 10 ? 2 : 1)}%` : '·'), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "your share of total entries"))));
}

// ---------- Holder Bonus ----------
// The connected user's current holder multiplier (10000 bps = 1x, capped at 2x) plus a reference
// scale computed from the same formula the contract uses (data.HOLDER_SCALE).
function HolderBonus({
  holderBps,
  holderTokens
}) {
  const bps = holderBps == null ? 10000 : holderBps;
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "✨"), /*#__PURE__*/React.createElement("h3", null, "Holder Bonus"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pill",
    style: {
      fontSize: 13,
      color: 'var(--brew-deep)',
      borderColor: 'var(--brew)'
    }
  }, fmtMult(bps), " weight")), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 1.5
    }
  }, "Hold w🍖 for bonus raffle weight. Positions from ~10k tokens up earn a multiplier that scales with your stake, capped at 2x around 5M tokens (~5% of supply). Read from your live balance at the draw."), holderTokens != null && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontWeight: 800,
      fontSize: 13.5
    }
  }, "You hold ", compact(holderTokens), " w🍖 ", /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "(", fmtMult(bps), " weight)")), /*#__PURE__*/React.createElement("div", {
    className: "holder-scale"
  }, HOLDER_SCALE.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "hs-row",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "hs-amt"
  }, compact(s.tokens), " w🍖"), /*#__PURE__*/React.createElement("span", {
    className: "hs-mult"
  }, fmtMult(s.mult))))));
}

// ---------- How it works ----------
// A compact run-through of the full Cauldron mechanic: fee, entries, holder bonus, auto-draw, claim.
function HowItWorks() {
  const steps = [
    ["💧", "0.3% fee", "Every swap skims 0.3% of the ETH side into the prize pot, on top of the Uniswap pool fee."],
    ["🎟️", "Entries", "That same swap earns sqrt-weighted entries: a buy earns full, a sell earns half."],
    ["✨", "Holder bonus", "Holding w🍖 multiplies your entries up to 2x, read from your live balance at the draw."],
    ["🎲", "Auto-draw", "When the pot reaches the threshold, the next swap draws a winner automatically."],
    ["🏆", "Claim", "The winner claims the ETH pot plus any bundled token and NFT prizes."]
  ];
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "📜"), /*#__PURE__*/React.createElement("h3", null, "How it works")), /*#__PURE__*/React.createElement("div", {
    className: "how-list"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "how-row",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "how-ic"
  }, s[0]), /*#__PURE__*/React.createElement("div", {
    className: "how-txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "how-t"
  }, s[1]), /*#__PURE__*/React.createElement("div", {
    className: "how-d"
  }, s[2]))))));
}

// ---------- Past Winners / round history ----------
// Reads completed rounds straight from the contract (getRoundResult / completedRounds), so it works
// with nothing more than an RPC endpoint: round number, winner, prize ETH, participant count.
function RoundHistory({
  rows,
  userAddress
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "\uD83C\uDFC6"), /*#__PURE__*/React.createElement("h3", null, "Past Winners"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "muted mono",
    style: {
      fontSize: 11.5,
      fontWeight: 700
    }
  }, "round history")), rows && rows.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "lb"
  }, rows.map((r, i) => {
    const you = userAddress && r.winner && r.winner.toLowerCase() === userAddress.toLowerCase();
    return /*#__PURE__*/React.createElement("div", {
      className: 'lb-row' + (you ? ' you' : ''),
      key: r.roundId + ':' + i
    }, /*#__PURE__*/React.createElement("div", {
      className: "rk"
    }, ['🥇', '🥈', '🥉', '🎟️', '🎟️'][Math.min(i, 4)]), /*#__PURE__*/React.createElement("div", {
      className: "who",
      style: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "a"
    }, you ? 'You · ' : '', trunc(r.winner)), /*#__PURE__*/React.createElement("span", {
      className: "muted mono",
      style: {
        fontSize: 10.5,
        fontWeight: 700
      }
    }, "round #", r.roundId, r.participantCount ? ' · ' + commas(r.participantCount) + ' in' : '')), /*#__PURE__*/React.createElement("div", {
      className: "vol"
    }, fmtEth(r.prizeEthFloat), " ", /*#__PURE__*/React.createElement("span", {
      className: "muted"
    }, "ETH")));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13,
      fontWeight: 700,
      textAlign: 'center',
      padding: '14px 6px',
      lineHeight: 1.5
    }
  }, "No rounds drawn yet. Winners appear here once the pot fills and a winner is drawn."));
}

// ---------- Cauldron Pot indicator ----------
function CauldronPot({
  eth,
  threshold,
  intensity,
  queued
}) {
  const queuedTokens = queued && queued.tokens || [];
  const queuedNfts = queued && queued.nfts || [];
  const hasQueued = queuedTokens.length > 0 || queuedNfts.length > 0;
  const pct = Math.max(0, Math.min(1, eth / threshold));
  // Heat status tracks the actual fill: only "Boiled over" once the threshold is met.
  const heat = pct >= 1 ? 'Boiled over' : pct >= 0.9 ? 'Almost boiling' : pct >= 0.5 ? 'Heating up' : 'Simmering';
  const fillH = 8 + pct * 92; // % of bowl height
  const bubbles = intensity === 'minimal' ? [] : [{
    l: '24%',
    s: 7,
    d: 2.4,
    delay: 0
  }, {
    l: '46%',
    s: 10,
    d: 3.1,
    delay: .6
  }, {
    l: '63%',
    s: 6,
    d: 2.0,
    delay: 1.2
  }, {
    l: '78%',
    s: 8,
    d: 2.8,
    delay: .3
  }, {
    l: '37%',
    s: 5,
    d: 2.2,
    delay: 1.6
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "\uD83C\uDF72"), /*#__PURE__*/React.createElement("h3", null, "The Cauldron"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "muted mono",
    style: {
      fontSize: 11.5,
      fontWeight: 700
    }
  }, heat, " \xB7 ", Math.round(pct * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "pot-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pot-rim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pot-bowl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brew-fill",
    style: {
      height: fillH + '%'
    }
  }, bubbles.map((b, i) => /*#__PURE__*/React.createElement("span", {
    className: "bubble",
    key: i,
    style: {
      left: b.l,
      width: b.s,
      height: b.s,
      animationDuration: b.d + 's',
      animationDelay: b.delay + 's'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "pot-legs"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))), /*#__PURE__*/React.createElement("div", {
    className: "pot-pct"
  }, fmtEth(eth), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      color: 'var(--muted)'
    }
  }, "/ ", threshold, " ETH")), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 1.4
    }
  }, pct >= 1 ? '🔥 Pot is full. The next swap draws a winner automatically.' : 'Each swap adds a 0.3% fee, on top of the Uniswap pool fee, to the pot and earns raffle entries. When the pot fills, a winner is drawn automatically.'), hasQueued && /*#__PURE__*/React.createElement("div", {
    className: "queued"
  }, /*#__PURE__*/React.createElement("div", {
    className: "queued-eyebrow"
  }, "Bonus prizes for the next draw"), /*#__PURE__*/React.createElement("div", {
    className: "q-grid"
  }, queuedTokens.map((t, i) => /*#__PURE__*/React.createElement("span", {
    className: "q-chip",
    key: 'qt' + i
  }, /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, t.glyph || '🎁'), t.amount, " ", t.sym)), queuedNfts.map((n, i) => /*#__PURE__*/React.createElement("span", {
    className: "q-chip nft",
    key: 'qn' + i
  }, /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, n.glyph || '🖼️'), n.collection, " ", n.id))))));
}

// ---------- Prize showcase (renders inside the raffle banner) ----------
// A prize is always the ETH pot, optionally bundled with ERC-20 tokens and NFTs. `prize`
// is { ethFloat, tokens: [{sym, amount, glyph}], nfts: [{collection, id, glyph}] }. Empty
// token/NFT arrays render the ETH-only case; this single path covers all three
// compositions (ETH only, ETH + tokens, ETH + tokens + NFTs).
function PrizeShow({
  prize
}) {
  if (!prize) return null;
  const tokens = prize.tokens || [];
  const nfts = prize.nfts || [];
  const hasExtras = tokens.length > 0 || nfts.length > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "prize-show"
  }, /*#__PURE__*/React.createElement("div", {
    className: "prize-eyebrow"
  }, "Prize Pot"), /*#__PURE__*/React.createElement("div", {
    className: "prize-eth"
  }, /*#__PURE__*/React.createElement("span", {
    className: "coin-stack"
  }, "\uD83E\uDE99"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "prize-title"
  }, fmtEth(prize.ethFloat), " ETH"), /*#__PURE__*/React.createElement("div", {
    className: "prize-sub"
  }, hasExtras ? 'plus bundled prizes' : 'Winner takes the ETH pot'))), hasExtras && /*#__PURE__*/React.createElement("div", {
    className: "pack-grid"
  }, tokens.map((t, i) => /*#__PURE__*/React.createElement("span", {
    className: "tok-chip",
    key: 't' + i
  }, /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, t.glyph || '\uD83C\uDF81'), t.amount, " ", t.sym)), nfts.map((n, i) => /*#__PURE__*/React.createElement("span", {
    className: "tok-chip nft",
    key: 'n' + i
  }, /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, n.glyph || '\uD83D\uDDBC\uFE0F'), n.collection, " ", n.id))));
}

// ---------- Active Raffle Banner ----------
// There is no time window: entries accrue on every swap and the round stays open until
// someone draws. `drawable` is true once the pot has reached the threshold; the winner is
// never picked automatically, so in that state anyone can press Draw winner to settle it
// on-chain (committing the pot + queued prizes and opening a fresh round).
function RaffleBanner({
  raffle,
  prize,
  drawable,
  onDraw,
  drawing
}) {
  const odds = raffle.totalEntries ? raffle.userEntries / raffle.totalEntries * 100 : 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "raffle"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sparkle",
    style: {
      top: 14,
      right: 34,
      fontSize: 18
    }
  }, "\u2728"), /*#__PURE__*/React.createElement("span", {
    className: "sparkle",
    style: {
      top: 52,
      right: 90,
      fontSize: 13,
      animationDelay: '.8s'
    }
  }, "\uD83C\uDF1F"), /*#__PURE__*/React.createElement("span", {
    className: "sparkle",
    style: {
      bottom: 22,
      right: 18,
      fontSize: 15,
      animationDelay: '1.4s'
    }
  }, "\u2728"), /*#__PURE__*/React.createElement("div", {
    className: "raffle-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: drawable ? "live ended" : "live"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), drawable ? "Pot full" : "Raffle live"), /*#__PURE__*/React.createElement("span", {
    className: "raffle-title"
  }, drawable ? "Winner draws automatically" : "Swap to earn entries"), /*#__PURE__*/React.createElement("span", {
    className: "odds-chip"
  }, "Your odds: ", odds.toFixed(odds < 10 ? 2 : 1), "%")), /*#__PURE__*/React.createElement("div", {
    className: "raffle-body"
  }, /*#__PURE__*/React.createElement(PrizeShow, {
    prize: prize
  }), /*#__PURE__*/React.createElement("div", {
    className: "raffle-stats"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rk"
  }, "Participants"), /*#__PURE__*/React.createElement("div", {
    className: "rv"
  }, commas(raffle.participants))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rk"
  }, "Your Entries"), /*#__PURE__*/React.createElement("div", {
    className: "rv gold"
  }, commas(raffle.userEntries))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rk"
  }, "Total Entries"), /*#__PURE__*/React.createElement("div", {
    className: "rv sm"
  }, commas(raffle.totalEntries)))), drawable ? /*#__PURE__*/React.createElement("div", {
    className: "raffle-draw"
  }, /*#__PURE__*/React.createElement("span", {
    className: "raffle-draw-note"
  }, "The pot is full. The next swap draws a winner automatically. You can also draw it now."), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onDraw,
    disabled: drawing,
    style: drawing ? {
      opacity: .6,
      cursor: 'not-allowed'
    } : {}
  }, drawing ? 'Drawing…' : 'Draw now')) : /*#__PURE__*/React.createElement("div", {
    className: "raffle-foot"
  }, /*#__PURE__*/React.createElement("span", null, "Entries accruing"), /*#__PURE__*/React.createElement("span", null, "A winner draws automatically when the pot fills"))));
}
// ---------- Claim prize (P6) ----------
// Shown only when the connected account is the winner of a settled, unclaimed raffle.
// `claimable` is { raffleId, prizeEthFloat } from contract.findClaimableForUser, or null.
function ClaimPrize({
  claimable,
  busy,
  onClaim
}) {
  if (!claimable) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'var(--brew)',
      boxShadow: 'var(--shadow-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "🏆"), /*#__PURE__*/React.createElement("h3", null, "You won!")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: 'var(--ink-2)',
      lineHeight: 1.5,
      marginBottom: 14
    }
  }, "You're the winner of raffle ", /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontWeight: 800
    }
  }, "#", claimable.raffleId), ". Claim ", /*#__PURE__*/React.createElement("strong", null, fmtEth(claimable.prizeEthFloat), " ETH"), " plus any bundled token and NFT prizes."), /*#__PURE__*/React.createElement("button", {
    className: "btn cta big brew",
    onClick: onClaim,
    disabled: busy,
    style: busy ? {
      opacity: .6,
      cursor: 'not-allowed'
    } : {}
  }, busy ? '🪄 Claiming…' : 'Claim prize 🎉'));
}
Object.assign(window, {
  StatsPanel,
  RaffleStanding,
  HolderBonus,
  HowItWorks,
  RoundHistory,
  CauldronPot,
  RaffleBanner,
  PrizeShow,
  ClaimPrize
});
