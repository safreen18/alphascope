const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = "https://alphascope-z4rz.onrender.com/early";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Premium users Telegram IDs
const premiumUsers = new Set([/* Add premium Telegram IDs here */]);

let previousSignals = new Set();

// Use actual emojis here, not Unicode escapes
const EMOJIS = {
    whale: "🐋",
    early: "💎",
    spike: "⚡"
};

// Fetch signals from backend
async function fetchSignals() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        return data.signals || [];
    } catch(err) {
        console.error("Error fetching signals:", err);
        return [];
    }
}

// Build message text for a signal
function buildSignalText(signal) {
    let badges = "";
    if(signal.whale) badges += `${EMOJIS.whale} WHALE `;
    if(signal.early) badges += `${EMOJIS.early} EARLY `;
    if(signal.spike) badges += `${EMOJIS.spike} SPIKE `;
    return `🚀 ${signal.token} (${signal.symbol})
💰 Price: $${signal.price}
📊 Score: ${signal.score} | 🔥 Strength: ${signal.strength}
${badges}`;
}

// Send new signals to users
async function sendSignals(signals) {
    const newSet = new Set();
    const newSignals = [];

    signals.forEach(signal => {
        const id = signal.token + signal.price;
        newSet.add(id);
        if(!previousSignals.has(id)) newSignals.push(signal);
    });

    previousSignals = newSet;

    for(const signal of newSignals) {
        const message = buildSignalText(signal);
        for(const userId of premiumUsers) {
            try { await bot.sendMessage(userId, message); } 
            catch(err) { console.error("Telegram send error:", err); }
        }
    }

    if(newSignals.length > 0) sendLeaderboardDigest(signals);
}

// Top 3 Hot Tokens digest
async function sendLeaderboardDigest(signals) {
    const topSignals = [...signals]
        .sort((a,b)=>{
            if(b.spike && !a.spike) return 1;
            if(a.spike && !b.spike) return -1;
            return (b.score || 0) - (a.score || 0);
        })
        .slice(0,3);

    let message = "🏆 Top 3 Hot Tokens\n\n";

    topSignals.forEach((signal,index)=>{
        let badges = "";
        if(signal.whale) badges += `${EMOJIS.whale} `;
        if(signal.early) badges += `${EMOJIS.early} `;
        if(signal.spike) badges += `${EMOJIS.spike} `;
        message += `${index+1}. ${signal.token} (${signal.symbol}) ${badges}\nPrice: $${signal.price} | Score: ${signal.score} | Strength: ${signal.strength}\n\n`;
    });

    for(const userId of premiumUsers) {
        try { await bot.sendMessage(userId, message); }
        catch(err) { console.error("Telegram leaderboard send error:", err); }
    }
}

// Poll backend every 12 seconds
setInterval(async ()=>{
    const signals = await fetchSignals();
    await sendSignals(signals);
}, 12000);

// Simple /start command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🚀 Welcome to AlphaScope Premium Signals! You will receive Whale/Early/Spike alerts and Top 3 Hot Tokens leaderboard automatically.");
});