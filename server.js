const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// 🧠 MEMORY DATABASE
let trackedSignals = {};
let history = [];

// USER
app.get("/user", (req, res) => {
  res.json({ userId: "guest", tier: "free" });
});

// 🚀 SIGNAL ENGINE
app.get("/early", async (req, res) => {
  try {

    const queries = ["ethereum", "bnb", "solana"];
    let allPairs = [];

    for (let q of queries) {
      const url = `https://api.dexscreener.com/latest/dex/search/?q=${q}`;
      const r = await fetch(url);
      const d = await r.json();
      allPairs = allPairs.concat(d.pairs || []);
    }

    const grouped = {
      ethereum: [],
      bsc: [],
      solana: []
    };

    allPairs.forEach(p => {
      const liquidity = p.liquidity?.usd || 0;
      const volume = p.volume?.h24 || 0;

      if (liquidity < 10000 || volume < 5000) return;

      const chain = normalizeChain(p.chainId);
      if (!chain) return;

      const id = p.pairAddress;
      const currentPrice = parseFloat(p.priceUsd) || 0;

      // 🧠 TRACK ENTRY
      if (!trackedSignals[id]) {
        trackedSignals[id] = {
          entryPrice: currentPrice,
          createdAt: Date.now(),
          token: p.baseToken?.name,
          symbol: p.baseToken?.symbol,
          chain
        };
      }

      const entry = trackedSignals[id].entryPrice;
      const pnl = ((currentPrice - entry) / entry) * 100;

      // 🔥 ADD TO HISTORY IF BIG MOVE
      if (pnl > 10 && !history.find(h => h.id === id)) {
        history.push({
          id,
          token: p.baseToken?.name,
          symbol: p.baseToken?.symbol,
          chain,
          pnl: pnl.toFixed(2),
          time: Date.now()
        });

        // LIMIT HISTORY SIZE
        if (history.length > 50) history.shift();
      }

      grouped[chain].push({
        token: p.baseToken?.name,
        symbol: p.baseToken?.symbol,
        price: currentPrice,
        volume24h: volume,
        liquidity,
        chain,
        pairAddress: id,
        score: calculateScore(liquidity, volume),
        pnl: pnl.toFixed(2),
        isWin: pnl > 0
      });
    });

    Object.keys(grouped).forEach(chain => {
      grouped[chain].sort((a,b)=>b.score-a.score);
    });

    const finalSignals = [
      ...grouped.ethereum.slice(0,3),
      ...grouped.bsc.slice(0,3),
      ...grouped.solana.slice(0,3)
    ];

    res.json({ signals: finalSignals });

  } catch (err) {
    console.log(err);
    res.json({ signals: [] });
  }
});

// 📊 HISTORY ENDPOINT
app.get("/history", (req, res) => {
  res.json({ history: history.reverse() });
});

// SCORE
function calculateScore(liq, vol){
  let score = 0;

  if (vol > 200000) score += 50;
  else if (vol > 100000) score += 35;
  else if (vol > 50000) score += 20;
  else score += 10;

  if (liq < 200000) score += 30;
  else score += 10;

  return score;
}

// CHAIN
function normalizeChain(c){
  if(!c) return null;

  c = c.toLowerCase();

  if(c.includes("eth")) return "ethereum";
  if(c.includes("bsc") || c.includes("bnb")) return "bsc";
  if(c.includes("sol")) return "solana";

  return null;
}

// PAYMENT
app.get("/create-payment", (req, res) => {
  res.redirect("https://nowpayments.io/payment/?iid=example");
});

app.listen(PORT, () => console.log("📊 TRACK RECORD ENGINE LIVE"));