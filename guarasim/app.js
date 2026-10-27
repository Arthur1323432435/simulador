/* Simulador Econômico Guará — cálculos e visualizações do estudo de caso. */
const BASE = {
  ipa: 50,
  pilsen: 30,
  price: 15,
  fixedCost: 120,
  costs: [100, 180, 240, 320, 440, 600]
};

const frontier = [
  { x: 0, y: 100, label: "A" },
  { x: 30, y: 80, label: "B" },
  { x: 50, y: 60, label: "C" },
  { x: 65, y: 30, label: "D" },
  { x: 75, y: 0, label: "E" }
];
const volumes = [10, 20, 30, 40, 50, 60];
const chartFont = { family: "Manrope", size: 10 };
const colors = { green: "#2aa576", greenDark: "#176c4f", gold: "#f4b942", coral: "#ed8a68", blue: "#5ca3ad", grid: "#e6eee7", text: "#82918a" };
let charts = {};
let state = { ...BASE, costs: [...BASE.costs] };

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);
const fmtBRL = (value, decimals = 0) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const fmtMil = (value) => `R$ ${fmtNumber(value, 0)} mil`;
const fmtNumber = (value, decimals = 0) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);

function frontierAt(ipa) {
  if (ipa <= frontier[0].x) return frontier[0].y;
  for (let i = 1; i < frontier.length; i += 1) {
    const previous = frontier[i - 1];
    const next = frontier[i];
    if (ipa <= next.x) {
      const ratio = (ipa - previous.x) / (next.x - previous.x);
      return previous.y + (next.y - previous.y) * ratio;
    }
  }
  return 0;
}

function marginalOpportunity(ipa) {
  if (ipa <= 30) return 20 / 30;
  if (ipa <= 50) return 1;
  if (ipa <= 65) return 2;
  return 3;
}

function variableCostAt(q) {
  if (q <= 0) return 0;
  const points = [{ q: 0, cv: 0 }, ...volumes.map((volume, index) => ({ q: volume, cv: state.costs[index] }))];
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const next = points[i];
    if (q <= next.q) {
      const ratio = (q - previous.q) / (next.q - previous.q);
      return previous.cv + (next.cv - previous.cv) * ratio;
    }
  }
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const slope = (last.cv - previous.cv) / (last.q - previous.q);
  return last.cv + (q - last.q) * slope;
}

function marketAt(price) {
  return { demand: Math.max(0, 120 - 4 * price), supply: Math.max(0, -30 + 6 * price) };
}

function elasticityAt(price) {
  const p1 = Math.max(0, price - 2.5);
  const p2 = Math.min(30, price + 2.5);
  if (p1 === p2) return 0;
  const q1 = 120 - 4 * p1;
  const q2 = 120 - 4 * p2;
  const qAvg = (q1 + q2) / 2;
  const pAvg = (p1 + p2) / 2;
  return ((q2 - q1) / qAvg) / ((p2 - p1) / pAvg);
}

function findBreakEven(price) {
  if (price <= 0 || state.fixedCost <= 0) return state.fixedCost === 0 ? 0 : Infinity;
  const breakPoints = [0, ...volumes, 75];
  const profitAt = (q) => price * q - (state.fixedCost + variableCostAt(q));
  let previousQ = breakPoints[0];
  let previousProfit = profitAt(previousQ);
  for (let i = 1; i < breakPoints.length; i += 1) {
    const nextQ = breakPoints[i];
    const nextProfit = profitAt(nextQ);
    if (previousProfit === 0) return previousQ;
    if (previousProfit < 0 && nextProfit >= 0) {
      return previousQ + ((0 - previousProfit) * (nextQ - previousQ)) / (nextProfit - previousProfit);
    }
    previousQ = nextQ;
    previousProfit = nextProfit;
  }
  return Infinity;
}

