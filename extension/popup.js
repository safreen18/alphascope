const API_URL = "https://alphascope-z4rz.onrender.com";

let selectedChain = "all";
let userTier = "free";

// ✅ SAFE FORMATTERS
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

// ✅ USER
async function fetchUser(){
  try{
    const r = await fetch(`${API_URL}/user`);
    const d = await r.json();
    userTier = d.tier || "free";
  }catch{
    userTier = "free";
  }
}

// ✅ CHAIN CLICK
document.addEventListener("click",(e)=>{
  if(e.target.classList.contains("chain-btn")){
    document.querySelectorAll(".chain-btn").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    selectedChain = e.target.dataset.chain;
    fetchSignals();
  }
});

// 🧠 INSIGHT ENGINE
function generateInsight(s){
  let insight = "Weak activity";
  let action = "Avoid entry";
  let confidence = "LOW";

  if(s.score > 60){
    insight = "Strong early momentum + liquidity gap";
    action = "Early entry opportunity";
    confidence = "HIGH";
  }
  else if(s.score > 30){
    insight = "Building volume with moderate interest";
    action = "Watch closely";
    confidence = "MEDIUM";
  }

  if(s.whaleDetected){
    insight += " • Whale accumulation detected";
    action = "Follow smart money";
    confidence = "VERY HIGH";
  }

  return { insight, action, confidence };
}

// 🚀 FETCH SIGNALS
async function fetchSignals(){
  const el = document.getElementById("signals");
  el.innerHTML = `<div class="loader">Scanning markets...</div>`;

  try{
    const r = await fetch(`${API_URL}/early`);
    const d = await r.json();

    let signals = d.signals || [];

    // ✅ FILTER CHAIN
    if(selectedChain !== "all"){
      signals = signals.filter(s=>s.chain === selectedChain);
    }

    // ✅ SORT BEST FIRST
    signals.sort((a,b)=>Number(b.score)-Number(a.score));

    // ✅ FREE VS PREMIUM LOGIC
    let visible;

    if(userTier === "premium"){
      visible = signals;
    }else{
      visible = signals.slice(0,6); // show more signals
    }

    if(visible.length === 0){
      el.innerHTML = `<div class="empty">No signals found</div>`;
      return;
    }

    // 🔥 ONE FREE FULL INSIGHT (VERY IMPORTANT)
    const unlockedIndex = 0;

    const html = visible.map((s,i)=>{

      const insightData = generateInsight(s);

      const isUnlocked = userTier==="premium" || i===unlockedIndex;

      return `
      <div class="card ${Number(s.score)>60?"strong":""}">
        
        ${i===0?`<div class="top">TOP SIGNAL</div>`:""}

        <div class="token">${s.token || "Unknown"}</div>
        <div class="symbol">${s.symbol || "--"} • ${(s.chain || "").toUpperCase()}</div>

        <div class="price">${formatPrice(s.price)}</div>

        <div class="meta">
          <span>Vol ${formatNum(s.volume24h)}</span>
          <span>Score ${s.score}</span>
        </div>

        <div class="badges">
          ${s.whaleDetected?`<span class="whale">🐋 Whale</span>`:""}
          ${s.entrySignal?`<span class="entry">🚀 Entry</span>`:""}
        </div>

        <div class="insight">
          ${
            isUnlocked
            ? `
              <b>🧠 Insight:</b> ${insightData.insight}<br>
              <b>🎯 Action:</b> ${insightData.action}<br>
              <b>💎 Confidence:</b> ${insightData.confidence}
            `
            : `🔒 Unlock full signal intelligence`
          }
        </div>

      </div>
      `;
    }).join("");

    // 🔥 PREMIUM CTA
    const cta = userTier!=="premium"?`
      <div class="cta">
        <div>You are seeing limited alpha</div>
        <button onclick="window.open('${API_URL}/create-payment')">
          Unlock Smart Money
        </button>
      </div>
    `:"";

    el.innerHTML = html + cta;

  }catch(err){
    el.innerHTML = `<div class="empty">Error loading signals</div>`;
  }
}

// 🚀 INIT
async function init(){
  await fetchUser();
  await fetchSignals();
  setInterval(fetchSignals,10000);
}

init();