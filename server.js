console.log("🔥 AlphaScope Server Loaded");

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// CONFIG (PUT YOUR KEYS)
// =========================
const NOWPAYMENTS_API_KEY = "25T3Q4E-BPR4KMH-PK4HA2V-DZ4F1TE";
const TELEGRAM_BOT_TOKEN = "8760490176:AAGNBjqvDiDa5nSId2nOC-bsuTBKIrq952c";

// =========================
// USERS (TEMP DATABASE)
// =========================
const users = {
  "1710140755": {
    tier: "free",
    chatId: "1710140755"
  }
};

// =========================
// PAYMENT TRACKING
// =========================
const payments = {};

// =========================
// SEARCH TERMS
// =========================
const SEARCH_TERMS = ["eth", "bnb", "usdc", "pepe", "inu"];

// =========================
// MEMORY (ANTI-SPAM)
// =========================
const sentSignals = new Set();

// =========================
// FETCH PAIRS
// =========================
async function fetchAllPairs() {
  let allPairs = [];

  for (const term of SEARCH_TERMS) {
    try {
      const res = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${term}`);
      allPairs = allPairs.concat(res.data.pairs);
    } catch (err) {
      console.log("Search error:", term);
    }
  }

  return allPairs;
}

// =========================
// SIGNAL ENGINE
// =========================
async function getEarlySignals() {
  const pairs = await fetchAllPairs();

  const filtered = pairs.filter(pair => {
    return (
      pair.liquidity?.usd > 5000 &&
      pair.volume?.h24 > 10000 &&
      pair.priceChange?.h1 > 0
    );
  });

  return filtered.slice(0, 5).map(pair => ({
    id: pair.pairAddress,
    name: pair.baseToken.name,
    symbol: pair.baseToken.symbol,
    price: pair.priceUsd,
    liquidity: pair.liquidity.usd,
    volume: pair.volume.h24,
    change_1h: pair.priceChange.h1,
    url: pair.url
  }));
}

// =========================
// TELEGRAM
// =========================
async function sendTelegram(chatId, token) {
  const message = `
🚀 AlphaScope Signal

${token.name} (${token.symbol})
Price: $${token.price}
1H: ${token.change_1h}%
Liquidity: $${token.liquidity}

${token.url}
`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: message
    });

    console.log("📩 Sent:", token.name);

  } catch (err) {
    console.error("Telegram Error:", err.message);
  }
}

// =========================
// AUTO SCANNER
// =========================
setInterval(async () => {
  console.log("🔍 Scanning...");

  const signals = await getEarlySignals();

  for (const token of signals) {
    if (!sentSignals.has(token.id)) {
      sentSignals.add(token.id);

      console.log("🚀 Signal:", token.name);

      for (const userId in users) {
        if (users[userId].tier === "premium") {
          await sendTelegram(users[userId].chatId, token);
        }
      }
    }
  }

}, 20000);

// =========================
// CREATE PAYMENT (GET)
// =========================
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
        success_url: "https://google.com",
        cancel_url: "https://google.com"
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

    res.json({
      payment_url: invoice.invoice_url
    });

  } catch (err) {
    console.error("Payment Error:", err.response?.data || err.message);
    res.status(500).send("Payment failed");
  }
});

// =========================
// WEBHOOK (AUTO UPGRADE)
// =========================
app.post('/webhook', (req, res) => {
  const payment = req.body;

  console.log("Webhook:", payment);

  if (payment.payment_status === "finished") {
    const userId = payments[payment.invoice_id];

    if (userId && users[userId]) {
      users[userId].tier = "premium";
      console.log("✅ USER UPGRADED:", userId);
    }
  }

  res.sendStatus(200);
});

// =========================
// USER CHECK
// =========================
app.get('/user', (req, res) => {
  const userId = req.query.userId;
  res.json(users[userId] || { tier: "free" });
});

// =========================
// EARLY SIGNALS API (IMPORTANT FOR EXTENSION)
// =========================
app.get('/early', async (req, res) => {
  try {
    const signals = await getEarlySignals();
    res.json({ signals });
  } catch (err) {
    res.json({ signals: [] });
  }
});

// =========================
// ROOT
// =========================
app.get('/', (req, res) => {
  res.send("AlphaScope SaaS LIVE 🚀");
});

// =========================
// START SERVER (RENDER FIX)
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});