function getCalculations() {
  const maxPilsen = frontierAt(state.ipa);
  const onFrontier = Math.abs(state.pilsen - maxPilsen) < 0.5;
  const reachable = state.pilsen <= maxPilsen + 0.5;
  let status = "Eficiente";
  let statusDetail = "Utilização total da capacidade";
  if (!reachable) { status = "Inatingível"; statusDetail = "Acima da capacidade atual"; }
  else if (!onFrontier) { status = "Ineficiente"; statusDetail = "Há capacidade ociosa"; }

  const market = marketAt(state.price);
  const revenue = state.price * state.ipa;
  const variableCost = variableCostAt(state.ipa);
  const totalCost = state.fixedCost + variableCost;
  const profit = revenue - totalCost;
  const margin = revenue ? (profit / revenue) * 100 : 0;
  const averageCost = state.ipa > 0 ? totalCost / state.ipa : Infinity;
  const previousVolume = volumes.filter((volume) => volume < state.ipa).pop() ?? 0;
  const previousTotalCost = state.fixedCost + variableCostAt(previousVolume);
  const marginalCost = state.ipa > previousVolume ? (totalCost - previousTotalCost) / (state.ipa - previousVolume) : Infinity;
  const breakEven = findBreakEven(state.price);
  const elasticity = elasticityAt(state.price);
  const candidateVolumes = [0, ...volumes, 75];
  const profitRows = candidateVolumes.map((q) => {
    const cost = state.fixedCost + variableCostAt(q);
    return { q, revenue: state.price * q, cost, profit: state.price * q - cost };
  });
  const best = profitRows.reduce((winner, row) => row.profit > winner.profit ? row : winner, profitRows[0]);
  const sacrificed = Math.max(0, 100 - maxPilsen);
  return { maxPilsen, onFrontier, reachable, status, statusDetail, market, revenue, variableCost, totalCost, profit, margin, averageCost, marginalCost, breakEven, elasticity, profitRows, best, sacrificed, opportunity: marginalOpportunity(state.ipa) };
}

function setRangeFill(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value) || 0;
  input.style.background = `linear-gradient(90deg, ${colors.green} 0%, ${colors.green} ${((value - min) / (max - min)) * 100}%, #dce6df ${((value - min) / (max - min)) * 100}%, #dce6df 100%)`;
}

function syncControl(rangeId, numberId, outputId, formatter) {
  const range = $(rangeId); const number = $(numberId); const output = $(outputId);
  const update = (source) => {
    const value = clamp(source.value, Number(source.min), Number(source.max));
    range.value = value; number.value = value; output.textContent = formatter(value); setRangeFill(range);
    readControls();
  };
  range.addEventListener("input", () => update(range));
  number.addEventListener("input", () => update(number));
  setRangeFill(range);
}

function readControls() {
  state.ipa = clamp($("ipa-range").value, 0, 75);
  state.pilsen = clamp($("pilsen-range").value, 0, 100);
  state.price = clamp($("price-range").value, 0, 30);
  state.fixedCost = Math.max(0, Number($("fixed-cost").value) || 0);
  const calculations = getCalculations();
  updateInterface(calculations);
  updateCharts(calculations);
}

