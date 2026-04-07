const axios = require("axios");

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// =========================
// ALERT FORMATTER
// =========================
function formatSignal(s) {
  return `
🚨 INSTITUTIONAL SIGNAL 🚨

Token: ${s.symbol}
Score: ${s.score}
Classification: ${s.classification}

📊 Volume: ${Math.floor(s.volume24h)}
💧 Liquidity: ${Math.floor(s.liquidity)}

🐋 Whale Score: ${s.whaleScore}

⚡ AlphaScope AI DETECTED ENTRY ZONE
`;
}

// =========================
// SEND TELEGRAM ALERT
// =========================
async function sendTelegramAlert(signal) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) return;

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: formatSignal(signal)
      }
    );
  } catch (e) {
    console.error("Telegram error:", e.message);
  }
}

module.exports = { sendTelegramAlert };