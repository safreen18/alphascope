const API_URL = "https://alphascope-z4rz.onrender.com";

let userTier="free";

// helpers
function formatNum(n){
  if(!n) return "--";
  if(n>1e6) return (n/1e6).toFixed(1)+"M";
  if(n>1e3) return (n/1e3).toFixed(1)+"K";
  return n;
}

// user
async function fetchUser(){
  const r=await fetch(`${API_URL}/user`);
  const d=await r.json();
  userTier=d.tier||"free";
}

// signals
async function fetchSignals(){
  const el=document.getElementById("signals");
  el.innerHTML="Discovering smart wallets...";

  const r=await fetch(`${API_URL}/early`);
  const d=await r.json();

  const signals=d.signals||[];

  if(signals.length===0){
    el.innerHTML=`<div class="empty">No smart money yet</div>`;
    return;
  }

  const visible=userTier==="premium"?signals:signals.slice(0,3);

  const html=visible.map(s=>`
    <div class="card strong">

      <div class="token">${s.token}</div>
      <div class="symbol">${s.symbol} • AUTO DISCOVERED</div>

      <div class="price">🔥 Smart Wallet Entry</div>

      <div class="meta">
        <span>${formatNum(s.volume24h)}</span>
        <span>Score ${s.score}</span>
      </div>

      <div class="insight-box">
        ${
          userTier==="premium"
          ? `
          Wallet: ${s.wallet}<br>
          TX: ${s.txHash.slice(0,10)}...
          `
          : "🔒 Unlock wallet intelligence"
        }
      </div>

    </div>
  `).join("");

  const cta=userTier!=="premium"?`
    <div class="overlay">
      Auto-discovered whales locked
      <button onclick="window.open('${API_URL}/create-payment')">
        Unlock Alpha
      </button>
    </div>
  `:"";

  el.innerHTML=html+cta;
}

// init
async function init(){
  await fetchUser();
  await fetchSignals();
  setInterval(fetchSignals,15000);
}

init();