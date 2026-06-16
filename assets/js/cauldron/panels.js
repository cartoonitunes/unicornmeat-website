// panels.jsx - presentational panels for The Cauldron.
//
// Layout is three zones: the hero, the primary swap+round row, and one tabbed secondary card.
// RoundStatus folds the old raffle banner + pot indicator into a single compact card; the secondary
// panels (stats, leaderboard, past winners, boost) live as tabs in SecondaryTabs.

// ---------- Token glyphs (real logos, not emoji) ----------
// ETH renders the standard Ethereum diamond as inline SVG; w🍖 uses the site's token logo image.
// Any other asset shows its symbol text (see the chip renderers below), never a placeholder emoji.
function TokenGlyph({
  kind,
  size = 26
}) {
  if (kind === 'eth') {
    return /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 256 417",
      xmlns: "http://www.w3.org/2000/svg",
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("polygon", {
      fill: "#343434",
      points: "127.9611,0.0367 125.1661,9.5 125.1661,285.168 127.9611,287.958 255.9231,212.32"
    }), /*#__PURE__*/React.createElement("polygon", {
      fill: "#8C8C8C",
      points: "127.962,0.0367 0,212.32 127.962,287.959 127.962,154.158"
    }), /*#__PURE__*/React.createElement("polygon", {
      fill: "#3C3C3B",
      points: "127.9611,312.1866 126.3861,314.1066 126.3861,412.3056 127.9611,416.9066 255.9991,236.5866"
    }), /*#__PURE__*/React.createElement("polygon", {
      fill: "#8C8C8C",
      points: "127.962,416.9052 127.962,312.1852 0,236.5852"
    }), /*#__PURE__*/React.createElement("polygon", {
      fill: "#141414",
      points: "127.9611,287.9577 255.9211,212.3207 127.9611,154.1587"
    }), /*#__PURE__*/React.createElement("polygon", {
      fill: "#393939",
      points: "0.0009,212.3208 127.9609,287.9578 127.9609,154.1588"
    }));
  }
  return /*#__PURE__*/React.createElement("img", {
    src: "/assets/images/home-two/unicornmeat-logo.webp",
    width: size,
    height: size,
    alt: "w🍖",
    style: {
      display: 'block',
      objectFit: 'contain'
    }
  });
}

// ---------- NFT prize showcase ----------
// A bundled NFT prize, shown prominently so a visitor sees what they can actually win — the card
// image, the collection, and the card's own name — instead of a truncated contract address. If the
// image is missing or fails to load (IPFS hiccup, no tokenURI), a styled placeholder stands in,
// still carrying the collection name and token id so the prize never reads as a hex string.
function NftPrizeCard({
  nft,
  roundId
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImg = nft.image && !imgFailed;
  const title = nft.name || nft.collection || 'NFT Prize';
  // Sub-line: when the card has its own name, surface the collection beside the id; otherwise just id.
  const sub = [nft.name ? nft.collection : null, nft.id].filter(Boolean).join(' · ');
  return /*#__PURE__*/React.createElement("div", {
    className: "nft-prize"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nft-prize-media"
  }, showImg ? /*#__PURE__*/React.createElement("img", {
    className: "nft-prize-img",
    src: nft.image,
    alt: title,
    loading: "lazy",
    onError: () => setImgFailed(true)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "nft-prize-ph"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nft-prize-ph-glyph"
  }, "🖼️"), /*#__PURE__*/React.createElement("span", {
    className: "nft-prize-ph-id"
  }, nft.id))), /*#__PURE__*/React.createElement("div", {
    className: "nft-prize-body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nft-prize-badge"
  }, "🏆 Win this NFT", roundId ? " · Round #" + roundId + " prize" : ""), /*#__PURE__*/React.createElement("div", {
    className: "nft-prize-name"
  }, title), sub ? /*#__PURE__*/React.createElement("div", {
    className: "nft-prize-sub"
  }, sub) : null));
}

