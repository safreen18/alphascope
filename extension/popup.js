const API_URL = "https://alphascope-z4rz.onrender.com";

let mode = "live";

// FETCH
async function fetchDaily(){
  const r = await fetch(`${API_URL}/daily`);
  return await r.json();
}

async function fetchLive(){
  const r = await fetch(`${API_URL}/early`);
  const d = await r.json();
  return d.signals || [];
}

async function fetchHistory(){
  const r = await fetch(`${API_URL}/history`);
  const d = await r.json();
  return d.history || [];
}

// CLICK
function openChart(s){
  const url = `https://dexscreener.com/${s.chain}/${s.pairAddress}`;
  window.open(url);
}

// RENDER
async function render(){

  const el = document.getElementById("content");
  el.innerHTML = "Loading...";

  const daily = await fetchDaily();

  // 📊 DASHBOARD
  let dashboard = `
    <div style="padding:12px;border-radius:12px;background:#0f172a;margin-bottom:12px;">
      📊 <b>Today’s Performance</b><br><br>
      💰 Total: <b>${daily.totalPnl}%</b><br>
      🎯 Win Rate: <b>${daily.winRate}%</b><br>
      🔥 Best Trade: <b>+${daily.best}%</b><br>
      📈 Signals: <b>${daily.total}</b>
    </div>
  `;

  if(mode === "live"){
    const signals = await fetchLive();

    el.innerHTML = dashboard + signals.map((s,i)=>`
      <div class="card" onclick='openChart(${JSON.stringify(s)})' style="cursor:pointer">
        <b>${s.token}</b> (${s.symbol})<br>
        ${s.chain.toUpperCase()}<br>
        📈 <span style="color:${s.isWin?"#00ffd5":"#ef4444"}">${s.pnl}%</span>
      </div>
    `).join("");
  }

  if(mode === "history"){
    const history = await fetchHistory();

    el.innerHTML = dashboard + history.map(h=>`
      <div class="card">
        🔥 ${h.token} (${h.symbol})<br>
        📈 +${h.pnl}%
      </div>
    `).join("");
  }
}

// INIT
render();
setInterval(render,10000);