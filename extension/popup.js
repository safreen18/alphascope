const API = "https://alphascope-z4rz.onrender.com";

const signalsDiv = document.getElementById("signals");
const loadBtn = document.getElementById("loadSignals");
const upgradeBtn = document.getElementById("upgradeBtn");
const walletBtn = document.getElementById("wallet");
const trendBtn = document.getElementById("trend");

// -------------------------
// USER ID (PERSISTENT)
// -------------------------
function getUserId(callback) {
  chrome.storage.local.get(["userId"], (result) => {
    if (result.userId) {
      callback(result.userId);
    } else {
      const newId = Date.now().toString();
      chrome.storage.local.set({ userId: newId });
      callback(newId);
    }
  });
}

// -------------------------
// LOAD SIGNALS
// -------------------------
loadBtn.addEventListener("click", () => {
  getUserId(async (userId) => {
    signalsDiv.innerHTML = "Loading signals...";

    try {
      const res = await fetch(`${API}/early?userId=${userId}`);
      const data = await res.json();

      signalsDiv.innerHTML = "";

      if (!data.signals || data.signals.length === 0) {
        signalsDiv.innerHTML = "No signals found.";
        return;
      }

      data.signals.forEach(t => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
          <div class="token">${t.token} (${t.symbol})</div>
          <div class="chain">${t.chain}</div>

          <div>💰 Price: $${t.price}</div>
          <div>💧 Liquidity: ${t.liquidity}</div>
          <div>📊 Volume: ${t.volume24h}</div>

          <div>🐋 Whales: ${t.whaleCount}</div>
          <div>⭐ Score: ${t.score}</div>
          <div>🎯 Confidence: ${t.confidence}</div>
        `;

        signalsDiv.appendChild(card);
      });

      // 🔒 LOCK MESSAGE
      if (data.locked) {
        const lock = document.createElement("div");
        lock.innerHTML = `
          <div style="text-align:center;margin-top:10px;color:#f59e0b;">
            🔒 Unlock Premium for full signals
          </div>
        `;
        signalsDiv.appendChild(lock);
      }

    } catch (err) {
      console.error(err);
      signalsDiv.innerHTML = "Error loading signals.";
    }
  });
});

// -------------------------
// UPGRADE BUTTON (FIXED)
// -------------------------
upgradeBtn.addEventListener("click", () => {
  getUserId(async (userId) => {
    try {
      const res = await fetch(`${API}/create-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId })
      });

      const data = await res.json();

      console.log("Payment response:", data);

      if (data.invoice_url) {
        chrome.tabs.create({ url: data.invoice_url });
      } else {
        alert("Payment failed. Try again.");
      }

    } catch (err) {
      console.error("Payment error:", err);
      alert("Error initiating payment.");
    }
  });
});

// -------------------------
// WALLET BUTTON (TEMP UI)
// -------------------------
walletBtn.addEventListener("click", () => {
  signalsDiv.innerHTML = `
    <div style="text-align:center;margin-top:20px;">
      🐋 Wallet Tracking Coming Soon
    </div>
  `;
});

// -------------------------
// TREND BUTTON (TEMP UI)
// -------------------------
trendBtn.addEventListener("click", () => {
  signalsDiv.innerHTML = `
    <div style="text-align:center;margin-top:20px;">
      📈 Trending Tokens Coming Soon
    </div>
  `;
});