function updateInterface(calc) {
  $("status-value").textContent = calc.status;
  $("status-detail").textContent = calc.statusDetail;
  $("status-bar").style.width = `${calc.reachable ? (calc.onFrontier ? 100 : 72) : 32}%`;
  $("status-bar").style.background = calc.status === "Eficiente" ? colors.green : calc.status === "Ineficiente" ? colors.gold : colors.coral;
  $("revenue-value").textContent = fmtMil(calc.revenue);
  $("profit-value").textContent = calc.profit >= 0 ? fmtMil(calc.profit) : `−${fmtMil(Math.abs(calc.profit))}`;
  $("profit-detail").textContent = calc.revenue ? `margem operacional de ${fmtNumber(calc.margin, 1)}%` : "sem receita no cenário atual";
  $("breakeven-value").textContent = Number.isFinite(calc.breakEven) ? `${fmtNumber(calc.breakEven, 0)} mil L` : "não atingido";
  $("breakeven-detail").textContent = Number.isFinite(calc.breakEven) ? `${fmtMil(calc.breakEven * state.price)} de receita` : "preço abaixo do CVMe";
  $("cme-value").textContent = Number.isFinite(calc.averageCost) ? `${fmtBRL(calc.averageCost, 2)}/L` : "—";
  $("cmg-value").textContent = Number.isFinite(calc.marginalCost) ? `${fmtBRL(calc.marginalCost, 2)}/L` : "—";
  $("best-volume-value").textContent = `${fmtNumber(calc.best.q, 0)} mil L`;
  $("best-profit-value").textContent = `lucro estimado de ${fmtMil(calc.best.profit)}`;
  $("cpp-note").textContent = calc.status === "Eficiente" ? `ponto ${frontier.find((point) => Math.abs(point.x - state.ipa) < 0.5)?.label || "em fronteira"}` : `${fmtNumber(calc.maxPilsen, 0)} mil L de Pilsen possíveis`;
  $("market-note").textContent = `equilíbrio R$ ${fmtNumber(15, 2)}`;
  $("profit-note").textContent = `melhor ponto: ${calc.best.q} mil L`;
  const marketText = calc.market.supply > calc.market.demand ? `Excesso de oferta: ${fmtNumber(calc.market.supply - calc.market.demand, 0)} mil L.` : calc.market.demand > calc.market.supply ? `Excesso de demanda: ${fmtNumber(calc.market.demand - calc.market.supply, 0)} mil L.` : "Mercado em equilíbrio no preço atual.";
  $("market-diagnostic").innerHTML = `<span class="diagnostic-icon">${calc.market.supply === calc.market.demand ? "≈" : calc.market.supply > calc.market.demand ? "↓" : "↑"}</span><span>${marketText}</span>`;
  const elasticLabel = Math.abs(calc.elasticity) < 1 ? "Demanda localmente inelástica: preço tende a proteger receita." : "Demanda localmente elástica: volume reage mais que o preço.";
  $("elasticity-note").textContent = elasticLabel;
  $("insight-efficiency").textContent = calc.status === "Eficiente" ? `A combinação de ${state.ipa} mil L de IPA e ${state.pilsen} mil L de Pilsen está sobre a CPP, usando integralmente os recursos.` : calc.status === "Ineficiente" ? `A combinação atual é atingível, mas está ${fmtNumber(calc.maxPilsen - state.pilsen, 0)} mil L de Pilsen abaixo do limite produtivo para este volume de IPA.` : `A combinação está ${fmtNumber(state.pilsen - calc.maxPilsen, 0)} mil L de Pilsen acima da fronteira; a capacidade atual não comporta o plano.`;
  $("insight-opportunity").textContent = `Produzir ${state.ipa} mil L de IPA sacrifica ${fmtNumber(calc.sacrificed, 0)} mil L de Pilsen em relação à capacidade máxima de Pilsen. O custo marginal está em ${fmtNumber(calc.opportunity, 2)} L por litro adicional.`;
  const financeText = calc.profit >= 0 ? `Na produção planejada, a receita de ${fmtMil(calc.revenue)} cobre o custo total de ${fmtMil(calc.totalCost)} e gera lucro estimado de ${fmtMil(calc.profit)}.` : `Na produção planejada, o cenário gera prejuízo de ${fmtMil(Math.abs(calc.profit))}. É preciso aumentar preço/volume ou reduzir custos para alcançar o break-even.`;
  $("insight-finance").textContent = financeText;
  $("live-region").textContent = `Simulação atualizada: ${calc.status}, receita ${fmtMil(calc.revenue)}, lucro ${fmtMil(calc.profit)}.`;
}

