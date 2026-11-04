/* =====================================================
   VaultX — Dashboard Module Logic
   ===================================================== */

let currentDashboardPeriod = 'this-month';
const activeAnimations = {};

/** Set selected date filter period for the dashboard */
function setDashboardPeriod(period) {
  currentDashboardPeriod = period || 'this-month';
  const filterEl = document.getElementById('dashboard-period-filter');
  if (filterEl && filterEl.value !== currentDashboardPeriod) {
    filterEl.value = currentDashboardPeriod;
  }
  updateBalanceSummary();
}

/** Render all dashboard components */
function renderDashboard() {
  updateDashboardDateBadge();
  updateGreeting();
  updateBalanceSummary();
  renderRecentTransactions();
  renderDashboardAccounts();
  renderDashboardCards();
  drawIncomeExpenseChart();
}

/** Update the human-readable date badge in the dashboard header */
function updateDashboardDateBadge() {
  const el = document.getElementById('today-date');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

/** Recalculate summary metrics: total balance, period income, expense, savings & rate */
function updateBalanceSummary() {
  // 1. Total Balance: Combined current balance of all bank accounts (respects balance sync, no double counting)
  const totalBalance = (accounts || []).reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);

  // 2. Period Transactions based on selected date filter
  const periodTxns = getTxnsForPeriod(currentDashboardPeriod);

  // 3. Total Income & Total Expenses for selected period
  const income  = periodTxns.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const expense = periodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  // 4. Savings (Income - Expenses) & Savings Rate
  const savingsAmount = income - expense;
  const savingsRate = income > 0 ? Math.round((savingsAmount / income) * 100) : 0;

  // Update period descriptive labels
  const periodLabels = {
    'this-month': 'This month',
    'last-month': 'Last month',
    'last-30': 'Last 30 days',
    'this-year': 'This year',
    'all': 'All time'
  };
  const periodText = periodLabels[currentDashboardPeriod] || 'Selected period';

  const incPeriodEl = document.getElementById('income-period-label');
  if (incPeriodEl) incPeriodEl.textContent = periodText;

  const expPeriodEl = document.getElementById('expense-period-label');
  if (expPeriodEl) expPeriodEl.textContent = periodText;

  const savPeriodEl = document.getElementById('savings-period-label');
  if (savPeriodEl) {
    savPeriodEl.innerHTML = `<span id="savings-rate">${savingsRate}%</span> of income saved`;
  }

  // Handle Balance Privacy
  const balanceFields = ['total-balance', 'total-income', 'total-expense', 'savings-amount', 'savings-rate'];
  if (!prefs.balances) {
    balanceFields.forEach(id => {
      if (activeAnimations[id]) {
        cancelAnimationFrame(activeAnimations[id]);
        delete activeAnimations[id];
      }
      const el = document.getElementById(id);
      if (el) el.textContent = '••••••';
    });
  } else {
    animateNumber('total-balance', totalBalance, true);
    animateNumber('total-income',  income,       true);
    animateNumber('total-expense', expense,      true);

    const savingsAmtEl = document.getElementById('savings-amount');
    if (savingsAmtEl) {
      animateNumber('savings-amount', savingsAmount, true);
    } else {
      // Fallback if template uses savings-rate for primary display
      const rateEl = document.getElementById('savings-rate');
      if (rateEl) rateEl.textContent = savingsRate + '%';
    }

    const rateSpan = document.getElementById('savings-rate');
    if (rateSpan && savingsAmtEl) {
      rateSpan.textContent = savingsRate + '%';
    }
  }

  // Real data-driven trend indicators
  updateDashboardTrends(income, expense, savingsAmount, savingsRate);
}

