const API_URL = "https://alphascope-z4rz.onrender.com";

let selectedChain = "all";
let userTier = "free";

// format
function formatNum(n){
  if(!n) return "--";
  if(n>1e6) return (n/1e6).toFixed(1)+"M";
  if(n>1e3) return (n/1e3).toFixed(1)+"K";
  return n;
}

// fetch user
async function fetchUser(){
  const r = await fetch(`${API_URL}/user`);
  const d = await r.json();
  userTier = d.tier || "free";
}

// chain click
document.addEventListener("click",(e)=>{
  if(e.target.classList.contains("chain-btn")){
    document.querySelectorAll(".chain-btn").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    selectedChain = e.target.dataset.chain;
    fetchSignals();
  }
});

// fetch signals
async function fetchSignals(){
  const el = document.getElementById("signals");

  el.innerHTML = `<div class="loader">Scanning markets...</div>`;

  const r = await fetch(`${API_URL}/early`);
  const d = await r.json();

  let signals = d.signals || [];

  if(selectedChain !== "all"){
    signals = signals.filter(s=>s.chain === selectedChain);
  }

  signals.sort((a,b)=>b.score - a.score);

  let visible = userTier === "premium"
    ? signals
    : signals.slice(0,3);

  if(visible.length === 0){
    el.innerHTML = `<div class="empty">No signals found</div>`;
    return;
  }

  const html = visible.map((s,i)=>`
    <div class="card ${s.score>60?"strong":""}">
      
      ${i===0?`<div class="top">TOP SIGNAL</div>`:""}

      <div class="token">${s.token}</div>
      <div class="symbol">${s.symbol} • ${s.chain.toUpperCase()}</div>

      <div class="price">$${Number(s.price).toFixed(6)}</div>

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
          userTier==="premium"
          ? "Strong early momentum + whale activity detected"
          : "🔒 Unlock premium insight"
        }
      </div>

    </div>
  `).join("");

  const cta = userTier!=="premium"?`
    <div class="cta">
      Unlock full smart money signals
      <button onclick="window.open('${API_URL}/create-payment')">
        Upgrade
      </button>
    </div>
  `:"";

  el.innerHTML = html + cta;
}

// init
async function init(){
  await fetchUser();
  await fetchSignals();
  setInterval(fetchSignals,10000);
}

init();