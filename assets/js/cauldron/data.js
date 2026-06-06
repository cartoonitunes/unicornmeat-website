// data.jsx - mock chain data, pricing, and gamification math for The Cauldron
// Token facts pulled from the wrapped contract via unicornmeateth.com:
//   name "Unicorn Meat", symbol "w🍖", decimals 3, 0xDFA2…668 on Ethereum mainnet.

const TOKEN = {
  name: 'Unicorn Meat',
  symbol: 'w🍖',
  decimals: 3,
  address: '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'
};

// Pricing. ETH_USD is a FALLBACK only: app.js fetches the live ETH price from CoinGecko on load and
// passes it down, so the swap card USD figures track the real market. This constant is used only
// before/if that fetch resolves. Keep it roughly current.
const ETH_USD = 1560;
// Mock tokens-per-ETH for the preview only; live mode prices from real QuoterV2 quotes.
const PER_ETH = 750000;
// Mock token USD, kept consistent with the mock rate (so mock-mode pay/receive USD agree).
const TOKEN_USD = ETH_USD / PER_ETH;
const FEE_BPS = 30; // 0.30% cauldron fee

// Tier thresholds in lifetime ETH volume
const TIERS = [{
  key: 'bronze',
  label: 'Bronze',
  min: 0.1,
  color: '#C77B30',
  glow: 'rgba(199,123,48,.45)',
  emoji: '🥉'
}, {
  key: 'silver',
  label: 'Silver',
  min: 1,
  color: '#9AA6B2',
  glow: 'rgba(154,166,178,.5)',
  emoji: '🥈'
}, {
  key: 'gold',
  label: 'Gold',
  min: 5,
  color: '#FFBA00',
  glow: 'rgba(255,186,0,.55)',
  emoji: '🥇'
}, {
  key: 'diamond',
  label: 'Diamond',
  min: 25,
  color: '#52C7E6',
  glow: 'rgba(82,199,230,.6)',
  emoji: '💎'
}];
function tierFor(volEth) {
  let cur = {
    key: 'unranked',
    label: 'Unranked',
    min: 0,
    color: '#B9AE97',
    glow: 'rgba(185,174,151,.4)',
    emoji: '🍖'
  };
  for (const t of TIERS) if (volEth >= t.min) cur = t;
  return cur;
}
function nextTier(volEth) {
  for (const t of TIERS) if (volEth < t.min) return t;
  return null; // maxed
}
// Progress 0..1 toward next tier (from current tier floor)
function tierProgress(volEth) {
  const cur = tierFor(volEth);
  const nxt = nextTier(volEth);
  if (!nxt) return 1;
  const floor = cur.key === 'unranked' ? 0 : cur.min;
  return Math.max(0, Math.min(1, (volEth - floor) / (nxt.min - floor)));
}

// Raffle entries are sqrt-weighted by ETH-side volume of a swap.
// entries = floor( sqrt(volumeEth) * 16 ). The contract halves a sell's weight
// (sqrt(sellVol)/2), so a sell earns half the entries of an equivalent buy (P4).
function entriesForSwap(volEth, side) {
  const base = Math.floor(Math.sqrt(Math.max(0, volEth)) * 16);
  const weighted = side === 'sell' ? Math.floor(base / 2) : base;
  return Math.max(1, weighted);
}

// Holder multiplier, mirroring the contract exactly: a holder's sqrt entries are scaled at draw time
// by min(10000 + bitLength(displayTokens / 10000)^2 * 100, 20000) bps, where displayTokens is the
// whole-token w🍖 balance (raw / 1e3). No bonus below 10,000 tokens (the floor); the squared bit-length
// gives a gentle low end and a steep top: ~10k -> 1.01x, ~100k -> 1.16x, ~500k -> 1.36x, ~1M -> 1.49x,
// ~5M -> 1.81x, hard-capped at 2x around 5M (about 5% of the 100M supply).
function holderMultiplierBps(displayTokens) {
  let bits = 0;
  let x = Math.floor(Math.max(0, displayTokens) / 10000);
  while (x > 0) {
    bits++;
    x = Math.floor(x / 2);
  }
  return Math.min(20000, 10000 + bits * bits * 100);
}
function fmtMult(bps) {
  return (bps / 10000).toFixed(2) + 'x';
}
// A small reference scale for the UI, computed from the real formula so it always matches on-chain.
const HOLDER_SCALE = [10000, 100000, 1000000, 5000000, 10000000].map(function (t) {
  return { tokens: t, mult: holderMultiplierBps(t) };
});