const baseOptions = { responsive: true, maintainAspectRatio: false, animation: { duration: 350 }, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#10231f", titleFont: chartFont, bodyFont: chartFont, padding: 10, displayColors: false } }, scales: { x: { grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont } }, y: { grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont } } } };

function createCharts() {
  charts.cpp = new Chart($("cpp-chart"), { type: "line", data: { datasets: [] }, options: { ...baseOptions, scales: { x: { type: "linear", min: 0, max: 75, title: { display: true, text: "IPA · mil L", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 15 } }, y: { min: 0, max: 110, title: { display: true, text: "Pilsen · mil L", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 20 } } } } });
  charts.market = new Chart($("market-chart"), { type: "line", data: { datasets: [] }, options: { ...baseOptions, scales: { x: { type: "linear", min: 0, max: 30, title: { display: true, text: "Preço · R$/L", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 5 } }, y: { min: 0, max: 130, title: { display: true, text: "Quantidade · mil L", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 30 } } } } });
  charts.revenue = new Chart($("revenue-chart"), { type: "line", data: { datasets: [] }, options: { ...baseOptions, scales: { x: { type: "linear", min: 0, max: 30, title: { display: true, text: "Preço · R$/L", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 5 } }, y: { min: 0, max: 1000, title: { display: true, text: "RT · R$ mil", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 250 } } } } });
  charts.cost = new Chart($("cost-chart"), { type: "line", data: { datasets: [] }, options: { ...baseOptions, scales: { x: { type: "linear", min: 0, max: 75, title: { display: true, text: "Volume IPA · mil L", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 15 } }, y: { min: 0, max: 1100, title: { display: true, text: "R$ mil", color: colors.text, font: chartFont }, grid: { color: colors.grid }, ticks: { color: colors.text, font: chartFont, stepSize: 250 } } } } });
}

function updateCharts(calc) {
  if (!charts.cpp) return;
  charts.cpp.data.datasets = [
    { label: "Fronteira", data: frontier.map(({ x, y }) => ({ x, y })), borderColor: colors.green, backgroundColor: "rgba(42,165,118,.10)", fill: true, borderWidth: 3, pointRadius: 4, pointBackgroundColor: colors.green, tension: .1 },
    { label: "Combinação do usuário", data: [{ x: state.ipa, y: state.pilsen }], borderColor: colors.gold, backgroundColor: colors.gold, pointRadius: 7, pointHoverRadius: 9, showLine: false },
    { label: "Capacidade", data: [{ x: 0, y: 0 }, { x: 75, y: 0 }], borderColor: "#d3ded5", borderWidth: 1, borderDash: [4, 4], pointRadius: 0 }
  ];
  const marketPrices = Array.from({ length: 13 }, (_, i) => i * 2.5);
  charts.market.data.datasets = [
    { label: "Demanda", data: marketPrices.map((x) => ({ x, y: Math.max(0, 120 - 4 * x) })), borderColor: colors.green, borderWidth: 2.5, pointRadius: 0, tension: .15 },
    { label: "Oferta", data: marketPrices.map((x) => ({ x, y: Math.max(0, -30 + 6 * x) })), borderColor: colors.coral, borderWidth: 2.5, pointRadius: 0, tension: .15 },
    { label: "Preço atual", data: [{ x: state.price, y: 0 }, { x: state.price, y: Math.max(calc.market.demand, calc.market.supply) }], borderColor: colors.gold, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 }
  ];
  const revenueData = Array.from({ length: 31 }, (_, price) => ({ x: price, y: Math.max(0, price * (120 - 4 * price)) }));
  charts.revenue.data.datasets = [
    { label: "Receita total", data: revenueData, borderColor: colors.green, backgroundColor: "rgba(42,165,118,.12)", fill: true, borderWidth: 2.5, pointRadius: 0, tension: .25 },
    { label: "Preço atual", data: [{ x: state.price, y: 0 }, { x: state.price, y: Math.max(0, state.price * (120 - 4 * state.price)) }], borderColor: colors.gold, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 },
    { label: "Pico", data: [{ x: 15, y: 900 }], backgroundColor: colors.gold, borderColor: colors.gold, pointRadius: 6, showLine: false }
  ];
  const breakEvenLine = Number.isFinite(calc.breakEven) && calc.breakEven >= 0 && calc.breakEven <= 75 ? [{ x: calc.breakEven, y: 0 }, { x: calc.breakEven, y: Math.min(calc.breakEven * state.price, 1100) }] : [];
  charts.cost.data.datasets = [
    { label: "Receita total", data: calc.profitRows.map(({ q, revenue }) => ({ x: q, y: revenue })), borderColor: colors.green, backgroundColor: "rgba(42,165,118,.08)", fill: true, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: colors.green, tension: .2 },
    { label: "Custo total", data: calc.profitRows.map(({ q, cost }) => ({ x: q, y: cost })), borderColor: colors.coral, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: colors.coral, tension: .15 },
    { label: "Break-even", data: breakEvenLine, borderColor: colors.gold, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 }
  ];
  Object.values(charts).forEach((chart) => chart.update("none"));
}

function renderCostTable() {
  $("cost-table-body").innerHTML = volumes.map((volume, index) => `<tr><td>${volume}k L</td><td><input data-cost-index="${index}" type="number" min="0" step="1" value="${state.costs[index]}" aria-label="Custo variável em R$ mil para ${volume} mil litros" /></td></tr>`).join("");
  document.querySelectorAll("[data-cost-index]").forEach((input) => input.addEventListener("input", () => { state.costs[Number(input.dataset.costIndex)] = Math.max(0, Number(input.value) || 0); readControls(); }));
}

function reset() {
  state = { ...BASE, costs: [...BASE.costs] };
  $("ipa-range").value = BASE.ipa; $("ipa-number").value = BASE.ipa; $("pilsen-range").value = BASE.pilsen; $("pilsen-number").value = BASE.pilsen; $("price-range").value = BASE.price; $("price-number").value = BASE.price; $("fixed-cost").value = BASE.fixedCost;
  $("ipa-output").textContent = "50 mil L"; $("pilsen-output").textContent = "30 mil L"; $("price-output").textContent = "R$ 15,00/L";
  [$("ipa-range"), $("pilsen-range"), $("price-range")].forEach(setRangeFill); renderCostTable(); readControls();
}

function init() {
  syncControl("ipa-range", "ipa-number", "ipa-output", (v) => `${fmtNumber(v, 0)} mil L`);
  syncControl("pilsen-range", "pilsen-number", "pilsen-output", (v) => `${fmtNumber(v, 0)} mil L`);
  syncControl("price-range", "price-number", "price-output", (v) => `${fmtBRL(v, 2)}/L`);
  $("fixed-cost").addEventListener("input", readControls);
  $("reset-button").addEventListener("click", reset);
  renderCostTable();
  createCharts();
  readControls();
}

window.addEventListener("DOMContentLoaded", init);
