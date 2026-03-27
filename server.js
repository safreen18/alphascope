const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// USER
app.get("/user", (req, res) => {
  res.json({ userId: "guest", tier: "free" });
});

// 🚀 SIGNAL ENGINE (STABLE VERSION)
app.get("/early", async (req, res) => {
  try {
    console.log("Fetching signals...");

    const url = "https://api.dexscreener.com/latest/dex/search/?q=token";
    const response = await fetch(url);
    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      console.log("No pairs found → using fallback");
      return res.json({ signals: getFallbackSignals() });
    }

    const signals = data.pairs.slice(0, 20).map(pair => {
      const liquidity = pair.liquidity?.usd || 0;
      const volume = pair.volume?.h24 || 0;
      const price = pair.priceUsd || 0;

      // 🔥 RELAXED FILTERS (IMPORTANT)
      if (liquidity < 1000 || volume < 1000) return null;

      let score = 0;

      if (volume > 100000) score += 40;
      else if (volume > 50000) score += 25;
      else score += 10;

      if (liquidity < 100000) score += 30;
      else score += 10;

      score += 10;

      const chain = pair.chainId || "unknown";

      return {
        token: pair.baseToken?.name || "Unknown",
        symbol: pair.baseToken?.symbol || "???",
        price,
        liquidity,
        volume,
        score,
        chain
      };
    }).filter(Boolean);

    // 🔥 If still empty → fallback
    if (signals.length === 0) {
      console.log("Filtered empty → fallback");
      return res.json({ signals: getFallbackSignals() });
    }

    console.log("Signals count:", signals.length);

    res.json({ signals });

  } catch (err) {
    console.log("ERROR:", err.message);
    res.json({ signals: getFallbackSignals() });
  }
});

// 🧠 FALLBACK SIGNALS (CRITICAL)
function getFallbackSignals() {
  return [
    {
      token: "Fallback ETH",
      symbol: "FETH",
      price: 0.0012,
      volume: 12000,
      score: 65,
      chain: "ethereum"
    },
    {
      token: "Fallback BSC",
      symbol: "FBSC",
      price: 0.0008,
      volume: 9000,
      score: 58,
      chain: "bsc"
    },
    {
      token: "Fallback SOL",
      symbol: "FSOL",
      price: 0.0021,
      volume: 15000,
      score: 72,
      chain: "solana"
    }
  ];
}

// PAYMENT
app.get("/create-payment", (req, res) => {
  res.redirect("https://nowpayments.io/payment/?iid=example");
});

app.listen(PORT, () => console.log("Server running on port", PORT));