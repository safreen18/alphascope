import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const users = {};
const payments = {};

const DEX_API = "https://api.dexscreener.com/latest/dex/search?q=usdt";

// -------------------------
// FETCH REAL DATA (WORKING)
// -------------------------
async function fetchSignals() {
  try {
    const res = await fetch(DEX_API);
    const data = await res.json();

    if (!data.pairs) return [];

    const now = Date.now();

    return data.pairs
      .map(p => {
        const liq = p.liquidity?.usd || 0;
        const vol = p.volume?.h24 || 0;
        const price = parseFloat(p.priceUsd || 0);

        const ageHours = p.pairCreatedAt
          ? (now - p.pairCreatedAt) / 3600000
          : 24;

        const ratio = vol / (liq || 1);

        // FILTERS (RELAXED BUT REAL)
        if (liq < 1000) return null;
        if (vol < 500) return null;

        let score = 0;
        score += liq / 20000;
        score += vol / 8000;
        score += ratio * 4;
        score += Math.max(0, 6 - ageHours);

        let confidence = "C";
        if (score > 8) confidence = "A";
        else if (score > 5) confidence = "B";

        return {
          token: p.baseToken.name,
          symbol: p.baseToken.symbol,
          price,
          chain: p.chainId?.toUpperCase() || "N/A",
          liquidity: Math.round(liq),
          volume24h: Math.round(vol),
          whaleCount: Math.floor(ratio),
          score: Math.round(score * 10) / 10,
          confidence
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);

  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

// -------------------------
app.get("/early", async (req, res) => {
  const userId = req.query.userId || "guest";

  const signals = await fetchSignals();
  const isPremium = users[userId]?.tier === "premium";

  if (!signals.length) {
    return res.json({
      tier: "free",
      locked: false,
      signals: []
    });
  }

  if (!isPremium) {
    return res.json({
      tier: "free",
      locked: true,
      signals: signals.slice(0, 2).map(s => ({
        ...s,
        whaleCount: "🔒",
        score: "🔒",
        confidence: "🔒"
      }))
    });
  }

  res.json({
    tier: "premium",
    locked: false,
    signals
  });
});

// -------------------------
app.post("/create-payment", async (req, res) => {
  const { userId } = req.body;

  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: {
      "x-api-key": process.env.NOWPAYMENTS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      price_amount: 10,
      price_currency: "USD",
      pay_currency: "USDT",
      order_id: userId + "_" + Date.now(),
      ipn_callback_url: `${req.protocol}://${req.get("host")}/webhook`
    })
  });

  const data = await response.json();
  payments[data.id] = userId;

  res.json({ invoice_url: data.invoice_url });
});

// -------------------------
app.post("/webhook", (req, res) => {
  const { invoice_id, payment_status } = req.body;

  if (payments[invoice_id] && payment_status === "finished") {
    users[payments[invoice_id]] = { tier: "premium" };
  }

  res.sendStatus(200);
});

// -------------------------
app.listen(PORT, () => {
  console.log("🚀 Alpha Engine LIVE (Fixed Data Source)");
});