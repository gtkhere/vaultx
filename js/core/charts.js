/* =====================================================
   VaultX — Lightweight HTML5 Canvas Chart Engine
   ===================================================== */

const CHART_COLORS = ['#a855f7','#60a5fa','#34d399','#fbbf24','#f87171','#fb923c','#38bdf8','#e879f9'];

let incomeExpenseChart = null;
let categoryChart      = null;
let monthlyTrendChart  = null;

/** Canvas Bar Chart (Income vs Expense) */
function drawBarChart(ctx, labels, datasets) {
  const canvas = ctx.canvas;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const W = parentW || canvas.clientWidth || 600;
  const H = 200;
  canvas.width = W;
  canvas.height = H;

  const pad = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartW = Math.max(W - pad.left - pad.right, 100);
  const chartH = H - pad.top - pad.bottom;
  const allVals = datasets.flatMap(d => d.data.map(v => parseFloat(v) || 0));
  const maxVal  = Math.max(...allVals, 0);

  ctx.clearRect(0, 0, W, H);

  // Gracefully handle empty chart data
  if (maxVal === 0 || !labels || !labels.length) {
    ctx.font = '13px DM Sans, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('No income or expense activity recorded in this period', W / 2, H / 2 - 6);
    ctx.font = '11px DM Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('Add transactions to view your 6-month cashflow history', W / 2, H / 2 + 14);
    return { destroy() {} };
  }

  const groupW  = chartW / labels.length;
  const barW    = (groupW * 0.7) / datasets.length;
  const gap     = (groupW * 0.3) / (datasets.length + 1);

  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillStyle = '#4a5068';
  ctx.textAlign = 'right';

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();

    const tickVal = Math.round(maxVal * i / 4);
    const tickLabel = tickVal >= 1000 ? '₹' + Math.round(tickVal / 1000) + 'k' : '₹' + tickVal;
    ctx.fillText(tickLabel, pad.left - 6, y + 4);
  }

  // Bars
  datasets.forEach((ds, di) => {
    ds.data.forEach((val, i) => {
      const numericVal = Math.max(parseFloat(val) || 0, 0);
      const barH = (numericVal / maxVal) * chartH;
      const x = pad.left + i * groupW + gap + di * (barW + gap);
      const y = pad.top + chartH - barH;

      if (barH > 0) {
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, ds.color);
        grad.addColorStop(1, ds.color + '44');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        } else {
          ctx.rect(x, y, barW, barH);
        }
        ctx.fill();
      }
    });
  });

  // X labels
  ctx.fillStyle = '#4a5068';
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    ctx.fillText(l, pad.left + i * groupW + groupW / 2, H - 10);
  });

  return { destroy() {} };
}

/** Canvas Donut Chart (Category Spending) */
function drawDonutChart(ctx, labels, values, colors) {
  const canvas = ctx.canvas;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const size = Math.min(parentW || canvas.clientWidth || 300, 300);
  canvas.width = size;
  canvas.height = size;

  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = r * 0.6;
  const total = values.reduce((a, b) => a + (parseFloat(b) || 0), 0);
  let angle = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

  // Gracefully handle empty donut data
  if (total <= 0 || !values.length) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();

    ctx.fillStyle = '#f0f2ff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Syne, sans-serif';
    ctx.fillText('₹0.00', cx, cy + 4);
    ctx.font = '11px DM Sans, sans-serif';
    ctx.fillStyle = '#4a5068';
    ctx.fillText('No expenses yet', cx, cy + 22);
    return { destroy() {} };
  }

  values.forEach((v, i) => {
    const val = parseFloat(v) || 0;
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += slice;
  });

  // Inner cutout
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#0e1220';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#f0f2ff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px Syne, sans-serif';
  const displayTotal = prefs.balances
    ? '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : '••••••';
  ctx.fillText(displayTotal, cx, cy + 4);
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillStyle = '#4a5068';
  ctx.fillText('Total Spent', cx, cy + 22);

  return { destroy() {} };
}

/** Canvas Line Chart (6-Month Net Savings Trend) */
function drawLineChart(ctx, labels, data) {
  const canvas = ctx.canvas;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const W = parentW || canvas.clientWidth || 800;
  const H = 200;
  canvas.width = W;
  canvas.height = H;

  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = Math.max(W - pad.left - pad.right, 100);
  const chartH = H - pad.top - pad.bottom;
  const numericData = (data || []).map(v => parseFloat(v) || 0);

  ctx.clearRect(0, 0, W, H);

  // Gracefully handle empty line data
  if (!numericData.length || numericData.every(v => v === 0)) {
    ctx.font = '13px DM Sans, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('No monthly savings trend available yet', W / 2, H / 2 - 6);
    ctx.font = '11px DM Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('Add transactions to track your net savings over time', W / 2, H / 2 + 14);
    return { destroy() {} };
  }

  const maxV = Math.max(...numericData.map(Math.abs), 1);
  const minV = Math.min(...numericData, 0);
  const range = maxV - minV || 1;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  // Gradient area
  const pts = numericData.map((v, i) => ({
    x: pad.left + (i / Math.max(numericData.length - 1, 1)) * chartW,
    y: pad.top + chartH - ((v - minV) / range) * chartH
  }));

  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, 'rgba(124,58,237,0.4)');
  grad.addColorStop(1, 'rgba(124,58,237,0)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cp = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 };
    if (ctx.quadraticCurveTo) {
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, cp.x, cp.y);
    } else {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  }
  ctx.lineTo(pts[pts.length-1].x, pad.top + chartH);
  ctx.lineTo(pts[0].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2.5;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cp = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 };
    if (ctx.quadraticCurveTo) {
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, cp.x, cp.y);
    } else {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  }
  ctx.stroke();

  // Dots & labels
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0e1220';
    ctx.fill();

    ctx.fillStyle = '#4a5068';
    ctx.font = '11px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    if (labels[i]) ctx.fillText(labels[i], p.x, H - 10);
  });

  return { destroy() {} };
}

/** Get past 6 months metadata */
function getLast6Months() {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('default', { month: 'short' }) });
  }
  return result;
}

/** Calculate sum of transactions for a specific month and type using timezone-safe matching */
function sumMonth(year, month, type) {
  return transactions
    .filter(t => t.type === type && isDateInMonth(t.date, year, month))
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
}

/** Get top 6 expense category totals from transaction dataset */
function getCategoryTotals(txns = transactions) {
  const totals = {};
  txns
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (amt > 0) {
        totals[t.category] = (totals[t.category] || 0) + amt;
      }
    });
  return Object.fromEntries(Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6));
}

// Window resize handler: redraw charts cleanly when viewport size changes
let chartResizeDebounce = null;
window.addEventListener('resize', () => {
  clearTimeout(chartResizeDebounce);
  chartResizeDebounce = setTimeout(() => {
    if (activeSection === 'dashboard') {
      drawIncomeExpenseChart();
    } else if (activeSection === 'insights') {
      if (typeof drawCategoryChart === 'function') drawCategoryChart();
      if (typeof drawMonthlyTrendChart === 'function') drawMonthlyTrendChart();
    }
  }, 120);
});
