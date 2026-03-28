const API_URL = "https://alphascope-z4rz.onrender.com";

let seenSignals = new Set();

// ⏱ CHECK EVERY 15 SECONDS
chrome.alarms.create("signalCheck", { periodInMinutes: 0.25 });

// FETCH SIGNALS
async function fetchSignals(){
  try{
    const res = await fetch(`${API_URL}/early`);
    const data = await res.json();

    const signals = data.signals || [];

    signals.forEach(s => {

      const id = s.pairAddress;

      if(!seenSignals.has(id)){
        seenSignals.add(id);

        sendNotification(s);
      }

    });

  }catch(e){
    console.log("Error fetching signals", e);
  }
}

// 🔔 SEND NOTIFICATION
function sendNotification(s){

  const url = `https://dexscreener.com/${s.chain}/${s.pairAddress}`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: `🚨 ${s.symbol} (${s.chain.toUpperCase()})`,
    message: `🔥 New Smart Money Signal\nScore: ${s.score}\nClick to view chart`,
    priority: 2
  }, (notificationId) => {

    // CLICK HANDLER
    chrome.notifications.onClicked.addListener(() => {
      chrome.tabs.create({ url });
    });

  });
}

// RUN ON ALARM
chrome.alarms.onAlarm.addListener((alarm) => {
  if(alarm.name === "signalCheck"){
    fetchSignals();
  }
});

// INITIAL RUN
fetchSignals();