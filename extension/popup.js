const API = "https://alphascope-z4rz.onrender.com";
const userId = Date.now().toString();

document.getElementById("earlyBtn").onclick = loadSignals;
document.getElementById("upgradeBtn").onclick = upgradeUser;

// =========================
// LOAD SIGNALS (PREMIUM UI)
// =========================
async function loadSignals() {
  const output = document.getElementById("output");
  output.innerHTML = "Loading...";

  try {
    const userRes = await fetch(`${API}/user?userId=${userId}`);
    const user = await userRes.json();

    if (user.tier !== "premium") {
      output.innerHTML = "🚫 Upgrade to Premium to unlock signals";
      return;
    }

    const res = await fetch(`${API}/early`);
    const data = await res.json();

    if (!data.signals.length) {
      output.innerHTML = "No signals right now...";
      return;
    }

    output.innerHTML = "";

    data.signals.forEach(token => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="token">${token.name} (${token.symbol})</div>
        <div class="meta">💰 Price: $${token.price}</div>
        <div class="meta">⚡ Spike: ${token.spike}x</div>
        <div class="meta">⏱ Age: ${token.age} min</div>
        <div class="score">🧠 Score: ${token.score}/100</div>
      `;

      output.appendChild(card);
    });

  } catch (err) {
    output.innerHTML = "Error loading signals";
  }
}

// =========================
// UPGRADE FLOW
// =========================
async function upgradeUser() {
  try {
    const res = await fetch(`${API}/create-payment?userId=${userId}`);
    const data = await res.json();

    if (data.payment_url) {
      chrome.tabs.create({ url: data.payment_url });
    }
  } catch (err) {
    document.getElementById("output").innerHTML = "Payment error";
  }
}