const walletState = new Map();

// ----------------------
// CONFIG WEIGHTS (HEDGE FUND LOGIC)
// ----------------------
const WEIGHTS = {
  volumeSpike: 2.5,
  netBuyPressure: 3.0,
  txFrequency: 1.2,
  whaleSize: 3.5,
  earlyActivity: 4.0
};

// ----------------------
// UPDATE WALLET STATE
// ----------------------
function updateWallet(wallet, data) {
  walletState.set(wallet, {
    volume: data.volume || 0,
    buys: data.buys || 0,
    sells: data.sells || 0,
    tx: data.tx || 0,
    firstSeen: data.firstSeen || Date.now()
  });
}

// ----------------------
// SCORE WALLET INTELLIGENCE
// ----------------------
function scoreWallet(wallet) {
  const w = walletState.get(wallet);
  if (!w) return 0;

  const netBuy = w.buys - w.sells;
  const volumeSpike = w.volume > 100 ? 1 : 0;
  const whale = w.volume > 500 ? 1 : 0;
  const early = Date.now() - w.firstSeen < 1000 * 60 * 60 ? 1 : 0;

  const score =
    (volumeSpike * WEIGHTS.volumeSpike) +
    (netBuy > 0 ? WEIGHTS.netBuyPressure : 0) +
    (w.tx > 5 ? WEIGHTS.txFrequency : 0) +
    (whale * WEIGHTS.whaleSize) +
    (early * WEIGHTS.earlyActivity);

  return Number(score.toFixed(2));
}

// ----------------------
// GENERATE SIGNALS
// ----------------------
function generateSignals() {
  const signals = [];

  for (const [wallet] of walletState.entries()) {
    const score = scoreWallet(wallet);

    if (score > 6) {
      signals.push({
        wallet,
        score,
        classification:
          score > 10 ? "HEDGE_FUND_WHALE" :
          score > 8 ? "SMART_MONEY" :
          "ACCUMULATING"
      });
    }
  }

  return signals.sort((a, b) => b.score - a.score);
}

module.exports = {
  updateWallet,
  generateSignals,
  scoreWallet
};