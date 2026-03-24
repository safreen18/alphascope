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

        return {
          token: p.baseToken.name,
          symbol: p.baseToken.symbol,
          price: parseFloat(p.priceUsd || 0),
          chain: p.chainId?.toUpperCase() || "N/A",
          liquidity: Math.round(liq),
          volume24h: Math.round(vol),
          whaleCount: Math.floor(vol / (liq || 1)),
          score: Math.round((vol / (liq || 1)) * 10) / 10,
          confidence: "B"
        };
      })
      .filter(Boolean)
      .slice(0, 7);

  } catch (err) {
    console.error(err);
    return [];
  }
}

// -------------------------
app.get("/early", async (req, res) => {
  const userId = req.query.userId || "guest";

  const signals = await fetchSignals();
  const isPremium = users[userId]?.tier === "premium";

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
// 🔥 FIXED PAYMENT ROUTE
// -------------------------
app.post("/create-payment", async (req, res) => {
  try {
    const { userId } = req.body;

    console.log("Creating payment for:", userId);
    console.log("API KEY:", process.env.NOWPAYMENTS_API_KEY ? "Loaded" : "MISSING");

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

    console.log("NOWPayments FULL RESPONSE:", data);

    if (!data.invoice_url) {
      return res.status(500).json({
        error: "No invoice_url returned",
        details: data
      });
    }

    payments[data.id] = userId;

    res.json({
      invoice_url: data.invoice_url
    });

  } catch (err) {
    console.error("PAYMENT ERROR:", err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// -------------------------
app.listen(PORT, () => {
  console.log("🚀 AlphaScope PAYMENT FIXED");
});