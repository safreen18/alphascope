const API_URL = "https://alphascope-z4rz.onrender.com/early";

let previousSignals = new Set();
let signalHistory = JSON.parse(localStorage.getItem("signalHistory") || "[]");
let firstLoad = true;
let alertedSignals = new Set();

const liveContainer = document.getElementById("liveSignals");
const recentContainer = document.getElementById("recentSignals");
const leaderboardContainer = document.getElementById("hotLeaderboard");
const loader = document.getElementById("loader");
const scanBtn = document.getElementById("scanBtn");

const strengthPriority = { HIGH:3, MEDIUM:2, LOW:1 };
const alertAudio = new Audio("https://freesound.org/data/previews/316/316847_4939433-lq.mp3");

// Emojis
const EMOJIS = { whale:"🐋", early:"💎", spike:"⚡" };

// Fetch signals
async function fetchSignals(manual=false){
    try{
        loader.innerText = manual ? "🔍 Scanning market..." : "🔄 Live scanning...";
        const res = await fetch(API_URL);
        const data = await res.json();
        let signals = data.signals || [];
        signals.sort((a,b) => (strengthPriority[b.strength]||0) - (strengthPriority[a.strength]||0));
        processSignals(signals);
    }catch(err){
        loader.innerText = "❌ Error fetching signals";
        console.error(err);
    }
}

// Process signals + render leaderboard/live/recent
function processSignals(signals){
    loader.innerText = "";
    const newSet = new Set();
    const newSignals = [];

    signals.forEach(signal=>{
        const id = signal.token + signal.price;
        newSet.add(id);
        const isNew = !previousSignals.has(id) && !firstLoad;

        if(isNew){
            signal.timestamp = Date.now();
            signalHistory.unshift(signal);
            newSignals.push(id);
            if((signal.strength==="HIGH"||signal.strength==="MEDIUM"||signal.spike) && !alertedSignals.has(id)){
                triggerAlert(signal);
                alertedSignals.add(id);
            }
        }
    });

    signalHistory = signalHistory.slice(0,20);
    localStorage.setItem("signalHistory", JSON.stringify(signalHistory));

    renderLeaderboard(signals);
    renderLive(signals,newSignals);
    renderRecent();

    previousSignals = newSet;
    firstLoad = false;
}

// Browser alert + sound
function triggerAlert(signal){
    if(Notification.permission==="granted"){
        new Notification(`🚀 AlphaScope Alert`,{
            body:`${signal.token} (${signal.symbol}) | Price:$${signal.price} | Strength:${signal.strength}${signal.spike?" | ⚡ Spike":""} ${signal.whale?"| 🐋 Whale":""} ${signal.early?"| 💎 Early":""}`,
            icon:"https://i.imgur.com/3ZQ3VQH.png"
        });
    } else if(Notification.permission!=="denied"){ Notification.requestPermission(); }
    alertAudio.play().catch(e=>console.log("Audio error:",e));
}

// Render leaderboard Top 3
function renderLeaderboard(signals) {
    const topSignals = [...signals]
        .sort((a,b)=>{
            if(b.spike && !a.spike) return 1;
            if(a.spike && !b.spike) return -1;
            return (b.score||0) - (a.score||0);
        })
        .slice(0,3);

    leaderboardContainer.innerHTML = "";
    topSignals.forEach((signal,index)=>{
        const card = document.createElement("div");
        card.className = "card high";
        if(index===0) card.style.boxShadow="0 0 15px rgba(239,68,68,0.9)";
        let badges = "";
        if(signal.whale) badges += "🐋 WHALE ";
        if(signal.early) badges += "💎 EARLY ";
        if(signal.spike) badges += "⚡ SPIKE ";
        card.innerHTML = `
            <div class="token">${signal.token} (${signal.symbol}) ${badges}</div>
            <div class="meta">💰 Price: $${signal.price}</div>
            <div class="meta">📊 Score: ${signal.score} | 🔥 Strength: ${signal.strength}</div>
        `;
        leaderboardContainer.appendChild(card);
    });
}

// Render live
function renderLive(signals,newSignals){
    liveContainer.innerHTML = "";
    signals.forEach(signal=>{
        const id = signal.token+signal.price;
        const isNew = newSignals.includes(id);
        const card = createCard(signal,isNew,false);
        liveContainer.appendChild(card);
    });
}

// Render recent
function renderRecent(){
    recentContainer.innerHTML = "";
    signalHistory.forEach(signal=>{
        const card = createCard(signal,false,true);
        recentContainer.appendChild(card);
    });
}

// Card builder
function createCard(signal,isNew,isRecent){
    const card = document.createElement("div");
    let strengthClass = (signal.strength||"low").toLowerCase();
    card.className = `card ${strengthClass}`;
    if(isNew) card.classList.add("new");
    if(isRecent) card.classList.add("recent");

    let badges = "";
    if(signal.whale) badges += "🐋 WHALE ";
    if(signal.early) badges += "💎 EARLY ";
    if(signal.spike) badges += "⚡ SPIKE ";

    card.innerHTML = `
      <div class="token">${signal.token} (${signal.symbol}) ${badges}</div>
      <div class="meta">💰 Price: $${signal.price}</div>
      <div class="meta">💧 Liquidity: $${signal.liquidity}</div>
      <div class="meta">📊 Volume: $${signal.volume}</div>
      <div class="meta">⚡ Score: ${signal.score} | 🔥 Strength: <span class="strength ${strengthClass}">${signal.strength}</span></div>
      ${isNew?'<div class="new-badge">NEW</div>':''}
    `;
    return card;
}

// Auto-refresh
function startLiveFeed(){ fetchSignals(); setInterval(fetchSignals,12000); }
scanBtn.addEventListener("click",()=>fetchSignals(true));
startLiveFeed();