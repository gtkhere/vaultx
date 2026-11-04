/* =====================================================
   VaultX — Insights Module Logic
   ===================================================== */

/** Render all charts and breakdown metrics in Insights section */
function renderInsights() {
  drawCategoryChart();
  renderCategoryBreakdown();
  drawMonthlyTrendChart();
}

/** Draw Category Donut Chart */
function drawCategoryChart() {
  const canvas = document.getElementById('category-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const catTotals = getCategoryTotals();
  const labels = Object.keys(catTotals);
  const values = Object.values(catTotals);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (categoryChart) categoryChart.destroy();
  categoryChart = drawDonutChart(ctx, labels, values, colors);
}

/** Draw 6-Month Net Savings Trend Line Chart */
function drawMonthlyTrendChart() {
  const canvas = document.getElementById('monthly-trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const months     = getLast6Months();
  const netSavings = months.map(m => sumMonth(m.year, m.month, 'income') - sumMonth(m.year, m.month, 'expense'));
  const labels     = months.map(m => m.label);

  if (monthlyTrendChart) monthlyTrendChart.destroy();
  monthlyTrendChart = drawLineChart(ctx, labels, netSavings);
}

/** Render Category Breakdown progress bars */
function renderCategoryBreakdown() {
  const el = document.getElementById('category-breakdown');
  if (!el) return;

  const totals = getCategoryTotals();
  const totalExpense = Object.values(totals).reduce((s, a) => s + (parseFloat(a) || 0), 0);

  if (totalExpense <= 0 || !Object.keys(totals).length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:20px;text-align:center">No expense data yet</p>';
    return;
  }

  el.innerHTML = Object.entries(totals).map(([cat, amt], i) => {
    const numericAmt = parseFloat(amt) || 0;
    const pct = totalExpense > 0 ? (numericAmt / totalExpense) * 100 : 0;
    const formattedAmt = prefs.balances
      ? '₹' + numericAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '••••••';

    return `
      <div class="cat-row">
        <div style="font-size:1.1rem">${getCatIcon(cat)}</div>
        <div class="cat-row-label" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
          <span>${esc(cat)}</span>
          <span style="color:var(--text-muted);font-size:.78rem;font-weight:600;">${pct.toFixed(1)}%</span>
        </div>
        <div class="cat-row-bar-wrap">
          <div class="cat-row-bar" style="width:${pct.toFixed(1)}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
        </div>
        <div class="cat-row-amount">${formattedAmt}</div>
      </div>
    `;
  }).join('');
}
