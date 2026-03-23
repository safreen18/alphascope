const API = "https://alphascope-z4rz.onrender.com";
const userId = "1710140755";

// BUTTONS
document.getElementById("earlyBtn").onclick = loadEarly;
document.getElementById("walletBtn").onclick = loadWallet;
document.getElementById("trendBtn").onclick = loadTrend;
document.getElementById("upgradeBtn").onclick = upgradeUser;

// =========================
// EARLY SIGNALS
// =========================
async function loadEarly() {
  document.getElementById("output").innerText = "Loading signals...";

  try {
    const userRes = await fetch(`${API}/user?userId=${userId}`);
    const user = await userRes.json();

    if (user.tier !== "premium") {
      document.getElementById("output").innerText =
        "🚫 Upgrade to Premium to access signals";
      return;
    }

    const res = await fetch(`${API}/early`);
    const data = await res.json();

    if (!data.signals || data.signals.length === 0) {
      document.getElementById("output").innerText = "No signals found";
      return;
    }

    let text = "🚀 EARLY SIGNALS\n\n";

    data.signals.forEach(token => {
      text += `${token.name} (${token.symbol})\n`;
      text += `Price: $${token.price}\n`;
      text += `1H: ${token.change_1h}%\n\n`;
    });

    document.getElementById("output").innerText = text;

  } catch (err) {
    document.getElementById("output").innerText = "Error loading signals";
  }
}

// =========================
// WALLET TRACKER (DUMMY)
// =========================
function loadWallet() {
  document.getElementById("output").innerText =
    "👛 Wallet tracking coming soon...";
}

// =========================
// TRENDING (DUMMY)
// =========================
function loadTrend() {
  document.getElementById("output").innerText =
    "📈 Trending tokens coming soon...";
}

// =========================
// UPGRADE FLOW
// =========================
async function upgradeUser() {
  document.getElementById("output").innerText = "Creating payment...";

  try {
    const res = await fetch(`${API}/create-payment?userId=${userId}`);
    const data = await res.json();

    if (data.payment_url) {
      chrome.tabs.create({ url: data.payment_url });
    } else {
      document.getElementById("output").innerText = "Payment failed";
    }

  } catch (err) {
    document.getElementById("output").innerText = "Error creating payment";
  }
}