// On-chain entry weights are sqrt of wei-denominated volume, so a buy of v ETH
// contributes sqrt(v * 1e18) = 1e9 * sqrt(v). Multiplying a raw on-chain weight by
// this scale maps it onto the same sqrt(ETH)*16 convention used by entriesForSwap
// above, so the live "This Round / Total Entries" display matches the swap preview
// and stays in human-readable single/double/triple digits (P3). Odds (a ratio of
// two weights) are unaffected by the constant factor.
const ENTRY_DISPLAY_SCALE = 16 / 1e9;

// ---- formatting helpers ----
function commas(n, dp = 0) {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp
  });
}
function compact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'k';
  return commas(n, n % 1 ? 2 : 0);
}
function fmtEth(n) {
  if (n >= 100) return commas(n, 1);
  if (n >= 1) return commas(n, 2);
  return commas(n, 4);
}
function fmtUsd(n) {
  return '$' + compact(n);
}
function trunc(addr) {
  if (addr.endsWith('.eth')) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}
// Clamp a user-typed decimal string to at most `dec` fractional digits so it parses
// cleanly with ethers parseUnits/parseEther (avoids the float round-trip precision bug).
function truncDecimals(s, dec) {
  const parts = String(s == null ? '' : s).split('.');
  const intPart = parts[0] || '0';
  if (parts.length < 2 || dec <= 0) return intPart;
  return intPart + '.' + parts[1].slice(0, dec);
}

// Connected user's starting on-chain stats
const USER_SEED = {
  addr: '0x4Cd2bE7a91F035c8d24eB0a7f6C19D8350a2e9aF',
  volEth: 18.42,
  swaps: 43,
  streak: 7,
  raffleWins: 2,
  entriesAllTime: 5180,
  bestWin: '1.8 ETH',
  holderTokens: 500000 // display-unit w🍖 held -> ~1.36x in the mock
};

// Completed-round history for the mock "Past winners" panel. Matches getRoundResult plus the `settled`
// flag from getRound; settled === true renders the "auto-paid" badge (the normal path).
// Past winners. A prize is always the ETH pot and may bundle owner-queued ERC-20 tokens and ERC-721
// NFTs; `tokens` ([{sym, amount}]) and `nfts` ([{label}]) carry those extras so the panel can show the
// full bundle, not just the ETH. Round 6 below exercises the full ETH + token + NFT bundle case.
const HISTORY_SEED = [
  { roundId: 6, winner: '0x4Cd2bE7a91F035c8d24eB0a7f6C19D8350a2e9aF', prizeEthFloat: 2.41, participantCount: 286, drawnAtBlock: 20512887, settled: true,
    tokens: [{ sym: 'w🍖', amount: '50K' }], nfts: [{ label: 'Unicorn Relics #014' }] },
  { roundId: 5, winner: '0x9A8e44bcD2e7F1a0C3b5D6e8F09112233aaBBccD', prizeEthFloat: 1.92, participantCount: 204, drawnAtBlock: 20498120, settled: true },
  { roundId: 4, winner: '0x1f2E3d4C5b6A79880910aAbBcCdDeEfF00112233', prizeEthFloat: 3.05, participantCount: 331, drawnAtBlock: 20471550, settled: true,
    tokens: [{ sym: '$NUTS', amount: '4,200' }] },
  { roundId: 3, winner: '0x7777Cc88aa99Bb00112233445566778899AaBbCc', prizeEthFloat: 1.50, participantCount: 158, drawnAtBlock: 20450010, settled: true }
];
const RAFFLE_SEED = {
  roundId: 7,
  participants: 318,
  totalEntries: 9840,
  userEntries: 412
};

