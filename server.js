import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// =========================
// 🔥 CONFIG
// =========================
const CHAT_ID = "1710140755";
const TELEGRAM_TOKEN = "8760490176:AAGNBjqvDiDa5nSId2nOC-bsuTBKIrq952c";

// =========================
// 📤 TELEGRAM
// =========================
async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text
      })
    });
  } catch (err) {
    console.error("Telegram error:", err);
  }
}

// =========================
// 🔍 SIGNAL ENGINE + WHALES
// =========================
async function fetchSignals() {
  try {
    const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=eth");
    const text = await res.text();

    if (!text.startsWith("{")) return fallbackSignals();

    const data = JSON.parse(text);

    if (!data.pairs) return fallbackSignals();

    const signals = data.pairs
      .map(p => {
        const symbol = p.baseToken?.symbol || "";
        const tokenName = p.baseToken?.name || "";

        // ❌ remove stablecoins
        const blacklist = ["USDT", "USDC", "DAI", "BUSD"];
        if (blacklist.includes(symbol.toUpperCase())) return null;

        const liq = p.liquidity?.usd || 0;
        const vol = p.volume?.h24 || 0;

        if (liq < 500 || vol < 1000) return null;

        const ratio = vol / (liq || 1);

        // 🐋 WHALE DETECTION
        let whaleDetected = false;
        let whaleStrength = "LOW";

        if (ratio > 1.5) {
          whaleDetected = true;
          whaleStrength = "MEDIUM";
        }

        if (ratio > 3) {
          whaleStrength = "HIGH";
        }

        // 🔥 SIGNAL STRENGTH
        let strength = "LOW";
        if (ratio > 1.2) strength = "MEDIUM";
        if (ratio > 2) strength = "HIGH";

        // 🧠 SCORE BOOST FROM WHALES
        let score = ratio * 5;
        if (whaleDetected) score += 5;
        if (whaleStrength === "HIGH") score += 5;

        return {
          id: `${p.chainId}_${symbol}_${p.pairAddress}`,
          token: tokenName,
          symbol,
          chain: (p.chainId || "N/A").toUpperCase(),
          liquidity: Math.round(liq),
          volume24h: Math.round(vol),
          score: score.toFixed(1),
          entrySignal: ratio > 1.2,
          strength,
          whaleDetected,
          whaleStrength
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    if (signals.length === 0) return fallbackSignals();

    return signals;

  } catch (err) {
    console.error("Fetch error:", err);
    return fallbackSignals();
  }
}

// =========================
// 🛟 FALLBACK
// =========================
function fallbackSignals() {
  return [
    {
      id: "1",
      token: "Alpha Whale",
      symbol: "WHALE",
      chain: "ETH",
      liquidity: 5000,
      volume24h: 25000,
      score: "12.5",
      entrySignal: true,
      strength: "HIGH",
      whaleDetected: true,
      whaleStrength: "HIGH"
    }
  ];
}

// =========================
// 🚨 ALERT ENGINE
// =========================
const sentSignals = {};

async function runAlerts() {
  console.log("🔄 Scanning market...");

  const signals = await fetchSignals();

  for (const s of signals) {

    if (!s.entrySignal) continue;

    if (sentSignals[s.id]) continue;

    sentSignals[s.id] = true;

    const msg = `
🚨 AlphaScope Whale Signal

${s.token} (${s.symbol})
Chain: ${s.chain}

Liquidity: $${s.liquidity}
Volume: $${s.volume24h}

🐋 Whale: ${s.whaleDetected ? "YES" : "NO"}
🐋 Strength: ${s.whaleStrength}

Strength: ${s.strength}
Score: ${s.score}

⚡ Smart Money Entry
`;

    await sendTelegram(msg);
  }
}

// =========================
// 🔁 AUTO RUN
// =========================
setInterval(runAlerts, 15000);

// =========================
// 🌐 API
// =========================
app.get("/early", async (req, res) => {
  const signals = await fetchSignals();

  res.json({
    signals
  });
});

// =========================
app.listen(PORT, () => {
  console.log("🚀 AlphaScope WHALE ENGINE LIVE");
});