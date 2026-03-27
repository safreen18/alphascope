const API_URL = "https://alphascope-z4rz.onrender.com";

let selectedChain = "all";
let userTier = "free";

// 🧠 TRACK PREVIOUS SIGNALS
let previousSignals = new Set();

// 🔊 SOUND ALERT
const audio = new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3");

// 🔥 FORMATTERS
function formatPrice(p){
  if(!p || isNaN(p)) return "--";
  return "$" + Number(p).toFixed(6);
}

function formatNum(n){
  if(!n) return "--";
  if(n>1e6) return (n/1e6).toFixed(1)+"M";
  if(n>1e3) return (n/1e3).toFixed(1)+"K";
  return n;
}

// 🧠 NORMALIZE CHAIN (CRITICAL FIX)
function normalizeChain(c){
  if(!c) return "ethereum";
  c = c.toLowerCase();

  if(c.includes("eth")) return "ethereum";
  if(c.includes("bsc") || c.includes("bnb")) return "bsc";
  if(c.includes("sol")) return "solana";

  return "ethereum";
}

// 🧠 USER
async function fetchUser(){
  try{
    const r = await fetch(`${API_URL}/user`);
    const d = await r.json();
    userTier = d.tier || "free";
  }catch{
    userTier = "free";
  }
}

// 🔥 CHAIN SWITCH
document.addEventListener("click",(e)=>{
  if(e.target.classList.contains("chain-btn")){
    document.querySelectorAll(".chain-btn").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    selectedChain = e.target.dataset.chain;
    fetchSignals();
  }
});

// 🧠 INSIGHT
function generateInsight(s){
  if(s.score > 60){
    return "Explosive early momentum + whale accumulation";
  }
  if(s.score > 30){
    return "Accumulation phase detected";
  }
  return "Low conviction setup";
}

// 🚀 FETCH SIGNALS
async function fetchSignals(){
  const el = document.getElementById("signals");

  el.innerHTML = `<div class="loader">⚡ Scanning live smart money...</div>`;

  try{
    const r = await fetch(`${API_URL}/early`);
    const d = await r.json();

    let signals = d.signals || [];

    // 🔥 NORMALIZE ALL CHAINS
    signals = signals.map(s => ({
      ...s,
      chain: normalizeChain(s.chain)
    }));

    // 🔥 DEBUG (you can remove later)
    console.log("ALL SIGNALS:", signals);

    // 🔥 FILTER CORRECTLY
    if(selectedChain !== "all"){
      signals = signals.filter(s => s.chain === selectedChain);
    }

    console.log("FILTERED:", selectedChain, signals);

    signals.sort((a,b)=>Number(b.score)-Number(a.score));

    if(signals.length === 0){
      el.innerHTML = `<div class="empty">No ${selectedChain.toUpperCase()} signals</div>`;
      return;
    }

    let newDetected = false;

    const html = signals.map((s,i)=>{

      const id = s.token + s.symbol + s.chain;
      const isNew = !previousSignals.has(id);

      if(isNew) newDetected = true;

      return `
      <div class="card ${s.score>60?"strong":""} ${isNew?"pulse":""}">

        ${isNew?`<div class="top">⚡ NEW</div>`:""}
        ${i===0?`<div class="top">🔥 HOT</div>`:""}

        <div class="token">${s.token}</div>
        <div class="symbol">${s.symbol} • ${s.chain.toUpperCase()}</div>

        <div class="price">${formatPrice(s.price)}</div>

        <div class="meta">
          <span>Vol ${formatNum(s.volume24h)}</span>
          <span>Score ${s.score}</span>
        </div>

        <div class="badges">
          ${s.whaleDetected?`<span class="whale">🐋 Whale</span>`:""}
          <span class="entry">🚀 Entry</span>
          ${isNew?`<span class="entry">JUST NOW</span>`:""}
        </div>

        <div class="insight">
          ${
            i===0
            ? `
              <b>⚡ LIVE OPPORTUNITY</b><br><br>
              ${generateInsight(s)}<br><br>
              <b>Act quickly — early phase detected</b>
            `
            : `
              🔒 Premium signal timing + exit strategy
            `
          }
        </div>

      </div>
      `;
    }).join("");

    if(newDetected){
      audio.play().catch(()=>{});
    }

    previousSignals = new Set(
      signals.map(s=>s.token + s.symbol + s.chain)
    );

    el.innerHTML = html;

  }catch(err){
    console.log(err);
    el.innerHTML = `<div class="empty">Error loading signals</div>`;
  }
}

// 🚀 INIT
async function init(){
  await fetchUser();
  await fetchSignals();
  setInterval(fetchSignals,7000);
}

init();