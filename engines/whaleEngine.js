const axios = require("axios");

// ----------------------------
// CONFIG
// ----------------------------
const RPC_URL = process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY";

// tracked wallets (smart money seeds)
const SEED_WALLETS = [
  "0x28C6c06298d514Db089934071355E5743bf21d60", // Binance
  "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549", // Binance hot
];

// ----------------------------
// STATE
// ----------------------------
const nodes = new Map(); // wallet -> node
const edges = [];

// ----------------------------
// RPC CALL
// ----------------------------
async function rpc(method, params) {
  try {
    const res = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    });

    return res.data.result;
  } catch (e) {
    return null;
  }
}

// ----------------------------
// GET LATEST BLOCK
// ----------------------------
async function getLatestBlock() {
  return await rpc("eth_blockNumber", []);
}

// ----------------------------
// GET BLOCK TXS (CORE FLOW ENGINE)
// ----------------------------
async function getBlock(blockNumber) {
  const block = await rpc("eth_getBlockByNumber", [
    blockNumber,
    true
  ]);

  return block;
}

// ----------------------------
// PROCESS TRANSFERS
// ----------------------------
function processTx(tx) {
  if (!tx || !tx.from || !tx.to) return;

  const from = tx.from.toLowerCase();
  const to = tx.to.toLowerCase();

  const value = parseInt(tx.value || "0x0", 16) / 1e18;

  if (value === 0) return;

  // NODE: FROM
  if (!nodes.has(from)) {
    nodes.set(from, {
      id: from,
      inflow: 0,
      outflow: 0,
      type: "wallet"
    });
  }

  // NODE: TO
  if (!nodes.has(to)) {
    nodes.set(to, {
      id: to,
      inflow: 0,
      outflow: 0,
      type: "wallet"
    });
  }

  nodes.get(from).outflow += value;
  nodes.get(to).inflow += value;

  edges.push({
    source: from,
    target: to,
    value,
    timestamp: Date.now()
  });
}

// ----------------------------
// SCAN BLOCK (REAL FLOW)
// ----------------------------
async function scanLatestBlock() {
  const latest = await getLatestBlock();
  if (!latest) return;

  const block = await getBlock(latest);

  if (!block || !block.transactions) return;

  for (const tx of block.transactions) {
    processTx(tx);
  }

  console.log("🧠 scanned block:", latest);
}

// ----------------------------
// SMART SCORE ENGINE
// ----------------------------
function computeScores() {
  for (const node of nodes.values()) {
    node.score = node.inflow - node.outflow;
    node.label =
      node.score > 10 ? "SMART MONEY IN" :
      node.score < -10 ? "DISTRIBUTION" :
      "NEUTRAL";
  }
}

// ----------------------------
// MAIN LOOP
// ----------------------------
async function startIndexer() {
  console.log("🔥 SMART MONEY FLOW ENGINE LIVE");

  setInterval(async () => {
    await scanLatestBlock();
    computeScores();
  }, 6000);
}

// ----------------------------
// GRAPH OUTPUT
// ----------------------------
function getGraph() {
  return {
    nodes: Array.from(nodes.values()),
    links: edges.slice(-500) // last 500 flows
  };
}

module.exports = {
  startIndexer,
  getGraph
};