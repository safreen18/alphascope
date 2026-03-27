const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = "https://alphascope-z4rz.onrender.com/early";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const premiumUsers = new Set([/* add IDs */]);

let previousSignals = new Set();

const EMOJIS = { whale:"🐋", early:"💎", spike:"⚡", rocket:"🚀", trophy:"🏆", fire:"🔥", money:"💰", chart:"📊", clock:"🕒" };

async function fetchSignals(){ try{ const res = await fetch(API_URL); const data = await res.json(); return data.signals||[]; }catch(e){ console.error(e); return []; } }

function buildSignalText(signal){ 
    let badges=""; if(signal.whale) badges+=`${EMOJIS.whale} WHALE `; if(signal.early) badges+=`${EMOJIS.early} EARLY `; if(signal.spike) badges+=`${EMOJIS.spike} SPIKE `;
    return `${EMOJIS.rocket} ${signal.token} (${signal.symbol}) [${signal.chain}]
💰 Price: $${signal.price}
📊 Score: ${signal.score} | 🔥 Strength: ${signal.strength}
${badges}`; 
}

async function sendSignals(signals){ 
    const newSet=new Set(); const newSignals=[];
    signals.forEach(signal=>{ const id=signal.token+signal.price+signal.chain; newSet.add(id); if(!previousSignals.has(id)) newSignals.push(signal); });
    previousSignals=newSet;
    for(const s of newSignals){ const msg=buildSignalText(s); for(const u of premiumUsers){ try{ await bot.sendMessage(u,msg); }catch(e){console.error(e);} } }
    if(newSignals.length>0) sendLeaderboardDigest(signals);
}

async function sendLeaderboardDigest(signals){
    const topSignals=[...signals].sort((a,b)=>{ if(b.spike&&!a.spike) return 1; if(a.spike&&!b.spike) return -1; return (b.score||0)-(a.score||0); }).slice(0,3);
    let msg=`${EMOJIS.trophy} Top 3 Hot Tokens\n\n`;
    topSignals.forEach((s,i)=>{ let badges=""; if(s.whale) badges+=`${EMOJIS.whale} `; if(s.early) badges+=`${EMOJIS.early} `; if(s.spike) badges+=`${EMOJIS.spike} `; msg+=`${i+1}. ${s.token} (${s.symbol}) [${s.chain}] ${badges}\n💰 Price: $${s.price} | 📊 Score: ${s.score} | 🔥 Strength: ${s.strength}\n\n`; });
    for(const u of premiumUsers){ try{ await bot.sendMessage(u,msg); }catch(e){console.error(e);} }
}

setInterval(async ()=>{ const signals=await fetchSignals(); await sendSignals(signals); },12000);

bot.onText(/\/start/, msg=>{ bot.sendMessage(msg.chat.id, `${EMOJIS.rocket} Welcome to AlphaScope Premium Signals!
You will receive Whale / Early / Spike alerts for all chains (ETH, BSC, SOL)
and Top 3 Hot Tokens leaderboard automatically.`); });