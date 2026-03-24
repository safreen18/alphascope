import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(cors());
app.use(express.json());

// 🔥 SERVE DASHBOARD (IMPORTANT)
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// TEMP STORAGE
// -------------------------
const users = {};
const payments = {};

// -------------------------
// DATA SOURCE
// -------------------------
const DEX_API = "https://api.dexscreener.com/latest/dex/search?q=usdt";

// -------------------------
// FETCH SIGNALS
// -------------------------
async function fetchSignals() {
  try {
    const res = await fetch(DEX_API);
    const data = await res.json();

    if (!data.pairs) return [];

    return data.pairs
      .map(p => {
        const liq = p.liquidity?.usd || 0;
        const vol = p.volume?.h24 || 0;

        if (liq < 1000 || vol < 500) return null;

        const ratio = vol / (liq || 1);

        let score = (ratio * 5) + (vol / 10000);

        let confidence = "C";
        if (score > 8) confidence = "A";
        else if (score > 4) confidence = "B";

        return {
          token: p.baseToken.name,
          symbol: p.baseToken.symbol,
          price: parseFloat(p.priceUsd || 0),
          chain: (p.chainId || "N/A").toUpperCase(),
          liquidity: Math.round(liq),
          volume24h: Math.round(vol),
          whaleCount: Math.floor(ratio),
          score: score.toFixed(1),
          confidence
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

  } catch (err) {
    console.error("Signal fetch error:", err);
    return [];
  }
}

// -------------------------
// EARLY SIGNALS
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
        whaleCount: "LOCKED",
        score: "LOCKED",
        confidence: "LOCKED"
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
// CREATE PAYMENT
// -------------------------
app.post("/create-payment", async (req, res) => {
  try {
    const { userId } = req.body;

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        price_amount: 10,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: userId + "_" + Date.now(),
        order_description: "AlphaScope Premium",
        success_url: "https://google.com",
        cancel_url: "https://google.com"
      })
    });

    const data = await response.json();

    if (!data.invoice_url) {
      console.error("Payment error:", data);
      return res.status(500).json({ error: "Payment failed" });
    }

    payments[data.id] = userId;

    res.json({
      invoice_url: data.invoice_url
    });

  } catch (err) {
    console.error("Payment exception:", err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// -------------------------
// WEBHOOK
// -------------------------
app.post("/webhook", (req, res) => {
  const { invoice_id, payment_status } = req.body;

  if (payments[invoice_id] && payment_status === "finished") {
    users[payments[invoice_id]] = { tier: "premium" };
  }

  res.sendStatus(200);
});

// -------------------------
// START SERVER
// -------------------------
app.listen(PORT, () => {
  console.log("🚀 AlphaScope FULL SYSTEM RUNNING");
});