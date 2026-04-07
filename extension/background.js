let latestSignals = [];

const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "SIGNALS_UPDATE") {
    latestSignals = data.data;
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_SIGNALS") {
    sendResponse({ signals: latestSignals });
  }
});