/** Calculate and render realistic trend indicators based on historical data */
function updateDashboardTrends(income, expense, savingsAmount, savingsRate) {
  // Total Balance trend
  const balanceTrendEl = document.getElementById('balance-trend');
  if (balanceTrendEl) {
    const count = (accounts || []).length;
    balanceTrendEl.className = 'balance-card-trend up';
    balanceTrendEl.textContent = `${count} active account${count === 1 ? '' : 's'}`;
  }

  // Compare income/expenses against prior calendar month
  const lastMonthTxns = getTxnsForPeriod('last-month');
  const lastIncome  = lastMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const lastExpense = lastMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const incomeTrendEl = document.getElementById('income-trend');
  if (incomeTrendEl) {
    if (lastIncome > 0) {
      const diffPct = Math.round(((income - lastIncome) / lastIncome) * 100);
      incomeTrendEl.className = 'balance-card-trend ' + (diffPct >= 0 ? 'up' : 'down');
      incomeTrendEl.textContent = (diffPct >= 0 ? '▲ ' : '▼ ') + Math.abs(diffPct) + '% vs last month';
    } else {
      incomeTrendEl.className = 'balance-card-trend ' + (income > 0 ? 'up' : 'neutral');
      incomeTrendEl.textContent = income > 0 ? '▲ Active income' : '— No prior data';
    }
  }

  const expenseTrendEl = document.getElementById('expense-trend');
  if (expenseTrendEl) {
    if (lastExpense > 0) {
      const diffPct = Math.round(((expense - lastExpense) / lastExpense) * 100);
      // For expense: decrease is positive/green (up), increase is red (down)
      expenseTrendEl.className = 'balance-card-trend ' + (diffPct <= 0 ? 'up' : 'down');
      expenseTrendEl.textContent = (diffPct > 0 ? '▲ ' : '▼ ') + Math.abs(diffPct) + '% vs last month';
    } else {
      expenseTrendEl.className = 'balance-card-trend ' + (expense > 0 ? 'down' : 'up');
      expenseTrendEl.textContent = expense > 0 ? '▲ Active spending' : '— No expenses';
    }
  }

  const savingsTrendEl = document.getElementById('savings-trend');
  if (savingsTrendEl) {
    savingsTrendEl.className = 'balance-card-trend ' + (savingsAmount >= 0 ? 'up' : 'down');
    savingsTrendEl.textContent = (savingsAmount >= 0 ? '▲ ' : '▼ ') + Math.abs(savingsRate) + '% saved';
  }
}

