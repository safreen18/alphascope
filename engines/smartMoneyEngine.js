const { getRecentTransactions } = require("./tokenService");

/**
 * MAIN ENGINE
 */
async function getSmartMoneyGraph() {
  try {
    const txs = await getRecentTransactions();

    if (!txs || txs.length === 0) return null;

    const wallets = {};
    const links = [];

    txs.forEach(tx => {
      const from = tx.from;
      const to = tx.to;
      const value = parseFloat(tx.value || 0);

      if (!wallets[from]) wallets[from] = baseWallet();
      if (!wallets[to]) wallets[to] = baseWallet();

      wallets[from].outflow += value;
      wallets[to].inflow += value;

      wallets[from].txCount++;
      wallets[to].txCount++;

      if (value > 20) {
        wallets[from].whale = true;
        wallets[to].whale = true;
      }

      links.push({ source: from, target: to, value });
    });

    const nodes = Object.keys(wallets).map(wallet => {
      const w = wallets[wallet];

      const score = calculateScore(w);
      const label = classifyWallet(score);
      const cluster = detectCluster(wallet, links);

      return {
        id: wallet,
        inflow: w.inflow,
        outflow: w.outflow,
        score,
        label,
        txCount: w.txCount,
        whale: w.whale,
        cluster,
        token: detectToken(score)
      };
    });

    return { nodes, links };

  } catch (err) {
    console.error("Smart money error:", err);
    return null;
  }
}

/**
 * SIGNAL ENGINE (AI LAYER)
 */
async function getSignals() {
  const graph = await getSmartMoneyGraph();
  if (!graph) return [];

  const signals = [];

  graph.nodes.forEach(node => {
    if (node.whale && node.score > 80) {
      signals.push({
        type: "BUY",
        wallet: node.id,
        token: node.token,
        strength: node.score,
        reason: "Whale accumulation detected"
      });
    }

    if (node.score < -80) {
      signals.push({
        type: "SELL",
        wallet: node.id,
        token: node.token,
        strength: Math.abs(node.score),
        reason: "Distribution detected"
      });
    }

    if (node.cluster > 3 && node.score > 30) {
      signals.push({
        type: "WATCH",
        wallet: node.id,
        token: node.token,
        strength: node.cluster,
        reason: "Cluster accumulation forming"
      });
    }
  });

  return signals.slice(0, 10);
}

/**
 * BASE WALLET
 */
function baseWallet() {
  return {
    inflow: 0,
    outflow: 0,
    txCount: 0,
    whale: false
  };
}

/**
 * SCORE CALCULATION (CORE EDGE)
 */
function calculateScore(w) {
  return (
    w.inflow * 1.5 -
    w.outflow * 1.2 +
    w.txCount * 5 +
    (w.whale ? 50 : 0)
  );
}

/**
 * LABELING
 */
function classifyWallet(score) {
  if (score > 80) return "SMART MONEY IN";
  if (score < -80) return "DISTRIBUTION";
  return "NEUTRAL";
}

/**
 * CLUSTER DETECTION (COORDINATED WALLETS)
 */
function detectCluster(wallet, links) {
  let connections = 0;

  links.forEach(l => {
    if (l.source === wallet || l.target === wallet) {
      if (l.value > 10) connections++;
    }
  });

  return connections;
}

/**
 * TOKEN INTELLIGENCE
 */
function detectToken(score) {
  if (score > 80) return "ETH";
  if (score > 30) return "ALT";
  if (score < -80) return "EXIT";
  return "USDT";
}

module.exports = {
  getSmartMoneyGraph,
  getSignals
};