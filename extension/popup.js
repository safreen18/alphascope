const API = "https://alphascope-z4rz.onrender.com";

const signalsDiv = document.getElementById("signals");
const loadBtn = document.getElementById("loadSignals");
const upgradeBtn = document.getElementById("upgradeBtn");

console.log("AlphaScope popup loaded");

// USER ID
function getUserId(callback) {
  chrome.storage.local.get(["userId"], (result) => {
    if (result.userId) {
      console.log("Existing user:", result.userId);
      callback(result.userId);
    } else {
      const newId = Date.now().toString();
      chrome.storage.local.set({ userId: newId });
      console.log("New user created:", newId);
      callback(newId);
    }
  });
}

// LOAD SIGNALS
loadBtn.addEventListener("click", () => {
  console.log("Load signals clicked");

  getUserId(async (userId) => {
    try {
      signalsDiv.innerHTML = "Loading...";

      const res = await fetch(`${API}/early?userId=${userId}`);
      const data = await res.json();

      console.log("API response:", data);

      signalsDiv.innerHTML = "";

      if (!data.signals) {
        signalsDiv.innerHTML = "Invalid response";
        return;
      }

      data.signals.forEach(t => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
          <div>${t.token} (${t.symbol})</div>
          <div>${t.chain}</div>
          <div>Price: $${t.price}</div>
          <div>Liquidity: ${t.liquidity}</div>
          <div>Volume: ${t.volume24h}</div>
          <div>Whales: ${t.whaleCount}</div>
          <div>Score: ${t.score}</div>
        `;

        signalsDiv.appendChild(card);
      });

      if (data.locked) {
        signalsDiv.innerHTML += `<div style="color:orange;text-align:center;">🔒 Upgrade for full access</div>`;
      }

    } catch (err) {
      console.error("ERROR:", err);
      signalsDiv.innerHTML = "Error loading signals";
    }
  });
});

// UPGRADE
upgradeBtn.addEventListener("click", () => {
  console.log("Upgrade clicked");

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
        alert("Payment failed");
      }

    } catch (err) {
      console.error("Payment error:", err);
    }
  });
});