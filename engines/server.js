const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * ROOT
 */
app.get("/", (req, res) => {
  res.send("✅ AlphaScope Server Running");
});

/**
 * GRAPH
 */
app.get("/graph", (req, res) => {
  res.json({
    nodes: [
      { id: "0xAAA", score: 90, label: "SMART MONEY IN", token: "ETH", whale: true },
      { id: "0xBBB", score: -70, label: "DISTRIBUTION", token: "PEPE" }
    ],
    links: [
      { source: "0xAAA", target: "0xBBB" }
    ]
  });
});

/**
 * SIGNALS
 */
app.get("/signals", (req, res) => {
  res.json({
    signals: [
      { type: "BUY", token: "ETH", reason: "Test signal working" }
    ]
  });
});

/**
 * COPY FEED
 */
app.get("/copy-feed", (req, res) => {
  res.json({
    trades: [
      {
        type: "BUY",
        token: "ETH",
        value: 1000,
        from: "0xAAA",
        to: "0xBBB"
      }
    ]
  });
});

/**
 * WALLET STATS
 */
app.get("/wallet-stats", (req, res) => {
  res.json({
    stats: [
      { wallet: "0xAAA", pnl: "120.5", trades: 3 }
    ]
  });
});

/**
 * FOLLOW
 */
app.post("/follow", (req, res) => {
  res.json({ success: true });
});

/**
 * START SERVER
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});