// A raffle prize always pays the ETH pot, and may bundle owner-queued ERC-20 tokens
// (addPrize) and NFTs (addNFTPrize). This mock current-raffle prize exercises the full
// composition (ETH + tokens + NFT); empty `tokens`/`nfts` arrays render the ETH-only case.
const PRIZE_SEED = {
  ethFloat: 3.2,
  tokens: [{
    sym: 'w🍖',
    amount: '1.25M',
    glyph: '🍖'
  }, {
    sym: '$NUTS',
    amount: '4,200',
    glyph: '🥜'
  }, {
    sym: 'DEGEN',
    amount: '18k',
    glyph: '🎩'
  }],
  nfts: [{
    collection: 'Unicorn Relics',
    id: '#016',
    glyph: '🖼️'
  }]
};

// Bonus prizes queued for the current round (getQueuedPrizesForRound / getQueuedNFTsForRound).
// These bundle into that round when it is drawn (on top of the ETH pot).
const QUEUED_SEED = {
  tokens: [{
    sym: '$NUTS',
    amount: '2,000',
    glyph: '🥜'
  }],
  nfts: [{
    collection: 'Unicorn Relics',
    id: '#021',
    glyph: '🖼️'
  }]
};

// Cauldron pot
const POT_SEED = {
  eth: 1.86,
  threshold: 2.5
};

// Permissionless prize boosts for the current round (getRoundBoost + PrizeBoosted events).
// A boost tops up the round's ETH prize but is held apart from the pot: it never affects the
// draw threshold, earns no entries, and triggers no draw. `roundEth` is the boost accumulated
// for the open round; `recent` mirrors recent PrizeBoosted events (newest first).
const BOOST_SEED = {
  roundEth: 0.35,
  recent: [{
    booster: '0x9A8e44bcD2e7F1a0C3b5D6e8F09112233aaBBccD',
    amountEth: 0.2
  }, {
    booster: '0x1f2E3d4C5b6A79880910aAbBcCdDeEfF00112233',
    amountEth: 0.1
  }, {
    booster: '0x4Cd2bE7a91F035c8d24eB0a7f6C19D8350a2e9aF',
    amountEth: 0.05
  }]
};

// Leaderboard: lifetime swap volume ranking, built client-side from SwapTracked events
// (the contract has no on-chain enumeration of swappers). `volumeRaw` is the contract's
// lifetimeVolume accumulator (amountIn summed across swaps); units are mixed (ETH on buys,
// w🍖 on sells), so it is shown as a raw activity figure, not an ETH total.
const LEADERBOARD_SEED = [
  { address: '0x7777Cc88aa99Bb00112233445566778899AaBbCc', volumeRaw: 184.2, swaps: 96 },
  { address: '0x1f2E3d4C5b6A79880910aAbBcCdDeEfF00112233', volumeRaw: 121.7, swaps: 73 },
  { address: '0x9A8e44bcD2e7F1a0C3b5D6e8F09112233aaBBccD', volumeRaw: 88.4, swaps: 51 },
  { address: '0x4Cd2bE7a91F035c8d24eB0a7f6C19D8350a2e9aF', volumeRaw: 64.1, swaps: 43 },
  { address: '0x0d5eA77f44CdaA3aa1bb22Cc33dd44Ee55Ff6071', volumeRaw: 33.9, swaps: 28 }
];
Object.assign(window, {
  TOKEN,
  ETH_USD,
  TOKEN_USD,
  PER_ETH,
  FEE_BPS,
  TIERS,
  tierFor,
  nextTier,
  tierProgress,
  entriesForSwap,
  ENTRY_DISPLAY_SCALE,
  holderMultiplierBps,
  fmtMult,
  HOLDER_SCALE,
  commas,
  compact,
  fmtEth,
  fmtUsd,
  trunc,
  truncDecimals,
  USER_SEED,
  RAFFLE_SEED,
  POT_SEED,
  PRIZE_SEED,
  QUEUED_SEED,
  HISTORY_SEED,
  BOOST_SEED,
  LEADERBOARD_SEED
});
