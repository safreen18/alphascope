const API = "https://alphascope-z4rz.onrender.com";

const signalsDiv = document.getElementById("signals");
const loadBtn = document.getElementById("loadSignals");
const upgradeBtn = document.getElementById("upgradeBtn");

function getUserId(cb) {
  chrome.storage.local.get(["userId"], (res) => {
    if (res.userId) cb(res.userId);
    else {
      const id = Date.now().toString();
      chrome.storage.local.set({ userId: id });
      cb(id);
    }
  });
}

function renderTable(data) {
  let html = `
    <div class="row header">
      <div>Token</div>
      <div>Chain</div>
      <div>Liquidity</div>
      <div>Volume</div>
      <div>Score</div>
    </div>
  `;

  data.forEach((t, i) => {
    const hot = i === 0 ? "hot" : "";

    html += `
      <div class="row data ${hot}">
        <div class="token">${t.symbol}</div>
        <div>${t.chain}</div>
        <div>$${t.liquidity}</div>
        <div>$${t.volume24h}</div>
        <div class="${t.confidence}">${t.score}</div>
      </div>
    `;
  });

  return html;
}

loadBtn.addEventListener("click", () => {
  getUserId(async (userId) => {
    signalsDiv.innerHTML = "Scanning...";

    const res = await fetch(`${API}/early?userId=${userId}`);
    const data = await res.json();

    if (!data.signals.length) {
      signalsDiv.innerHTML = "No signals.";
      return;
    }

    signalsDiv.innerHTML = renderTable(data.signals);

    if (data.locked) {
      signalsDiv.innerHTML += `
        <div class="lock">Upgrade to unlock full signals</div>
      `;
    }
  });
});

upgradeBtn.addEventListener("click", async () => {
  getUserId(async (userId) => {
    const res = await fetch(`${API}/create-payment`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ userId })
    });

    const data = await res.json();

    if (data.invoice_url) {
      chrome.tabs.create({ url: data.invoice_url });
    }
  });
});