/** Smooth count-up number animation supporting positive and negative amounts */
function animateNumber(id, target, isCurrency) {
  const el = document.getElementById(id);
  if (!el) return;

  if (activeAnimations[id]) {
    cancelAnimationFrame(activeAnimations[id]);
    delete activeAnimations[id];
  }

  function formatVal(v) {
    if (!isCurrency) return Math.round(v);
    const sign = v < 0 ? '-' : '';
    const absVal = Math.abs(v);
    return sign + '₹' + absVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  if (target === 0) {
    el.textContent = formatVal(0);
    return;
  }

  const start = 0, duration = 600, startTime = performance.now();
  function step(now) {
    if (!prefs.balances) {
      el.textContent = '••••••';
      delete activeAnimations[id];
      return;
    }

    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = start + (target - start) * eased;
    el.textContent = formatVal(val);

    if (p < 1) {
      activeAnimations[id] = requestAnimationFrame(step);
    } else {
      delete activeAnimations[id];
    }
  }
  activeAnimations[id] = requestAnimationFrame(step);
}

/** Render recent transactions list on dashboard in chronological order (latest first) */
function renderRecentTransactions() {
  const el = document.getElementById('recent-txns-list');
  if (!el) return;

  const recent = [...(transactions || [])].sort((a, b) => {
    const diff = parseTxnDate(b.date) - parseTxnDate(a.date);
    return diff !== 0 ? diff : getTxnCreatedAt(b) - getTxnCreatedAt(a);
  }).slice(0, 6);

  if (!recent.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:20px;">No transactions yet</p>';
    return;
  }

  el.innerHTML = recent.map(t => {
    const isInc = t.type === 'income';
    const amountVal = parseFloat(t.amount) || 0;
    const formattedAmount = prefs.balances
      ? (isInc ? '+' : '-') + '₹' + amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '••••••';

    return `
      <div class="txn-item">
        <div class="txn-icon" style="background:${getCatColor(t.category)}22">${getCatIcon(t.category)}</div>
        <div class="txn-info">
          <div class="txn-name">${esc(t.name)}</div>
          <div class="txn-category">${esc(t.category)}</div>
        </div>
        <div class="txn-meta">
          <div class="txn-amount ${t.type}">${formattedAmount}</div>
          <div class="txn-date">${formatDate(t.date)}</div>
        </div>
      </div>
    `;
  }).join('');
}

/** Render dashboard bank accounts quick-view widget */
function renderDashboardAccounts() {
  const el = document.getElementById('dash-accounts-list');
  if (!el) return;
  if (!accounts || !accounts.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:10px;">No accounts yet</p>';
    return;
  }
  el.innerHTML = accounts.slice(0, 4).map(a => `
    <div class="dash-account-item">
      <div class="dash-account-icon" style="background:${getColorHex(a.color)}22">🏦</div>
      <div style="flex:1">
        <div style="font-size:.87rem;font-weight:600;">${esc(a.bank)}</div>
        <div style="font-size:.74rem;color:var(--text-muted)">•••• ${a.number}</div>
      </div>
      <div style="font-weight:700;font-size:.9rem;">${prefs.balances ? '₹' + (parseFloat(a.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}</div>
    </div>
  `).join('');
}

/** Render dashboard cards quick-view widget */
function renderDashboardCards() {
  const el = document.getElementById('dash-cards-list');
  if (!el) return;
  if (!cards || !cards.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:10px;">No cards yet</p>';
    return;
  }
  el.innerHTML = cards.slice(0, 4).map(c => {
    const isCredit = c.type === 'credit';
    const linkedAcc = (accounts || []).find(a => a.id === c.linkedAccount);
    const metaSub = isCredit 
      ? `Due: ₹${(parseFloat(c.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
      : (linkedAcc ? esc(linkedAcc.bank) : 'Unlinked');

    return `
      <div class="dash-card-item">
        <div class="dash-account-icon" style="background:${getColorHex(c.color)}22">💳</div>
        <div style="flex:1">
          <div style="font-size:.87rem;font-weight:600;">${esc(c.network)} ${c.type.toUpperCase()}</div>
          <div style="font-size:.74rem;color:var(--text-muted)">•••• ${(c.number || '').slice(-4)} · ${metaSub}</div>
        </div>
        <div style="font-size:.75rem;color:var(--text-muted)">${c.expiry}</div>
      </div>
    `;
  }).join('');
}

/** Draw 6-month Income vs Expenses chart based on actual application data */
function drawIncomeExpenseChart() {
  const canvas = document.getElementById('income-expense-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const months   = getLast6Months();
  const incomes  = months.map(m => sumMonth(m.year, m.month, 'income'));
  const expenses = months.map(m => sumMonth(m.year, m.month, 'expense'));
  const labels   = months.map(m => m.label);

  if (incomeExpenseChart) incomeExpenseChart.destroy();
  incomeExpenseChart = drawBarChart(ctx, labels, [
    { data: incomes,  color: '#34d399', label: 'Income'   },
    { data: expenses, color: '#f87171', label: 'Expenses' }
  ]);
}

/** Dynamic time-of-day greeting */
function updateGreeting() {
  const profile = DB.load('profile', { name: 'Alex Morgan' });
  const firstName = (profile.name || 'Alex').split(' ')[0];
  const h = new Date().getHours();
  const greeting = h < 12 ? '☀️ Good morning' : h < 17 ? '👋 Good afternoon' : '🌙 Good evening';
  const el = document.querySelector('#section-dashboard .section-heading h2');
  if (el) el.textContent = `${greeting}, ${firstName}!`;
}
