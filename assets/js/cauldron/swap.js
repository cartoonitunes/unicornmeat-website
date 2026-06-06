// swap.jsx - the center swap card for The Cauldron
const {
  useState: useStateSwap,
  useRef: useRefSwap
} = React;
function priceImpact(ethSize) {
  // toy AMM impact model: grows with size, capped
  return Math.min(7.5, Math.sqrt(ethSize) * 0.55);
}
function SwapCard({
  connected,
  raffleActive,
  earned,
  onSwap,
  onConnect,
  intensity,
  liveMode,
  balances,
  useCauldron = true,
  onToggleCauldron,
  paused,
  tokenSym = 'w🍖',
  ethUsd = ETH_USD
}) {
  const [side, setSide] = useStateSwap('buy'); // buy | sell
  const [amount, setAmount] = useStateSwap('0.5');
  const [slippage, setSlippage] = useStateSwap(0.5);
  const [showSlip, setShowSlip] = useStateSwap(false);
  const [busy, setBusy] = useStateSwap(false);
  // Live-mode price preview: the real QuoterV2 estimate (display units) and whether a quote is in
  // flight. Both stay inert in mock mode, which keeps the illustrative PER_ETH math.
  const [liveQuote, setLiveQuote] = useStateSwap(null);
  const [quoting, setQuoting] = useStateSwap(false);
  const popRef = useRefSwap(null);
  const amt = parseFloat(amount) || 0;
  // ETH-equivalent volume of this trade
  const ethVol = side === 'buy' ? amt : amt / PER_ETH;
  const impact = amt > 0 ? priceImpact(ethVol) : 0;
  // The 0.3% Cauldron fee only applies on the Cauldron path; the direct bypass pays none.
  const feeFactor = useCauldron ? 1 - FEE_BPS / 10000 : 1;
  const feeEth = useCauldron ? ethVol * (FEE_BPS / 10000) : 0;
  // Mock estimate from the illustrative PER_ETH rate; used as-is in mock mode and as the fallback
  // before the first live quote lands. In live mode the real output comes from liveQuote (a debounced
  // QuoterV2 call, see the effect below), which already reflects the pool price and fee.
  let mockOutput = 0;
  if (side === 'buy') mockOutput = amt * PER_ETH * feeFactor * (1 - impact / 100);else mockOutput = amt / PER_ETH * feeFactor * (1 - impact / 100);
  const haveOut = !liveMode || liveQuote != null;
  const output = liveMode ? liveQuote == null ? 0 : liveQuote : mockOutput;
  const minRecv = output * (1 - slippage / 100);
  // Exchange-rate label ("1 ETH = X w🍖"). In live mode derive it from the current QuoterV2 quote
  // (buy: tokensOut / ethIn; sell: tokensIn / ethOut), never the mock rate; show a placeholder until
  // a quote lands. In mock mode keep the illustrative PER_ETH constant.
  const perEthLive = liveMode && amt > 0 && liveQuote != null && liveQuote > 0 ? side === 'buy' ? liveQuote / amt : amt / liveQuote : null;
  const rateStr = liveMode ? perEthLive != null ? compact(perEthLive) : '…' : compact(PER_ETH);
  // Token USD derived from the live ETH price and the current rate, so the "you receive" USD on a buy
  // tracks the real market and stays consistent with the "you pay" USD.
  const tokenUsd = ethUsd / (perEthLive || PER_ETH);
  // The Cauldron path is unavailable while the contract is paused; the direct path always works.
  const cauldronBlocked = useCauldron && paused;
  // Sells earn half the entries of an equivalent-volume buy (P4).
  const willEarn = entriesForSwap(ethVol, side);

  // Live-mode price preview: debounce the typed input by 500ms, then ask QuoterV2 (via the same
  // Cauldron.quote() used to build minOut at submit time) for the real expected output, so
  // "You receive (est.)" reflects the actual pool price instead of the mock PER_ETH rate. A buy is
  // quoted on the net input (after the fee is collected) and returns tokens out; a sell is quoted on the gross
  // token amount and returns gross WETH out, from which we subtract the Cauldron fee (the path collects it
  // from the ETH output). Mock mode never runs this and keeps the PER_ETH math above.
  React.useEffect(() => {
    if (!liveMode) return;
    if (!(amt > 0) || !window.ethers || !window.CAULDRON || !window.CAULDRON.quote) {
      setLiveQuote(null);
      setQuoting(false);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const eth = window.ethers;
        const amountInWei = side === 'buy' ? eth.utils.parseEther(truncDecimals(amount, 18)) : eth.utils.parseUnits(truncDecimals(amount, TOKEN.decimals), TOKEN.decimals);
        const out = await window.CAULDRON.quote({
          side,
          amountInWei,
          useCauldron
        });
        if (cancelled) return;
        if (!out) {
          setLiveQuote(null);
        } else if (side === 'buy') {
          // Tokens out, already net of the buy-side fee.
          setLiveQuote(Number(eth.utils.formatUnits(out, TOKEN.decimals)));
        } else {
          // Gross WETH out; the Cauldron collects its fee from this ETH before paying the seller, and the
          // direct bypass pays no fee.
          let ethOut = Number(eth.utils.formatEther(out));
          if (useCauldron) ethOut = ethOut * (1 - FEE_BPS / 10000);
          setLiveQuote(ethOut);
        }
      } catch (_e) {
        if (!cancelled) setLiveQuote(null);
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [liveMode, amount, side, useCauldron]);

  // Real wallet balance for the side being paid (P1). In live mode we read it from chain;
  // in mock mode we keep the illustrative placeholder so the preview still reads naturally.
  const sideBalance = balances ? side === 'buy' ? balances.ethFloat : balances.tokenFloat : null;
  const balText = balances ? side === 'buy' ? commas(balances.ethFloat, balances.ethFloat < 1 ? 4 : 2) + ' ETH' : compact(balances.tokenFloat) + ' ' + tokenSym : side === 'buy' ? '12.84 ETH' : '4.21M ' + tokenSym;
  // Gate the swap only when we actually know the on-chain balance (live mode).
  const insufficient = sideBalance != null && amt > sideBalance;
  const payTok = side === 'buy' ? {
    kind: 'eth',
    cls: '',
    sym: 'ETH',
    icCls: ''
  } : {
    kind: 'meat',
    cls: 'meat',
    sym: tokenSym,
    icCls: 'meat'
  };
  const getTok = side === 'buy' ? {
    kind: 'meat',
    sym: tokenSym,
    icCls: 'meat'
  } : {
    kind: 'eth',
    sym: 'ETH',
    icCls: ''
  };
  const fmtOut = n => side === 'buy' ? commas(n, 3) : commas(n, 5);
  // Keep busy=true until the swap actually settles so the button cannot be
  // double-submitted while a tx (or the mock delay) is in flight (M2). The handler is
  // awaited; the live handler passes the raw typed `amount` and `slippage` through so it
  // can build amountIn/minOut precisely (M3/H2) rather than reconstructing from floats.
  async function doSwap() {
    if (!connected || amt <= 0 || busy || insufficient || cauldronBlocked) return;
    setBusy(true);
    try {
      await onSwap({
        amount,
        ethVol,
        feeEth,
        output,
        side,
        willEarn,
        slippage
      });
    } catch (_e) {
      // The handler surfaces failures via toast; just release the button here.
    } finally {
      setBusy(false);
    }
  }
  function flip() {
    setSide(side === 'buy' ? 'sell' : 'buy');
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      position: 'relative',
      borderColor: 'var(--gold)',
      boxShadow: 'var(--shadow-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-h"
  }, /*#__PURE__*/React.createElement("h3", null, "Swap"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'buy' + (side === 'buy' ? ' on buy' : ''),
    onClick: () => setSide('buy')
  }, "Buy"), /*#__PURE__*/React.createElement("button", {
    className: 'sell' + (side === 'sell' ? ' on sell' : ''),
    onClick: () => setSide('sell')
  }, "Sell")), /*#__PURE__*/React.createElement("button", {
    className: "gear",
    title: "Slippage",
    onClick: () => setShowSlip(s => !s)
  }, "\u2699\uFE0F"), showSlip && /*#__PURE__*/React.createElement("div", {
    className: "pop",
    ref: popRef
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontFamily: 'var(--display)',
      fontSize: 14
    }
  }, "Slippage tolerance"), /*#__PURE__*/React.createElement("div", {
    className: "slip-opts"
  }, [0.1, 0.5, 1].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: slippage === v ? 'on' : '',
    onClick: () => setSlippage(v)
  }, v, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "slip-custom"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    value: slippage,
    onChange: e => setSlippage(Math.max(0, parseFloat(e.target.value) || 0))
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontWeight: 700,
      color: 'var(--muted)'
    }
  }, "%")), slippage > 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11.5,
      color: 'var(--down)',
      fontWeight: 800
    }
  }, "\u26A0\uFE0F High slippage. You may get a bad price."))), /*#__PURE__*/React.createElement("label", {
    className: "raffle-toggle"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: useCauldron,
    onChange: e => onToggleCauldron && onToggleCauldron(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "rt-text"
  }, "Earn raffle entries ", /*#__PURE__*/React.createElement("span", {
    className: "rt-cost"
  }, "(+0.3% fee)"))), /*#__PURE__*/React.createElement("div", {
    className: "bypass-note"
  }, useCauldron
    ? "On: every swap earns raffle entries toward the prize pot. The 0.3% fee funds the pot, on top of the Uniswap pool fee."
    : "Off: swaps route straight to Uniswap V3. No fee and no raffle entries. Sells deliver WETH."), /*#__PURE__*/React.createElement("div", {
    className: "swapfield"
  }, /*#__PURE__*/React.createElement("div", {
    className: "top"
  }, /*#__PURE__*/React.createElement("span", null, "You pay"), /*#__PURE__*/React.createElement("span", {
    style: insufficient ? {
      color: 'var(--down)',
      fontWeight: 800
    } : {}
  }, "Balance: ", balText)), /*#__PURE__*/React.createElement("div", {
    className: "mid"
  }, /*#__PURE__*/React.createElement("input", {
    className: "amt-in",
    inputMode: "decimal",
    value: amount,
    placeholder: "0.0",
    onChange: e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))
  }), /*#__PURE__*/React.createElement("span", {
    className: "tok"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'ic ' + payTok.icCls
  }, /*#__PURE__*/React.createElement(TokenGlyph, {
    kind: payTok.kind,
    size: 18
  })), payTok.sym)),/*#__PURE__*/React.createElement("div", {
    className: "top",
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, fmtUsd(ethVol * ethUsd)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, ['0.25', '0.5', '1.0'].map(q => /*#__PURE__*/React.createElement("span", {
    key: q,
    onClick: () => setAmount(side === 'buy' ? q : String(parseFloat(q) * PER_ETH)),
    style: {
      cursor: 'pointer',
      color: 'var(--gold-deep)',
      fontWeight: 800
    }
  }, side === 'buy' ? q : q + '×'))))), /*#__PURE__*/React.createElement("div", {
    className: "swap-arrow"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: flip,
    title: "Flip"
  }, "\u21C5")), /*#__PURE__*/React.createElement("div", {
    className: "swapfield"
  }, /*#__PURE__*/React.createElement("div", {
    className: "top"
  }, /*#__PURE__*/React.createElement("span", null, "You receive (est.)"), /*#__PURE__*/React.createElement("span", null, "1 ETH \u2248 ", rateStr, " ", tokenSym)),/*#__PURE__*/React.createElement("div", {
    className: "mid"
  }, /*#__PURE__*/React.createElement("input", {
    className: "amt-in",
    value: amt > 0 ? haveOut ? fmtOut(output) : quoting ? '…' : '' : '',
    placeholder: "0.0",
    readOnly: true
  }),/*#__PURE__*/React.createElement("span", {
    className: "tok"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'ic ' + getTok.icCls
  }, /*#__PURE__*/React.createElement(TokenGlyph, {
    kind: getTok.kind,
    size: 18
  })), getTok.sym)),/*#__PURE__*/React.createElement("div", {
    className: "top",
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, fmtUsd(side === 'buy' ? output * tokenUsd : output * ethUsd)), /*#__PURE__*/React.createElement("span", null))), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Price impact"), /*#__PURE__*/React.createElement("span", {
    className: "r",
    style: {
      color: impact > 3 ? 'var(--down)' : impact > 1 ? 'var(--gold-deep)' : 'var(--up)'
    }
  }, amt > 0 ? '-' + impact.toFixed(2) + '%' : '·')), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, useCauldron ? "Raffle fee (0.3%)" : "Raffle fee"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, useCauldron ? fmtEth(feeEth) + " ETH to pot" : "none")),/*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Min. received"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, amt > 0 ? haveOut ? fmtOut(minRecv) + ' ' + getTok.sym : quoting ? '…' : '·' : '·')),/*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Slippage"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, slippage, "%"))), raffleActive && amt > 0 && earned == null && /*#__PURE__*/React.createElement("div", {
    className: "earn",
    style: {
      borderStyle: 'solid',
      opacity: .92
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 26
    }
  }, "\uD83C\uDF9F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "This swap earns ~", commas(willEarn), " raffle entries"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Entries scale with the square root of swap size. A sell earns half a buy's entries."))), raffleActive && earned != null && /*#__PURE__*/React.createElement("div", {
    className: "earn",
    key: earned.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "big"
  }, "+", commas(earned.entries)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "\uD83C\uDF9F\uFE0F Raffle entries earned!"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Added to your ", commas(earned.total), " total entries for this round."))), connected ? /*#__PURE__*/React.createElement("button", {
    className: "btn cta big",
    onClick: doSwap,
    disabled: amt <= 0 || busy || insufficient || cauldronBlocked,
    style: amt <= 0 || insufficient || cauldronBlocked ? {
      opacity: .55,
      cursor: 'not-allowed'
    } : {}
  }, busy
    ? '🪄 Brewing your swap…'
    : cauldronBlocked
      ? 'Swaps paused (uncheck to swap direct)'
      : amt <= 0
        ? 'Enter an amount'
        : insufficient
          ? 'Insufficient balance'
          : (useCauldron ? 'Swap & earn entries' : 'Swap directly on Uniswap')) : /*#__PURE__*/React.createElement("button", {
    className: "btn cta big brew connect-wallet-btn",
    onClick: onConnect
  }, "Connect Wallet to Swap \uD83E\uDD84"));
}
Object.assign(window, {
  SwapCard
});
