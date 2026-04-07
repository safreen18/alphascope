const {
  getWhaleTransfers,
  detectDexSwaps,
  getTokenPrice
} = require("./tokenService");

/**
 * STORAGE
 */
let followedWallets = {};

/**
 * FOLLOW
 */
function followWallet(wallet) {
  if (!followedWallets[wallet]) {
    followedWallets[wallet] = {
      wallet,
      trades: [],
      holdings: {},
      pnl: 0
    };
  }
}

/**
 * GENERATE REAL TRADES
 */
async function generateCopyTrades() {
  const transfers = await getWhaleTransfers();
  const swaps = detectDexSwaps(transfers);

  const trades = [];

  for (const tx of swaps) {
    const wallet = tx.from.toLowerCase();

    if (!followedWallets[wallet]) continue;

    const price = await getTokenPrice(tx.token);

    const trade = {
      ...tx,
      price
    };

    updateHoldings(wallet, tx, price);

    followedWallets[wallet].trades.push(trade);

    trades.push(trade);
  }

  return trades.slice(0, 20);
}

/**
 * 🔥 HOLDINGS + REAL PNL
 */
function updateHoldings(wallet, tx, price) {
  const w = followedWallets[wallet];
  const token = tx.token;

  if (!w.holdings[token]) {
    w.holdings[token] = {
      amount: 0,
      avgPrice: 0
    };
  }

  const h = w.holdings[token];

  if (tx.type.includes("BUY")) {
    const totalCost = h.avgPrice * h.amount + price * tx.value;
    h.amount += tx.value;
    h.avgPrice = totalCost / h.amount;
  }

  if (tx.type.includes("SELL")) {
    h.amount -= tx.value;
    if (h.amount < 0) h.amount = 0;
  }

  // 🔥 REAL PNL
  const currentValue = h.amount * price;
  const cost = h.amount * h.avgPrice;

  w.pnl = currentValue - cost;
}

/**
 * WALLET STATS
 */
async function getWalletStats() {
  const stats = [];

  for (const w of Object.values(followedWallets)) {
    stats.push({
      wallet: w.wallet,
      pnl: w.pnl.toFixed(2),
      trades: w.trades.length
    });
  }

  stats.sort((a, b) => b.pnl - a.pnl);

  return stats;
}

module.exports = {
  followWallet,
  generateCopyTrades,
  getWalletStats
};