// ---------- Current round status (primary zone, beside the swap card) ----------
// One card that carries everything about the open round: round number, the prize (pot + boost +
// bundled extras), a labelled pot-progress bar toward the threshold, participants, and your entries.
// Replaces the separate raffle banner and pot indicator so the same numbers are not shown twice.
function RoundStatus({
  raffle,
  pot,
  boostEth,
  prize,
  drawable,
  onDraw,
  drawing,
  paused,
  raffleLive
}) {
  const pct = Math.max(0, Math.min(1, pot.threshold ? pot.eth / pot.threshold : 0));
  const tokens = prize && prize.tokens || [];
  const nfts = prize && prize.nfts || [];
  const hasExtras = tokens.length > 0 || nfts.length > 0;
  const odds = raffleLive && raffle.totalEntries ? raffle.userEntries / raffle.totalEntries * 100 : 0;
  const status = paused ? 'Paused' : pct >= 1 ? 'Pot full' : 'Live';
  return /*#__PURE__*/React.createElement("div", {
    className: "card round-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "🎲"), /*#__PURE__*/React.createElement("h3", null, "Current Round"), raffle.roundId ? /*#__PURE__*/React.createElement("span", {
    className: "pill",
    style: {
      fontSize: 11.5,
      padding: '4px 9px'
    }
  }, "#", raffle.roundId) : null, /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: 'round-state' + (paused ? ' paused' : pct >= 1 ? ' full' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), status)),
  // Prize: ETH (pot + boost) and any bundled token / NFT prizes.
  /*#__PURE__*/React.createElement("div", {
    className: "prize-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "prize-glyph"
  }, /*#__PURE__*/React.createElement(TokenGlyph, {
    kind: "eth",
    size: 34
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "prize-amt"
  }, fmtEth(prize.ethFloat), " ", /*#__PURE__*/React.createElement("span", {
    className: "u"
  }, "ETH")), /*#__PURE__*/React.createElement("div", {
    className: "prize-cap"
  }, "Prize pot", boostEth > 0 ? " (incl. " + fmtEth(boostEth) + " boost)" : "", hasExtras ? " plus bundled prizes" : ""))), tokens.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "chip-row"
  }, tokens.map((t, i) => /*#__PURE__*/React.createElement("span", {
    className: "sym-chip",
    key: 't' + i
  }, t.amount, " ", t.sym))), nfts.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "nft-prizes"
  }, nfts.map((n, i) => /*#__PURE__*/React.createElement(NftPrizeCard, {
    nft: n,
    roundId: raffle.roundId,
    key: 'n' + i
  }))),
  // Pot progress toward the draw threshold, clearly labelled.
  /*#__PURE__*/React.createElement("div", {
    className: "potbar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "potbar-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "potbar-label"
  }, "Pot: ", fmtEth(pot.eth), " / ", pot.threshold, " ETH"), /*#__PURE__*/React.createElement("span", {
    className: "potbar-pct"
  }, Math.round(pct * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "potbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "potbar-fill",
    style: {
      width: pct * 100 + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "potbar-note"
  }, paused ? "Swaps are disabled until the owner unpauses. The prize can still be boosted." : pct >= 1 ? "Pot is full. The next swap draws a winner automatically." : "Each swap adds a 0.3% fee to the pot. When it fills, a winner is drawn automatically.")),
  // Round stats: participants, your entries, win odds.
  /*#__PURE__*/React.createElement("div", {
    className: "round-stats"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rk"
  }, "Participants"), /*#__PURE__*/React.createElement("div", {
    className: "rv"
  }, commas(raffle.participants))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rk"
  }, "Your Entries"), /*#__PURE__*/React.createElement("div", {
    className: "rv gold"
  }, raffleLive ? commas(raffle.userEntries) : '0')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rk"
  }, "Win Odds"), /*#__PURE__*/React.createElement("div", {
    className: "rv"
  }, raffleLive ? `${odds.toFixed(odds < 10 ? 2 : 1)}%` : '·'))), drawable && /*#__PURE__*/React.createElement("div", {
    className: "draw-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "draw-note"
  }, "The pot is full. Anyone can draw the winner now."), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onDraw,
    disabled: drawing,
    style: drawing ? {
      opacity: .6,
      cursor: 'not-allowed'
    } : {}
  }, drawing ? 'Drawing…' : 'Draw now')));
}

