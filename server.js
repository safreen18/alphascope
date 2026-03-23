console.log("🔥 AlphaScope Alpha Engine + Whale Tracking Loaded");

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// ENV CONFIG
// =========================
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// =========================
// TEMP DATABASE
// =========================
const users = {
  "1710140755": { tier: "premium", chatId: "1710140755" }
};

const payments = {};
const sentSignals = new Set();

// =========================
// MEMORY STORE (for spikes & whales)
// =========================
const volumeMemory = {};
const whaleMemory = {};

// =========================
// TOP WALLETS (example, replace with real list)
// =========================
const topWallets = [
  "0xWalletAddress1",
  "0xWalletAddress2",
  "0xWalletAddress3"
];

// =========================
// FETCH TOKENS
// =========================
async function fetchPairs() {
  try {
    const res = await axios.get(
      "https://api.dexscreener.com/latest/dex/search?q=eth"
    );
    return res.data.pairs || [];
  } catch (err) {
    console.log("DEX ERROR:", err.message);
    return [];
  }
}

// =========================
// FETCH WALLET ACTIVITY
// =========================
async function checkWhaleActivity(pairAddress) {
  try {
    // Example: Replace with a real blockchain API if needed
    const res = await axios.get(
      `https://api.blockchain.com/v1/address/${pairAddress}/transactions`
    );
    const txs = res.data || [];

    // Count whales buying in last 15 min
    let whalesBuying = 0;
    const now = Date.now();

    for (const tx of txs) {
      if (topWallets.includes(tx.from) && tx.timestamp * 1000 > now - 15 * 60 * 1000) {
        whalesBuying++;
      }
    }

    return whalesBuying;

  } catch (err) {
    return 0;
  }
}

// =========================
// CALCULATE ALPHA SCORE
// =========================
function calculateScore(pair, spike, ageMinutes, whales) {
  let score = 0;

  if (pair.liquidity?.usd > 20000) score += 20;
  if (pair.volume?.h24 > 50000) score += 20;
  if (spike > 2) score += 20;
  if (pair.priceChange?.h1 > 5) score += 10;
  if (ageMinutes < 60) score += 10;
  if (whales > 0) score += 20;

  return Math.min(score, 100);
}

// =========================
// MAIN ENGINE
// =========================
async function getAlphaSignals() {
  const pairs = await fetchPairs();
  const signals = [];

  for (const pair of pairs) {
    if (!pair.baseToken || !pair.volume || !pair.liquidity) continue;

    const id = pair.pairAddress;

    const currentVolume = pair.volume.h24 || 0;
    const oldVolume = volumeMemory[id] || currentVolume;

    const spike = currentVolume / (oldVolume || 1);
    volumeMemory[id] = currentVolume;

    const createdAt = pair.pairCreatedAt || Date.now();
    const ageMinutes = (Date.now() - createdAt) / 60000;

    // Strong filter
    if (
      pair.liquidity.usd < 10000 ||
      currentVolume < 20000 ||
      spike < 1.5
    ) continue;

    // Whale activity
    let whales = whaleMemory[id] || 0;
    whales = await checkWhaleActivity(pair.pairAddress);
    whaleMemory[id] = whales;

    const score = calculateScore(pair, spike, ageMinutes, whales);
    if (score < 60) continue;

    signals.push({
      id,
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      price: pair.priceUsd,
      liquidity: pair.liquidity.usd,
      volume: currentVolume,
      spike: spike.toFixed(2),
      age: ageMinutes.toFixed(0),
      whales,
      score,
      url: pair.url
    });
  }

  return signals.slice(0, 5);
}

// =========================
// TELEGRAM ALERT
// =========================
async function sendTelegram(chatId, token) {
  const whaleText = token.whales > 0 ? `🐋 Whale Activity: ${token.whales}` : "";

  const msg = `
🚀 AlphaScope Signal

${token.name} (${token.symbol})
💰 Price: $${token.price}
⚡ Spike: ${token.spike}x
🧠 Score: ${token.score}/100
⏱ Age: ${token.age} min
${whaleText}

${token.url}
`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: msg
    });
  } catch (err) {
    console.log("Telegram error");
  }
}

// =========================
// AUTO SCAN LOOP
// =========================
setInterval(async () => {
  console.log("🔍 Alpha + Whale Scanning...");

  const signals = await getAlphaSignals();

  for (const token of signals) {
    if (!sentSignals.has(token.id)) {
      sentSignals.add(token.id);

      console.log("🚀 Alpha Signal:", token.name);

      for (const uid in users) {
        if (users[uid].tier === "premium") {
          await sendTelegram(users[uid].chatId, token);
        }
      }
    }
  }
}, 20000);

// =========================
// API ROUTES
// =========================
app.get('/user', (req, res) => {
  const userId = req.query.userId;
  res.json(users[userId] || { tier: "free" });
});

app.get('/early', async (req, res) => {
  const signals = await getAlphaSignals();
  res.json({ signals });
});

app.get('/create-payment', async (req, res) => {
  const userId = req.query.userId || "1710140755";
  try {
    const response = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: 10,
        price_currency: "usd",
        order_id: userId,
        order_description: "AlphaScope Premium",
      },
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const invoice = response.data;
    payments[invoice.id] = userId;
    res.json({ payment_url: invoice.invoice_url });

  } catch (err) {
    res.status(500).send("Payment failed");
  }
});

app.post('/webhook', (req, res) => {
  const payment = req.body;

  if (payment.payment_status === "finished") {
    const userId = payments[payment.invoice_id];

    if (users[userId]) {
      users[userId].tier = "premium";
      console.log("✅ USER UPGRADED:", userId);
    }
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send("AlphaScope Alpha Engine + Whale Tracking LIVE 🚀");
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});