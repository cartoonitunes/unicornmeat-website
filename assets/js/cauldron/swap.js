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
  balances
}) {
  const [side, setSide] = useStateSwap('buy'); // buy | sell
  const [amount, setAmount] = useStateSwap('0.5');
  const [slippage, setSlippage] = useStateSwap(0.5);
  const [showSlip, setShowSlip] = useStateSwap(false);
  const [busy, setBusy] = useStateSwap(false);
  const popRef = useRefSwap(null);
  const amt = parseFloat(amount) || 0;
  // ETH-equivalent volume of this trade
  const ethVol = side === 'buy' ? amt : amt / PER_ETH;
  const impact = amt > 0 ? priceImpact(ethVol) : 0;
  const feeEth = ethVol * (FEE_BPS / 10000);
  let output = 0;
  if (side === 'buy') output = amt * PER_ETH * (1 - FEE_BPS / 10000) * (1 - impact / 100);else output = amt / PER_ETH * (1 - FEE_BPS / 10000) * (1 - impact / 100);
  const minRecv = output * (1 - slippage / 100);
  // Sells earn half the entries of an equivalent-volume buy (P4).
  const willEarn = entriesForSwap(ethVol, side);

  // Real wallet balance for the side being paid (P1). In live mode we read it from chain;
  // in mock mode we keep the illustrative placeholder so the preview still reads naturally.
  const sideBalance = balances ? side === 'buy' ? balances.ethFloat : balances.tokenFloat : null;
  const balText = balances ? side === 'buy' ? commas(balances.ethFloat, balances.ethFloat < 1 ? 4 : 2) + ' ETH' : compact(balances.tokenFloat) + ' w🍖' : side === 'buy' ? '12.84 ETH' : '4.21M w🍖';
  // Gate the swap only when we actually know the on-chain balance (live mode).
  const insufficient = sideBalance != null && amt > sideBalance;
  const payTok = side === 'buy' ? {
    ic: '⟠',
    cls: '',
    sym: 'ETH',
    icCls: ''
  } : {
    ic: '🍖',
    cls: 'meat',
    sym: 'w🍖',
    icCls: 'meat'
  };
  const getTok = side === 'buy' ? {
    ic: '🍖',
    sym: 'w🍖',
    icCls: 'meat'
  } : {
    ic: '⟠',
    sym: 'ETH',
    icCls: ''
  };
  const fmtOut = n => side === 'buy' ? commas(n, 3) : commas(n, 5);
  // Keep busy=true until the swap actually settles so the button cannot be
  // double-submitted while a tx (or the mock delay) is in flight (M2). The handler is
  // awaited; the live handler passes the raw typed `amount` and `slippage` through so it
  // can build amountIn/minOut precisely (M3/H2) rather than reconstructing from floats.
  async function doSwap() {
    if (!connected || amt <= 0 || busy || insufficient) return;
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
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, "\uD83C\uDF72"), /*#__PURE__*/React.createElement("h3", null, "Swap"), /*#__PURE__*/React.createElement("span", {
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
  }, "\u26A0\uFE0F High slippage. You may get a bad price."))), /*#__PURE__*/React.createElement("div", {
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
  }, payTok.ic), payTok.sym)), /*#__PURE__*/React.createElement("div", {
    className: "top",
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, fmtUsd(ethVol * ETH_USD)), /*#__PURE__*/React.createElement("span", {
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
  }, /*#__PURE__*/React.createElement("span", null, "You receive (est.)"), /*#__PURE__*/React.createElement("span", null, "1 ETH \u2248 ", compact(PER_ETH), " w\uD83C\uDF56")), /*#__PURE__*/React.createElement("div", {
    className: "mid"
  }, /*#__PURE__*/React.createElement("input", {
    className: "amt-in",
    value: amt > 0 ? fmtOut(output) : '',
    placeholder: "0.0",
    readOnly: true
  }), /*#__PURE__*/React.createElement("span", {
    className: "tok"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'ic ' + getTok.icCls
  }, getTok.ic), getTok.sym)), /*#__PURE__*/React.createElement("div", {
    className: "top",
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, fmtUsd(side === 'buy' ? output * TOKEN_USD : output * ETH_USD)), /*#__PURE__*/React.createElement("span", null))), /*#__PURE__*/React.createElement("div", {
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
  }, "Cauldron fee (0.3%)"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, fmtEth(feeEth), " ETH to pot")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Min. received"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, amt > 0 ? fmtOut(minRecv) + ' ' + getTok.sym : '·')), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Slippage"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, slippage, "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--muted)',
      fontWeight: 700,
      marginTop: 10,
      lineHeight: 1.45
    }
  }, "Routes through Uniswap V3. The 0.3% Cauldron fee is on top of the pool fee and funds the raffle pot."), raffleActive && amt > 0 && earned == null && /*#__PURE__*/React.createElement("div", {
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
    disabled: amt <= 0 || busy || insufficient,
    style: amt <= 0 || insufficient ? {
      opacity: .55,
      cursor: 'not-allowed'
    } : {}
  }, busy ? '🪄 Brewing your swap…' : amt <= 0 ? 'Enter an amount' : insufficient ? 'Insufficient balance' : `Swap via The Cauldron 🍲`) : /*#__PURE__*/React.createElement("button", {
    className: "btn cta big brew connect-wallet-btn",
    onClick: onConnect
  }, "Connect Wallet to Swap \uD83E\uDD84"));
}
Object.assign(window, {
  SwapCard
});
