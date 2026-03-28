const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ENV
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

// 🧠 MEMORY
let trackedSignals = {};
let history = [];

let dailyStats = {
  date: new Date().toDateString(),
  totalPnl: 0,
  wins: 0,
  total: 0,
  best: 0
};

// RESET DAILY
function resetDaily(){
  const today = new Date().toDateString();
  if(dailyStats.date !== today){
    dailyStats = {
      date: today,
      totalPnl: 0,
      wins: 0,
      total: 0,
      best: 0
    };
  }
}

// USER
app.get("/user", (req, res) => {
  res.json({ userId: "guest", tier: "free" });
});

// 🚀 SIGNAL ENGINE
app.get("/early", async (req, res) => {
  try {

    resetDaily();

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
      const price = parseFloat(p.priceUsd) || 0;

      if (!trackedSignals[id]) {
        trackedSignals[id] = {
          entryPrice: price,
          createdAt: Date.now()
        };
      }

      const entry = trackedSignals[id].entryPrice;
      const pnl = ((price - entry) / entry) * 100;

      // UPDATE DAILY
      dailyStats.total++;
      dailyStats.totalPnl += pnl;
      if(pnl > 0) dailyStats.wins++;
      if(pnl > dailyStats.best) dailyStats.best = pnl;

      // HISTORY
      if (pnl > 10 && !history.find(h => h.id === id)) {
        history.push({
          id,
          token: p.baseToken?.name,
          symbol: p.baseToken?.symbol,
          chain,
          pnl: pnl.toFixed(2)
        });
      }

      grouped[chain].push({
        token: p.baseToken?.name,
        symbol: p.baseToken?.symbol,
        price,
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

    const signals = [
      ...grouped.ethereum.slice(0,3),
      ...grouped.bsc.slice(0,3),
      ...grouped.solana.slice(0,3)
    ];

    res.json({ signals });

  } catch (err) {
    console.log(err);
    res.json({ signals: [] });
  }
});

// 📊 DAILY ENDPOINT
app.get("/daily", (req, res) => {

  const winRate = dailyStats.total
    ? ((dailyStats.wins / dailyStats.total) * 100).toFixed(1)
    : 0;

  res.json({
    totalPnl: dailyStats.totalPnl.toFixed(2),
    winRate,
    best: dailyStats.best.toFixed(2),
    total: dailyStats.total
  });
});

// 📊 HISTORY
app.get("/history", (req, res) => {
  res.json({ history: history.reverse() });
});

// 🚀 SEND TELEGRAM REPORT
async function sendTelegramReport(){

  if(!TELEGRAM_TOKEN || !CHAT_ID) return;

  const winRate = dailyStats.total
    ? ((dailyStats.wins / dailyStats.total) * 100).toFixed(1)
    : 0;

  const msg = `
📊 <b>AlphaScope Daily Report</b>

💰 Total Profit: ${dailyStats.totalPnl.toFixed(2)}%
🎯 Win Rate: ${winRate}%
🔥 Best Trade: +${dailyStats.best.toFixed(2)}%
📈 Signals: ${dailyStats.total}

━━━━━━━━━━━━━━━
This is what you missed today.

Upgrade to catch tomorrow’s moves early 🚀
`;

  try{
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: msg,
        parse_mode:"HTML"
      })
    });
  }catch(e){
    console.log("Telegram report error", e);
  }
}

// ⏰ RUN DAILY (EVERY 24H)
setInterval(sendTelegramReport, 86400000);

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

app.listen(PORT, () => console.log("📩 DAILY REPORT ENGINE LIVE"));