// ---------- How it works (accordion, collapsed by default) ----------
// Below the swap area. New visitors expand it; returning visitors skip past it.
function HowItWorks() {
  const [open, setOpen] = React.useState(false);
  const steps = [["💧", "0.3% fee", "Every swap collects 0.3% of the ETH side into the prize pot, on top of the Uniswap pool fee."], ["🎟️", "Entries", "That same swap earns sqrt-weighted entries: a buy earns full, a sell earns half."], ["✨", "Holder bonus", "Holding w🍖 multiplies your entries up to 2x, read from your live balance at the draw."], ["🎲", "Auto-draw", "When the pot reaches the threshold, the next swap draws a winner automatically."], ["🏆", "Auto-pay", "The winner is paid automatically in the same draw: the ETH pot plus any bundled token and NFT prizes land straight in their wallet, no claim needed."]];
  return /*#__PURE__*/React.createElement("div", {
    className: "card accordion" + (open ? ' open' : '')
  }, /*#__PURE__*/React.createElement("button", {
    className: "accordion-head",
    onClick: () => setOpen(o => !o),
    "aria-expanded": open
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "📜"), /*#__PURE__*/React.createElement("span", {
    className: "accordion-title"
  }, "How does The Cauldron work?"), /*#__PURE__*/React.createElement("span", {
    className: "accordion-chevron"
  }, open ? "−" : "+")), open && /*#__PURE__*/React.createElement("div", {
    className: "how-list",
    style: {
      marginTop: 16
    }
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

// ---------- Stats tab content (no card wrapper; SecondaryTabs provides it) ----------
// Lifetime volume (hidden in live mode until an indexer ships), swap count, last active, and the
// holder multiplier with its reference scale folded in as line items (no separate card).
function StatsContent({
  stats,
  flashKey,
  ethUsd = ETH_USD
}) {
  const daysSince = stats.daysSinceLastSwap;
  const sinceLabel = daysSince == null ? 'never' : daysSince === 0 ? 'today' : daysSince === 1 ? '1d ago' : `${daysSince}d ago`;
  const bps = stats.holderBps == null ? 10000 : stats.holderBps;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
  }, fmtUsd(stats.volEth * ethUsd))), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    key: 's' + flashKey
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Total Swaps"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, commas(stats.swaps)), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "via The Cauldron")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Last Active"), /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      fontSize: 18
    }
  }, sinceLabel), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "last swap")), /*#__PURE__*/React.createElement("div", {
    className: "stat",
    style: {
      borderColor: 'rgba(139,92,246,.3)',
      background: 'rgba(139,92,246,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Holder Multiplier"), /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      color: 'var(--brew-deep)'
    }
  }, fmtMult(bps)), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, stats.holderTokens != null ? compact(stats.holderTokens) + ' w🍖 held' : 'raffle weight'))),
  // Holder bonus reference scale, folded in as line items instead of its own card.
  /*#__PURE__*/React.createElement("div", {
    className: "scale-head"
  }, "Holder bonus scale"), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.45,
      marginBottom: 8
    }
  }, "Hold w🍖 for bonus raffle weight, from ~10k tokens up to a 2x cap around 5M (~5% of supply). Read from your live balance at the draw."), /*#__PURE__*/React.createElement("div", {
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

// ---------- Leaderboard tab content ----------
// Lifetime swap-volume ranking from SwapTracked events (no on-chain enumeration of swappers).
// volumeRaw is the contract's lifetimeVolume accumulator; units are mixed (ETH buys / w🍖 sells).
function LeaderboardContent({
  rows,
  userAddress
}) {
  const list = rows || [];
  return /*#__PURE__*/React.createElement("div", null, list.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "lb"
  }, list.map((r, i) => {
    const you = userAddress && r.address && r.address.toLowerCase() === userAddress.toLowerCase();
    return /*#__PURE__*/React.createElement("div", {
      className: 'lb-row' + (you ? ' you' : ''),
      key: r.address + ':' + i
    }, /*#__PURE__*/React.createElement("div", {
      className: "rk"
    }, i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1), /*#__PURE__*/React.createElement("div", {
      className: "who"
    }, /*#__PURE__*/React.createElement("span", {
      className: "a"
    }, you ? 'You · ' : '', trunc(r.address))), /*#__PURE__*/React.createElement("div", {
      className: "vol"
    }, compact(r.volumeRaw), " ", /*#__PURE__*/React.createElement("span", {
      className: "muted"
    }, r.swaps ? commas(r.swaps) + ' swaps' : '')));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "tab-empty"
  }, "No swaps tracked yet. Traders rank here by lifetime volume once swapping opens."), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 11,
      fontWeight: 700,
      marginTop: 10,
      lineHeight: 1.4
    }
  }, "Ranked from SwapTracked events. Volume is the raw on-chain figure (buys in ETH, sells in w🍖)."));
}

