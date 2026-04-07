const fetch = require("node-fetch");

/**
 * MULTI WHALE WALLETS
 */
const WHALE_WALLETS = [
  "0xdd870fa1b7c4700f2bd7f44238821c26f7392148",
  "0x742d35cc6634c0532925a3b844bc454e4438f44e",
  "0x28c6c06298d514db089934071355e5743bf21d60"
];

/**
 * FETCH TRANSFERS
 */
async function getWhaleTransfers() {
  try {
    const all = [];

    for (const wallet of WHALE_WALLETS) {
      const url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${wallet}&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.result) {
        all.push(...data.result.slice(0, 10));
      }
    }

    return all;

  } catch (err) {
    console.error(err);
    return [];
  }
}

/**
 * 🔥 LIVE TOKEN PRICE (DEXSCREENER)
 */
async function getTokenPrice(symbol) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/search/?q=${symbol}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.pairs || data.pairs.length === 0) return 0;

    return parseFloat(data.pairs[0].priceUsd);

  } catch {
    return 0;
  }
}

/**
 * SWAP DETECTION
 */
function detectDexSwaps(transfers) {
  return transfers.map(tx => {
    const value = parseFloat(tx.value) / Math.pow(10, tx.tokenDecimal);
    const token = tx.tokenSymbol;

    let type = "TRANSFER";

    if (value > 500) type = "WHALE BUY";
    else if (value > 100) type = "BUY";
    else if (value < 20) type = "SELL";

    return {
      type,
      token,
      value,
      from: tx.from,
      to: tx.to,
      hash: tx.hash,
      timestamp: tx.timeStamp
    };
  });
}

module.exports = {
  getWhaleTransfers,
  detectDexSwaps,
  getTokenPrice
};