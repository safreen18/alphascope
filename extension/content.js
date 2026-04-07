const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "SIGNALS_UPDATE") {
    window.postMessage({
      type: "ALPHASCOPE_UPDATE",
      payload: data.data
    }, "*");
  }
};