// ---------- Past winners tab content ----------
// Completed rounds from getRoundResult / getRound: winner, prize ETH, participants, auto-pay status.
function WinnersContent({
  rows,
  userAddress
}) {
  const [open, setOpen] = React.useState(null);
  if (!rows || rows.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "tab-empty"
    }, "No rounds drawn yet. Winners appear here once the pot fills and a winner is drawn.");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "lb winners"
  }, rows.map((r, i) => {
    const you = userAddress && r.winner && r.winner.toLowerCase() === userAddress.toLowerCase();
    const tokens = r.tokens || [];
    const nfts = r.nfts || [];
    const extras = tokens.length + nfts.length;
    const isOpen = open === i;
    const row = /*#__PURE__*/React.createElement("div", {
      className: 'lb-row' + (you ? ' you' : '') + (extras ? ' clickable' : ''),
      onClick: extras ? () => setOpen(o => o === i ? null : i) : undefined
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
    }, "round #", r.roundId, r.participantCount ? ' · ' + commas(r.participantCount) + ' in' : '', r.settled === false ? ' · ⏳ claim pending' : r.settled === true ? ' · ✅ auto-paid' : '')), /*#__PURE__*/React.createElement("div", {
      className: "vol"
    }, fmtEth(r.prizeEthFloat), " ", /*#__PURE__*/React.createElement("span", {
      className: "muted"
    }, "ETH"), extras ? /*#__PURE__*/React.createElement("span", {
      className: "more-pill"
    }, "+", extras, " more ", isOpen ? "−" : "+") : null));
    const detail = isOpen && extras ? /*#__PURE__*/React.createElement("div", {
      className: "bundle-detail"
    }, tokens.map((t, j) => /*#__PURE__*/React.createElement("span", {
      className: "sym-chip",
      key: 't' + j
    }, t.amount, " ", t.sym)), nfts.map((n, j) => /*#__PURE__*/React.createElement("span", {
      className: "sym-chip nft",
      key: 'n' + j
    }, n.label))) : null;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: r.roundId + ':' + i
    }, row, detail);
  }));
}

// ---------- Boost tab content ----------
// Anyone can permissionlessly top up the current round's ETH prize with boostPrize(). A boost earns no
// entries, never moves the draw threshold, and never triggers a draw; it works even while paused.
function BoostContent({
  roundId,
  boostEth,
  recent,
  onBoost,
  busy,
  connected,
  onConnect,
  paused
}) {
  const [amt, setAmt] = React.useState('0.05');
  const val = parseFloat(amt) || 0;
  const canBoost = connected && val > 0 && !busy;
  const rows = recent || [];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 1.5
    }
  }, "Add ETH to ", roundId ? "round #" + roundId + "'s" : "the current round's", " prize", boostEth > 0 ? " (currently +" + fmtEth(boostEth) + " ETH boosted)" : "", ". A boost is pure generosity: it does ", /*#__PURE__*/React.createElement("strong", null, "not"), " earn raffle entries, does ", /*#__PURE__*/React.createElement("strong", null, "not"), " move the draw threshold, and never triggers a draw."), /*#__PURE__*/React.createElement("div", {
    className: "boost-field"
  }, /*#__PURE__*/React.createElement("input", {
    className: "boost-in",
    inputMode: "decimal",
    value: amt,
    placeholder: "0.0",
    onChange: e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))
  }), /*#__PURE__*/React.createElement("span", {
    className: "boost-unit"
  }, /*#__PURE__*/React.createElement(TokenGlyph, {
    kind: "eth",
    size: 18
  }), "ETH")), connected ? /*#__PURE__*/React.createElement("button", {
    className: "btn brew",
    style: {
      width: '100%',
      marginTop: 10,
      ...(canBoost ? {} : {
        opacity: .55,
        cursor: 'not-allowed'
      })
    },
    disabled: !canBoost,
    onClick: () => canBoost && onBoost(val)
  }, busy ? '🔥 Boosting…' : val > 0 ? "Boost prize by " + fmtEth(val) + " ETH" : "Enter an amount") : /*#__PURE__*/React.createElement("button", {
    className: "btn brew connect-wallet-btn",
    style: {
      width: '100%',
      marginTop: 10
    },
    onClick: onConnect
  }, "Connect Wallet to Boost 🦄"), paused && /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      marginTop: 8,
      lineHeight: 1.4
    }
  }, "✓ Boosting works even while swaps are paused, so the launch round can be seeded."), rows.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "boost-recent"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scale-head"
  }, "Recent boosts"), rows.map((b, i) => /*#__PURE__*/React.createElement("div", {
    className: "boost-row",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--ink-2)'
    }
  }, trunc(b.booster)), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12.5,
      fontWeight: 800,
      color: 'var(--brew-deep)'
    }
  }, "+", fmtEth(b.amountEth), " ETH")))));
}

