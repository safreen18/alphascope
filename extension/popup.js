const API_URL = "https://alphascope-z4rz.onrender.com";

let simulation;
let svg, linkGroup, nodeGroup;

/**
 * SAFE FETCH
 */
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

/**
 * INIT GRAPH
 */
function initGraph() {
  svg = d3.select("#graph");

  linkGroup = svg.append("g");
  nodeGroup = svg.append("g");

  simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-140))
    .force("center", d3.forceCenter(200, 250));
}

/**
 * UPDATE GRAPH
 */
function updateGraph(graph) {
  if (!graph || !graph.nodes) return;

  const links = linkGroup.selectAll("line")
    .data(graph.links || [], d => (d.source?.id || d.source) + "-" + (d.target?.id || d.target));

  links.enter()
    .append("line")
    .attr("class", "link");

  links.exit().remove();

  const nodes = nodeGroup.selectAll("circle")
    .data(graph.nodes, d => d.id);

  const nodeEnter = nodes.enter()
    .append("circle")
    .attr("r", d => getSize(d))
    .attr("class", d => getClass(d))
    .on("click", showWalletInfo)
    .call(d3.drag()
      .on("start", dragStart)
      .on("drag", dragging)
      .on("end", dragEnd)
    );

  nodes.merge(nodeEnter)
    .attr("r", d => getSize(d))
    .attr("class", d => getClass(d));

  nodes.exit().remove();

  simulation.nodes(graph.nodes).on("tick", ticked);
  simulation.force("link").links(graph.links || []);
  simulation.alpha(1).restart();
}

/**
 * NODE SIZE (HEATMAP)
 */
function getSize(d) {
  return Math.max(5, Math.min(14, Math.abs(d.score || 0) / 10));
}

/**
 * NODE CLASS
 */
function getClass(d) {
  let base = "node";

  if (d.label === "SMART MONEY IN") base += " smart";
  else if (d.label === "DISTRIBUTION") base += " distribution";
  else base += " neutral";

  if (d.whale) base += " whale";

  return base;
}

/**
 * TICK UPDATE
 */
function ticked() {
  linkGroup.selectAll("line")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodeGroup.selectAll("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);
}

/**
 * DRAG
 */
function dragStart(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragging(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragEnd(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

/**
 * WALLET PANEL
 */
function showWalletInfo(event, d) {
  document.getElementById("wallet-info").innerHTML = `
    <b>${d.id}</b><br>
    Score: ${d.score}<br>
    Token: ${d.token}<br>
    <button onclick="followWallet('${d.id}')">Follow</button>
  `;
}

/**
 * FOLLOW WALLET
 */
async function followWallet(wallet) {
  await fetch(`${API_URL}/follow`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ wallet })
  });
}

/**
 * SIGNALS
 */
async function loadSignals() {
  const data = await fetchJSON(`${API_URL}/signals`);
  const panel = document.getElementById("signals");

  if (!data || !data.signals || data.signals.length === 0) {
    panel.innerHTML = "No signals yet";
    return;
  }

  panel.innerHTML = data.signals.map(s => `
    <div class="signal ${s.type}">
      <b>${s.type}</b> ${s.token}<br>
      ${s.reason}
    </div>
  `).join("");
}

/**
 * COPY FEED
 */
async function loadCopyFeed() {
  const data = await fetchJSON(`${API_URL}/copy-feed`);
  const panel = document.getElementById("copy-feed");

  if (!data || !data.trades || data.trades.length === 0) {
    panel.innerHTML = "Scanning whales...";
    return;
  }

  panel.innerHTML = data.trades.map(t => `
    <div class="trade">
      <b>${t.type}</b> ${t.token}<br>
      ${short(t.from)} → ${short(t.to)}<br>
      $${Number(t.value).toFixed(2)}
    </div>
  `).join("");
}

/**
 * WALLET STATS (REAL PNL)
 */
async function loadWalletStats() {
  const data = await fetchJSON(`${API_URL}/wallet-stats`);
  const panel = document.getElementById("wallet-stats");

  if (!data || !data.stats || data.stats.length === 0) {
    panel.innerHTML = "No wallet data";
    return;
  }

  panel.innerHTML = data.stats.map(w => `
    <div class="trade">
      ${short(w.wallet)}<br>
      PnL: $${w.pnl}<br>
      Trades: ${w.trades}
    </div>
  `).join("");
}

/**
 * HELPERS
 */
function short(a) {
  return a.slice(0, 6);
}

/**
 * 🔥 MAIN LOOP (ALL SYSTEMS)
 */
async function loop() {
  try {
    const graph = await fetchJSON(`${API_URL}/graph`);
    updateGraph(graph);

    await Promise.all([
      loadSignals(),
      loadCopyFeed(),
      loadWalletStats()
    ]);

  } catch (err) {
    console.error("Loop error:", err);
  }
}

/**
 * INIT
 */
initGraph();
loop();
setInterval(loop, 4000);