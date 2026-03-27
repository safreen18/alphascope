const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// 🧠 DYNAMIC SMART WALLETS
let discoveredWallets = [];

// USER
app.get("/user", (req, res) => {
  res.json({ userId: "guest", tier: "free" });
});

// 🚀 MAIN SIGNAL ENGINE
app.get("/early", async (req, res) => {
  try {
    // 🔥 Discover new wallets first
    await discoverSmartWallets();

    // 🔥 Fetch signals from discovered wallets
    let signals = [];

    for (let wallet of discoveredWallets.slice(0, 5)) {
      const walletSignals = await fetchWalletSignals(wallet.address);
      signals.push(...walletSignals);
    }

    // remove duplicates
    const unique = {};
    signals.forEach(s => {
      unique[s.symbol + s.wallet] = s;
    });

    const finalSignals = Object.values(unique)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({ signals: finalSignals });

  } catch (err) {
    console.log("ERROR:", err.message);
    res.json({ signals: [] });
  }
});

// 🧠 DISCOVER NEW WHALES
async function discoverSmartWallets() {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=0x0000000000000000000000000000000000000000&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.result) return;

    let candidates = [];

    data.result.slice(0, 20).forEach(tx => {

      const value = Number(tx.value) / 1e18;

      // 🔥 WHALE FILTER
      if (value > 10) {
        candidates.push({
          address: tx.from,
          value
        });

        candidates.push({
          address: tx.to,
          value
        });
      }
    });

    // score wallets
    const walletMap = {};

    candidates.forEach(w => {
      if (!walletMap[w.address]) {
        walletMap[w.address] = {
          address: w.address,
          score: 0,
          activity: 0
        };
      }

      walletMap[w.address].score += w.value;
      walletMap[w.address].activity += 1;
    });

    const ranked = Object.values(walletMap)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // update global wallets
    discoveredWallets = ranked.map(w => ({
      address: w.address,
      score: w.score,
      activity: w.activity
    }));

  } catch (err) {
    console.log("DISCOVERY ERROR:", err.message);
  }
}

// 🧠 FETCH WALLET SIGNALS
async function fetchWalletSignals(wallet) {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${wallet}&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.result) return [];

    let signals = [];

    data.result.slice(0, 5).forEach(tx => {

      if (tx.to.toLowerCase() === wallet.toLowerCase()) {

        const value = Number(tx.value) / (10 ** tx.tokenDecimal);

        if (value < 100) return;

        signals.push({
          token: tx.tokenName,
          symbol: tx.tokenSymbol,
          chain: "ethereum",
          volume24h: value,
          score: calcScore(value),
          wallet: short(wallet),
          txHash: tx.hash,
          whaleDetected: true,
          entrySignal: true
        });
      }
    });

    return signals;

  } catch {
    return [];
  }
}

// 🔥 HELPERS
function calcScore(v) {
  if (v > 100000) return 90;
  if (v > 50000) return 75;
  if (v > 10000) return 60;
  return 40;
}

function short(w) {
  return w.slice(0, 6) + "..." + w.slice(-4);
}

// PAYMENT
app.get("/create-payment", (req, res) => {
  res.redirect("https://nowpayments.io/payment/?iid=example");
});

app.listen(PORT, () => console.log("SMART DISCOVERY ENGINE RUNNING"));