const API_URL = "https://alphascope-z4rz.onrender.com";

let mode = "live";

// SWITCH
document.getElementById("liveBtn").onclick = ()=>{
  mode = "live";
  render();
};

document.getElementById("historyBtn").onclick = ()=>{
  mode = "history";
  render();
};

// FETCH LIVE
async function fetchLive(){
  const r = await fetch(`${API_URL}/early`);
  const d = await r.json();
  return d.signals || [];
}

// FETCH HISTORY
async function fetchHistory(){
  const r = await fetch(`${API_URL}/history`);
  const d = await r.json();
  return d.history || [];
}

// RENDER
async function render(){

  const el = document.getElementById("content");

  if(mode === "live"){
    el.innerHTML = "Loading...";
    const signals = await fetchLive();

    el.innerHTML = signals.map(s=>`
      <div class="card">
        <b>${s.token}</b> (${s.symbol})<br>
        ${s.chain.toUpperCase()}<br>
        PnL: <span class="${s.isWin?'win':''}">${s.pnl}%</span>
      </div>
    `).join("");
  }

  if(mode === "history"){
    el.innerHTML = "Loading...";
    const history = await fetchHistory();

    el.innerHTML = history.map(h=>`
      <div class="card">
        🔥 ${h.token} (${h.symbol})<br>
        ${h.chain.toUpperCase()}<br>
        📈 <span class="win">+${h.pnl}%</span>
      </div>
    `).join("");
  }
}

// INIT
render();