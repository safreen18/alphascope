const API_URL = "https://alphascope-z4rz.onrender.com";

let userTier = "free";
let selectedChain = "all";

// Helpers
function safe(v,f="--"){return v??f;}
function formatPrice(p){return !p?"--":"$"+Number(p).toFixed(6);}

// Chain buttons
document.addEventListener("click",(e)=>{
  if(e.target.classList.contains("chain-btn")){
    document.querySelectorAll(".chain-btn").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    selectedChain = e.target.dataset.chain;
    fetchSignals();
  }
});

// Fetch user
async function fetchUser(){
  try{
    const r = await fetch(`${API_URL}/user`);
    const d = await r.json();
    userTier = d.tier || "free";
  }catch{}
}

// Fetch signals
async function fetchSignals(){
  const container = document.getElementById("signals");
  container.innerHTML = "Loading...";

  try{
    const r = await fetch(`${API_URL}/early`);
    const d = await r.json();

    let signals = d.signals || [];

    // 🔥 FILTER BY CHAIN
    if(selectedChain !== "all"){
      signals = signals.filter(s=>s.chain === selectedChain);
    }

    if(signals.length === 0){
      container.innerHTML = `<div class="empty">No signals found</div>`;
      return;
    }

    signals.sort((a,b)=>b.score-a.score);

    let visible = userTier==="premium" ? signals : signals.slice(0,2);

    const html = visible.map(s=>`
      <div class="card">
        <div class="token">${safe(s.token)}</div>
        <div class="symbol">${safe(s.symbol)} • ${safe(s.chain)}</div>
        <div class="price">${formatPrice(s.price)}</div>
        <div class="meta">
          <span>Vol: ${safe(s.volume)}</span>
          <span>Score: ${safe(s.score)}</span>
        </div>
        ${
          userTier==="premium"
          ? `<div>📊 Active</div>`
          : `<div style="color:red">🔒 Locked</div>`
        }
      </div>
    `).join("");

    const cta = userTier!=="premium" ? `
      <div class="overlay">
        Unlock Full Signals
        <button onclick="window.open('${API_URL}/create-payment')">
          Upgrade
        </button>
      </div>
    ` : "";

    container.innerHTML = html + cta;

  }catch(err){
    container.innerHTML = `<div class="empty">⚠️ Failed to load data</div>`;
  }
}

// Init
async function init(){
  await fetchUser();
  await fetchSignals();
  setInterval(fetchSignals,10000);
}

init();