// ---------- Secondary tabbed section (one card, four tabs) ----------
// Collapses the old stack of secondary cards into a single card with a tab bar.
function SecondaryTabs({
  stats,
  flashKey,
  leaderboard,
  history,
  account,
  ethUsd,
  boost
}) {
  const [tab, setTab] = React.useState('stats');
  const tabs = [['stats', '📊', 'Stats'], ['leaders', '🏆', 'Leaders'], ['winners', '🎲', 'Winners'], ['boost', '🔥', 'Boost']];
  return /*#__PURE__*/React.createElement("div", {
    className: "card tabs-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tabs",
    role: "tablist"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t[0],
    className: 'tab' + (tab === t[0] ? ' on' : ''),
    role: "tab",
    title: t[2],
    "aria-selected": tab === t[0],
    onClick: () => setTab(t[0])
  }, /*#__PURE__*/React.createElement("span", {
    className: "tab-ic"
  }, t[1]), /*#__PURE__*/React.createElement("span", {
    className: "tab-lbl"
  }, t[2])))), /*#__PURE__*/React.createElement("div", {
    className: "tab-body"
  }, tab === 'stats' && /*#__PURE__*/React.createElement(StatsContent, {
    stats: stats,
    flashKey: flashKey,
    ethUsd: ethUsd
  }), tab === 'leaders' && /*#__PURE__*/React.createElement(LeaderboardContent, {
    rows: leaderboard,
    userAddress: account
  }), tab === 'winners' && /*#__PURE__*/React.createElement(WinnersContent, {
    rows: history,
    userAddress: account
  }), tab === 'boost' && /*#__PURE__*/React.createElement(BoostContent, {
    roundId: boost.roundId,
    boostEth: boost.boostEth,
    recent: boost.recent,
    onBoost: boost.onBoost,
    busy: boost.busy,
    connected: boost.connected,
    onConnect: boost.onConnect,
    paused: boost.paused
  })));
}

// ---------- Claim prize (fallback only) ----------
// Prizes are auto-paid at draw time, so this is hidden on the normal path. It appears only when an
// auto-pay leg could not deliver (winner could not receive ETH, or a bundled transfer reverted),
// letting the winner pull the still-owed remainder. `claimable` is from findClaimableForUser, or null.
function ClaimPrize({
  claimable,
  busy,
  onClaim
}) {
  if (!claimable) return null;
  const flagged = claimable.ethOwed !== undefined || claimable.tokensOwed !== undefined;
  const owedBits = [];
  if (!flagged || claimable.ethOwed) owedBits.push(fmtEth(claimable.prizeEthFloat) + ' ETH');
  if (!flagged || claimable.tokensOwed) owedBits.push('the bundled token and NFT prizes');
  const owedText = owedBits.join(' plus ');
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
  }, "You won raffle ", /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontWeight: 800
    }
  }, "#", claimable.raffleId), ", but the automatic payout could not reach your wallet. Collect ", /*#__PURE__*/React.createElement("strong", null, owedText), " here."), /*#__PURE__*/React.createElement("button", {
    className: "btn cta big brew",
    onClick: onClaim,
    disabled: busy,
    style: busy ? {
      opacity: .6,
      cursor: 'not-allowed'
    } : {}
  }, busy ? '🪄 Collecting…' : 'Collect prize 🎉'));
}
Object.assign(window, {
  TokenGlyph,
  RoundStatus,
  HowItWorks,
  SecondaryTabs,
  StatsContent,
  LeaderboardContent,
  WinnersContent,
  BoostContent,
  ClaimPrize
});
