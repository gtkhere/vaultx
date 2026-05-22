/* =====================================================
   VaultX — Main Application Script
   All logic: auth, CRUD, charts, UI interactions
   ===================================================== */

// =====================================================
// SECTION 1: STATE & DATA LAYER
// =====================================================

const DB = {
  /** Load data from localStorage with fallback */
  load(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem('vaultx_' + key)) ?? fallback; }
    catch { return fallback; }
  },
  /** Save data to localStorage */
  save(key, data) {
    localStorage.setItem('vaultx_' + key, JSON.stringify(data));
  }
};

// App state
let cards        = DB.load('cards', []);
let accounts     = DB.load('accounts', []);
let transactions = DB.load('transactions', []);
let isLoggedIn   = DB.load('loggedin', false);
let sidebarCollapsed = false;

// =====================================================
// SECTION 2: SEED DEMO DATA
// =====================================================

function seedDemoData() {
  if (DB.load('seeded', false)) {
    // Load existing data
    cards        = DB.load('cards', []);
    accounts     = DB.load('accounts', []);
    transactions = DB.load('transactions', []);
    return;
  }

  accounts = [
    { id: uid(), bank: 'HDFC Bank',  number: '4521', type: 'salary',   balance: 124500.00, color: 'blue'   },
    { id: uid(), bank: 'SBI',        number: '8823', type: 'savings',  balance: 83200.50,  color: 'purple' },
    { id: uid(), bank: 'ICICI Bank', number: '3310', type: 'checking', balance: 37500.00,  color: 'green'  },
  ];

  cards = [
    { id: uid(), type: 'credit', network: 'VISA',       number: '4111222233334291', holder: 'ALEX MORGAN', expiry: '12/28', cvv: '742', color: 'purple', linkedAccount: accounts[0].id },
    { id: uid(), type: 'debit',  network: 'MASTERCARD', number: '5555666677778888', holder: 'ALEX MORGAN', expiry: '08/27', cvv: '318', color: 'blue',   linkedAccount: accounts[1].id },
    { id: uid(), type: 'debit',  network: 'RUPAY',      number: '6011000000001234', holder: 'ALEX MORGAN', expiry: '03/26', cvv: '509', color: 'green',  linkedAccount: accounts[2].id },
  ];

  const now = new Date();
  const mkDate = (daysAgo) => {
    const d = new Date(now); d.setDate(d.getDate() - daysAgo); return d.toISOString().split('T')[0];
  };

  transactions = [
    { id: uid(), type: 'income',  name: 'Monthly Salary',     category: 'Salary',           amount: 95000,  date: mkDate(1),  note: '',           account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Netflix',            category: 'Entertainment',    amount: 649,    date: mkDate(2),  note: 'Streaming',   account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Big Basket',         category: 'Food & Dining',    amount: 3240,   date: mkDate(3),  note: 'Groceries',   account: accounts[1].id },
    { id: uid(), type: 'expense', name: 'Ola Cab',            category: 'Travel',           amount: 380,    date: mkDate(4),  note: 'Ride',        account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Electricity Bill',   category: 'Bills & Utilities',amount: 2800,   date: mkDate(5),  note: '',            account: accounts[1].id },
    { id: uid(), type: 'income',  name: 'Freelance Payment',  category: 'Investment',       amount: 28000,  date: mkDate(7),  note: 'Design work', account: accounts[2].id },
    { id: uid(), type: 'expense', name: 'Zomato',             category: 'Food & Dining',    amount: 520,    date: mkDate(8),  note: 'Dinner',      account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Flipkart',           category: 'Shopping',         amount: 12999,  date: mkDate(10), note: 'Headphones',  account: accounts[0].id },
    { id: uid(), type: 'income',  name: 'Mutual Fund Return', category: 'Investment',       amount: 8400,   date: mkDate(12), note: '',            account: accounts[1].id },
    { id: uid(), type: 'expense', name: 'Cult.fit',           category: 'Health',           amount: 1999,   date: mkDate(13), note: '',            account: accounts[2].id },
    { id: uid(), type: 'expense', name: 'Spotify',            category: 'Entertainment',    amount: 119,    date: mkDate(14), note: '',            account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Goa Trip Hotel',     category: 'Travel',           amount: 18500,  date: mkDate(16), note: 'Trip',        account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Udemy Course',       category: 'Education',        amount: 499,    date: mkDate(18), note: '',            account: accounts[1].id },
    { id: uid(), type: 'income',  name: 'Side Project',       category: 'Investment',       amount: 15000,  date: mkDate(20), note: '',            account: accounts[2].id },
    { id: uid(), type: 'expense', name: 'Airtel Broadband',   category: 'Bills & Utilities',amount: 999,    date: mkDate(22), note: '',            account: accounts[1].id },
  ];

  saveAll();
  DB.save('seeded', true);
}

function saveAll() {
  DB.save('cards', cards);
  DB.save('accounts', accounts);
  DB.save('transactions', transactions);
}

function uid() { return '_' + Math.random().toString(36).substr(2, 9); }

// =====================================================
// SECTION 3: AUTH
// =====================================================

function showLogin() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('login-modal').classList.remove('hidden');
}

function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass  = document.getElementById('login-password').value;

  // Demo auth — any email/password works
  if (!email && !pass) {
    showToast('⚡ Logging in with demo credentials...', 'info');
  }

  DB.save('loggedin', true);
  // Clear old seed so updated INR demo data reloads fresh
  DB.save('seeded', false);
  localStorage.removeItem('vaultx_cards');
  localStorage.removeItem('vaultx_accounts');
  localStorage.removeItem('vaultx_transactions');
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('landing-page').classList.add('hidden');

  seedDemoData();
  initApp();
}

function doLogout() {
  DB.save('loggedin', false);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
  showToast('👋 Logged out successfully', 'info');
}

// =====================================================
// SECTION 4: APP INIT
// =====================================================

function initApp() {
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  // Show loading skeletons briefly
  showSkeletons();
  setTimeout(() => {
    hideSkeletons();
    renderDashboard();
    renderCards();
    renderAccounts();
    renderTransactions();
    renderInsights();
  }, 900);
}

// =====================================================
// SECTION 5: NAVIGATION
// =====================================================

let activeSection = 'dashboard';

function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target
  document.getElementById('section-' + name).classList.remove('hidden');
  document.querySelector(`[data-section="${name}"]`)?.classList.add('active');
  document.getElementById('page-title').textContent =
    name.charAt(0).toUpperCase() + name.slice(1);

  activeSection = name;

  // Re-render charts when insights becomes visible
  if (name === 'insights')    renderInsights();
  if (name === 'dashboard')   renderDashboard();
  if (name === 'budget')      renderBudget();
  if (name === 'settings')    loadSettings();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');
}

function toggleSidebar() {
  const sb   = document.getElementById('sidebar');
  const main = document.getElementById('main-content');

  if (window.innerWidth <= 900) {
    sb.classList.toggle('mobile-open');
    return;
  }

  sidebarCollapsed = !sidebarCollapsed;
  sb.classList.toggle('collapsed', sidebarCollapsed);
  main.classList.toggle('expanded', sidebarCollapsed);
}

// =====================================================
// SECTION 6: DASHBOARD
// =====================================================

function renderDashboard() {
  updateBalanceSummary();
  renderRecentTransactions();
  renderDashboardAccounts();
  renderDashboardCards();
  drawIncomeExpenseChart();
}

function updateBalanceSummary() {
  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);
  const thisMonth    = getThisMonthTxns();
  const income   = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense  = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings  = income > 0 ? Math.round((income - expense) / income * 100) : 0;

  animateNumber('total-balance', totalBalance, true);
  animateNumber('total-income',  income,  true);
  animateNumber('total-expense', expense, true);
  document.getElementById('savings-rate').textContent = savings + '%';
}

function getThisMonthTxns() {
  const now = new Date();
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function animateNumber(id, target, isCurrency) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, duration = 800, startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = start + (target - start) * eased;
    el.textContent = isCurrency ? '₹' + val.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 }) : Math.round(val);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderRecentTransactions() {
  const el = document.getElementById('recent-txns-list');
  const recent = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  if (!recent.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:20px;">No transactions yet</p>'; return; }

  el.innerHTML = recent.map(t => `
    <div class="txn-item">
      <div class="txn-icon" style="background:${getCatColor(t.category)}22">${getCatIcon(t.category)}</div>
      <div class="txn-info">
        <div class="txn-name">${esc(t.name)}</div>
        <div class="txn-category">${t.category}</div>
      </div>
      <div class="txn-meta">
        <div class="txn-amount ${t.type}">${t.type==='income' ? '+' : '-'}₹${parseFloat(t.amount).toFixed(2)}</div>
        <div class="txn-date">${formatDate(t.date)}</div>
      </div>
    </div>
  `).join('');
}

function renderDashboardAccounts() {
  const el = document.getElementById('dash-accounts-list');
  if (!accounts.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:10px;">No accounts yet</p>'; return; }
  el.innerHTML = accounts.slice(0,4).map(a => `
    <div class="dash-account-item">
      <div class="dash-account-icon" style="background:${getColorHex(a.color)}22">🏦</div>
      <div style="flex:1">
        <div style="font-size:.87rem;font-weight:600;">${esc(a.bank)}</div>
        <div style="font-size:.74rem;color:var(--text-muted)">•••• ${a.number}</div>
      </div>
      <div style="font-weight:700;font-size:.9rem;">₹${parseFloat(a.balance).toLocaleString('en-IN')}</div>
    </div>
  `).join('');
}

function renderDashboardCards() {
  const el = document.getElementById('dash-cards-list');
  if (!cards.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:10px;">No cards yet</p>'; return; }
  el.innerHTML = cards.slice(0,4).map(c => `
    <div class="dash-card-item">
      <div class="dash-account-icon" style="background:${getColorHex(c.color)}22">💳</div>
      <div style="flex:1">
        <div style="font-size:.87rem;font-weight:600;">${c.network} ${c.type.toUpperCase()}</div>
        <div style="font-size:.74rem;color:var(--text-muted)">•••• ${c.number.slice(-4)}</div>
      </div>
      <div style="font-size:.75rem;color:var(--text-muted)">${c.expiry}</div>
    </div>
  `).join('');
}

// =====================================================
// SECTION 7: CHARTS
// =====================================================

let incomeExpenseChart = null;
let categoryChart      = null;
let monthlyTrendChart  = null;

function drawIncomeExpenseChart() {
  const canvas = document.getElementById('income-expense-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Build last 6 months data
  const months = getLast6Months();
  const incomes  = months.map(m => sumMonth(m.year, m.month, 'income'));
  const expenses = months.map(m => sumMonth(m.year, m.month, 'expense'));
  const labels   = months.map(m => m.label);

  if (incomeExpenseChart) incomeExpenseChart.destroy();
  incomeExpenseChart = drawBarChart(ctx, labels, [
    { data: incomes,  color: '#34d399', label: 'Income'   },
    { data: expenses, color: '#f87171', label: 'Expenses' }
  ]);
}

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

function drawMonthlyTrendChart() {
  const canvas = document.getElementById('monthly-trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const months   = getLast6Months();
  const netSavings = months.map(m => sumMonth(m.year, m.month, 'income') - sumMonth(m.year, m.month, 'expense'));
  const labels   = months.map(m => m.label);

  if (monthlyTrendChart) monthlyTrendChart.destroy();
  monthlyTrendChart = drawLineChart(ctx, labels, netSavings);
}

const CHART_COLORS = ['#a855f7','#60a5fa','#34d399','#fbbf24','#f87171','#fb923c','#38bdf8','#e879f9'];

/** Minimal canvas bar chart renderer */
function drawBarChart(ctx, labels, datasets) {
  const canvas = ctx.canvas;
  const W = canvas.clientWidth || 600, H = 200;
  canvas.width = W; canvas.height = H;

  const pad = { top:20, right:20, bottom:40, left:50 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const allVals = datasets.flatMap(d => d.data);
  const maxVal  = Math.max(...allVals, 1);
  const groupW  = chartW / labels.length;
  const barW    = (groupW * 0.7) / datasets.length;
  const gap     = (groupW * 0.3) / (datasets.length + 1);

  ctx.clearRect(0, 0, W, H);
  ctx.font = '11px DM Sans';
  ctx.fillStyle = '#4a5068';
  ctx.textAlign = 'right';

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    ctx.fillText('₹' + Math.round((maxVal * i / 4) / 1000) + 'k', pad.left - 4, y + 4);
  }

  // Bars
  datasets.forEach((ds, di) => {
    ds.data.forEach((val, i) => {
      const barH = (val / maxVal) * chartH;
      const x = pad.left + i * groupW + gap + di * (barW + gap);
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, ds.color);
      grad.addColorStop(1, ds.color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
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

/** Minimal canvas donut chart */
function drawDonutChart(ctx, labels, values, colors) {
  const canvas = ctx.canvas;
  const size = Math.min(canvas.clientWidth || 400, 300);
  canvas.width = size; canvas.height = size;

  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = r * 0.6;
  const total = values.reduce((a,b) => a + b, 0) || 1;
  let angle = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

  values.forEach((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.fillStyle = colors[i];
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
  ctx.font = 'bold 18px Syne';
  ctx.fillText('₹' + total.toFixed(0), cx, cy + 5);
  ctx.font = '11px DM Sans';
  ctx.fillStyle = '#4a5068';
  ctx.fillText('Total Spent', cx, cy + 22);

  return { destroy() {} };
}

/** Minimal canvas line chart */
function drawLineChart(ctx, labels, data) {
  const canvas = ctx.canvas;
  const W = canvas.clientWidth || 800, H = 200;
  canvas.width = W; canvas.height = H;

  const pad = { top:20, right:20, bottom:40, left:60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(Math.abs), 1);
  const minV = Math.min(...data, 0);
  const range = maxV - minV || 1;

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
  }

  // Gradient area
  const pts = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top + chartH - ((v - minV) / range) * chartH
  }));

  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, 'rgba(124,58,237,0.4)');
  grad.addColorStop(1, 'rgba(124,58,237,0)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cp = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 };
    ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, cp.x, cp.y);
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
    ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, cp.x, cp.y);
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
    ctx.font = '11px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], p.x, H - 10);
  });

  return { destroy() {} };
}

// Data helpers
function getLast6Months() {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('default', { month:'short' }) });
  }
  return result;
}

function sumMonth(year, month, type) {
  return transactions
    .filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month && t.type === type; })
    .reduce((s, t) => s + parseFloat(t.amount), 0);
}

function getCategoryTotals() {
  const totals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount);
  });
  // Sort by value
  return Object.fromEntries(Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,6));
}

// =====================================================
// SECTION 8: CARDS CRUD
// =====================================================

let cardEditId = null;

function openCardModal(id = null) {
  cardEditId = id;
  const modal = document.getElementById('card-modal');
  document.getElementById('card-modal-title').textContent = id ? 'Edit Card' : 'Add New Card';

  if (id) {
    const c = cards.find(c => c.id === id);
    document.getElementById('card-type').value    = c.type;
    document.getElementById('card-network').value = c.network;
    document.getElementById('card-number').value  = formatNum(c.number);
    document.getElementById('card-holder').value  = c.holder;
    document.getElementById('card-expiry').value  = c.expiry;
    document.getElementById('card-cvv').value     = c.cvv;
    document.getElementById('card-color').value   = c.color;
  } else {
    document.getElementById('card-type').value    = 'debit';
    document.getElementById('card-network').value = 'VISA';
    document.getElementById('card-number').value  = '';
    document.getElementById('card-holder').value  = '';
    document.getElementById('card-expiry').value  = '';
    document.getElementById('card-cvv').value     = '';
    document.getElementById('card-color').value   = 'purple';
  }

  // Populate linked accounts dropdown
  const sel = document.getElementById('card-linked-account');
  sel.innerHTML = '<option value="">— None —</option>' +
    accounts.map(a => `<option value="${a.id}" ${id && cards.find(c=>c.id===id)?.linkedAccount===a.id?'selected':''}>${esc(a.bank)} ••••${a.number}</option>`).join('');

  updateCardPreview();
  modal.classList.remove('hidden');
}

function saveCard() {
  const type    = document.getElementById('card-type').value;
  const network = document.getElementById('card-network').value;
  const raw     = document.getElementById('card-number').value.replace(/\s/g,'');
  const holder  = document.getElementById('card-holder').value.trim();
  const expiry  = document.getElementById('card-expiry').value.trim();
  const cvv     = document.getElementById('card-cvv').value.trim();
  const color   = document.getElementById('card-color').value;
  const linked  = document.getElementById('card-linked-account').value;

  if (!raw || raw.length < 12) { showToast('⚠️ Enter a valid card number', 'error'); return; }
  if (!holder) { showToast('⚠️ Card holder name required', 'error'); return; }
  if (!expiry) { showToast('⚠️ Expiry date required', 'error'); return; }

  if (cardEditId) {
    const idx = cards.findIndex(c => c.id === cardEditId);
    cards[idx] = { ...cards[idx], type, network, number: raw, holder, expiry, cvv, color, linkedAccount: linked };
    showToast('✅ Card updated successfully', 'success');
  } else {
    cards.push({ id: uid(), type, network, number: raw, holder: holder.toUpperCase(), expiry, cvv, color, linkedAccount: linked });
    showToast('✅ Card added successfully', 'success');
  }

  DB.save('cards', cards);
  closeModal('card-modal');
  renderCards();
  renderDashboardCards();
}

function renderCards() {
  const grid  = document.getElementById('cards-grid');
  const empty = document.getElementById('no-cards-empty');

  if (!cards.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = cards.map(c => `
    <div class="payment-card-wrapper">
      <div class="payment-card card-theme-${c.color}">

        <!-- FRONT -->
        <div class="card-face">
          <div class="card-shine"></div>
          <div class="card-circles"></div>
          <div class="card-top-row">
            <span class="card-logo">⬡ VaultX</span>
            <span class="card-type-badge">${c.type.toUpperCase()}</span>
          </div>
          <div class="card-chip"></div>
          <div class="card-number">${maskCardNumber(c.number)}</div>
          <div class="card-bottom-row">
            <div>
              <span class="card-small-label">CARD HOLDER</span>
              <span class="card-holder-name">${esc(c.holder)}</span>
            </div>
            <div>
              <span class="card-small-label">EXPIRES</span>
              <span class="card-expiry-val">${c.expiry}</span>
            </div>
            <div>
              <span class="card-network-logo">${c.network}</span>
            </div>
          </div>
        </div>

        <!-- BACK (hover to reveal CVV) -->
        <div class="card-back-face">
          <div class="card-shine"></div>
          <div class="card-back-stripe"></div>
          <div class="card-cvv-row">
            <div class="card-cvv-strip">
              <span class="cvv-label">CVV</span>
              <span>${c.cvv || '•••'}</span>
            </div>
          </div>
          <div class="card-back-logo">
            <span>⬡ VaultX</span>
            <span>${c.network}</span>
          </div>
        </div>
      </div>

      <!-- Action row below card -->
      <div class="card-actions-row">
        <button class="btn-icon" onclick="openCardModal('${c.id}')" title="Edit">✎</button>
        <button class="btn-icon" onclick="confirmDelete('card','${c.id}')" title="Delete">🗑</button>
        <span style="flex:1;font-size:.78rem;color:var(--text-muted);text-align:right;">Hover to see CVV</span>
      </div>
    </div>
  `).join('');
}

function maskCardNumber(num) {
  const clean = num.replace(/\s/g, '');
  const last4 = clean.slice(-4);
  const masked = '•••• •••• •••• ' + last4;
  return masked;
}

function formatNum(num) {
  return num.replace(/\s/g,'').replace(/(.{4})/g,'$1 ').trim();
}

function formatCardNumber(input) {
  let v = input.value.replace(/\D/g,'');
  input.value = v.replace(/(.{4})/g,'$1 ').trim().substring(0, 19);
}

function updateCardPreview() {
  const number  = document.getElementById('card-number').value || '•••• •••• •••• ••••';
  const holder  = document.getElementById('card-holder').value || 'YOUR NAME';
  const expiry  = document.getElementById('card-expiry').value || 'MM/YY';
  const network = document.getElementById('card-network').value || 'VISA';
  const type    = document.getElementById('card-type').value || 'debit';
  const color   = document.getElementById('card-color').value || 'purple';

  document.getElementById('prev-number').textContent  = number;
  document.getElementById('prev-holder').textContent  = holder.toUpperCase();
  document.getElementById('prev-expiry').textContent  = expiry;
  document.getElementById('prev-network').textContent = network;
  document.getElementById('prev-type-badge').textContent = type.toUpperCase();

  // Apply color theme to preview
  const themes = {
    purple: 'linear-gradient(135deg, #4c1d95, #7c3aed, #4338ca)',
    blue:   'linear-gradient(135deg, #1e3a8a, #1d4ed8, #0e7490)',
    green:  'linear-gradient(135deg, #064e3b, #059669, #0d9488)',
    red:    'linear-gradient(135deg, #7f1d1d, #dc2626, #db2777)',
    gold:   'linear-gradient(135deg, #78350f, #d97706, #b45309)',
    dark:   'linear-gradient(135deg, #111827, #1f2937, #374151)',
  };
  document.getElementById('live-card-preview').style.background = themes[color] || themes.purple;
}

// =====================================================
// SECTION 9: ACCOUNTS CRUD
// =====================================================

let accountEditId = null;

function openAccountModal(editId = null) {
  accountEditId = editId;
  document.getElementById('account-modal-title').textContent = editId ? 'Edit Account' : 'Add Bank Account';

  if (editId) {
    const a = accounts.find(a => a.id === editId);
    if (!a) { showToast('⚠️ Account not found', 'error'); return; }
    document.getElementById('account-bank').value    = a.bank;
    document.getElementById('account-number').value  = a.number;
    document.getElementById('account-type').value    = a.type;
    document.getElementById('account-balance').value = a.balance;
    document.getElementById('account-color').value   = a.color;
  } else {
    document.getElementById('account-bank').value    = '';
    document.getElementById('account-number').value  = '';
    document.getElementById('account-balance').value = '';
    document.getElementById('account-type').value    = 'savings';
    document.getElementById('account-color').value   = 'purple';
  }

  document.getElementById('account-modal').classList.remove('hidden');
}

function saveAccount() {
  const bank    = document.getElementById('account-bank').value.trim();
  const number  = document.getElementById('account-number').value.trim();
  const type    = document.getElementById('account-type').value;
  const balance = parseFloat(document.getElementById('account-balance').value) || 0;
  const color   = document.getElementById('account-color').value;

  if (!bank) { showToast('⚠️ Bank name is required', 'error'); return; }

  if (accountEditId) {
    const idx = accounts.findIndex(a => a.id === accountEditId);
    accounts[idx] = { ...accounts[idx], bank, number, type, balance, color };
    showToast('✅ Account updated', 'success');
  } else {
    accounts.push({ id: uid(), bank, number, type, balance, color });
    showToast('✅ Account added', 'success');
  }

  DB.save('accounts', accounts);
  closeModal('account-modal');
  renderAccounts();
  renderDashboard();
}

function renderAccounts() {
  const grid  = document.getElementById('accounts-grid');
  const empty = document.getElementById('no-accounts-empty');

  if (!accounts.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = accounts.map(a => `
    <div class="account-card color-${a.color}">
      <div class="account-bank-row">
        <div>
          <div class="account-bank-name">${esc(a.bank)}</div>
          <div class="account-number">Account •••• ${a.number || '****'}</div>
        </div>
        <span class="account-type-pill">${a.type}</span>
      </div>
      <div class="account-balance-label">Available Balance</div>
      <div class="account-balance">₹${parseFloat(a.balance).toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
      <div style="display:flex;gap:8px;">
        <button class="btn-icon" onclick="openAccountModal('${a.id}')" title="Edit">✎</button>
        <button class="btn-icon" onclick="confirmDelete('account','${a.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

// =====================================================
// SECTION 10: TRANSACTIONS CRUD
// =====================================================

let txnEditId = null;
let txnType   = 'expense';

function openTxnModal(id = null) {
  txnEditId = id;
  document.getElementById('txn-modal-title').textContent = id ? 'Edit Transaction' : 'Add Transaction';

  // Default date to today
  document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];

  if (id) {
    const t = transactions.find(t => t.id === id);
    setTxnType(t.type);
    document.getElementById('txn-name').value     = t.name;
    document.getElementById('txn-amount').value   = t.amount;
    document.getElementById('txn-date').value     = t.date;
    document.getElementById('txn-category').value = t.category;
    document.getElementById('txn-note').value     = t.note || '';
    document.getElementById('txn-account').value  = t.account || '';
  } else {
    setTxnType('expense');
    ['txn-name','txn-amount','txn-note'].forEach(id => document.getElementById(id).value = '');
  }

  // Populate accounts dropdown
  const sel = document.getElementById('txn-account');
  sel.innerHTML = '<option value="">— None —</option>' +
    accounts.map(a => `<option value="${a.id}">${esc(a.bank)} ••••${a.number}</option>`).join('');
  if (id) sel.value = transactions.find(t => t.id === id)?.account || '';

  document.getElementById('txn-modal').classList.remove('hidden');
}

function setTxnType(type) {
  txnType = type;
  const incBtn  = document.getElementById('toggle-income');
  const expBtn  = document.getElementById('toggle-expense');
  incBtn.className = 'type-btn' + (type === 'income'  ? ' active-income'  : '');
  expBtn.className = 'type-btn' + (type === 'expense' ? ' active-expense' : '');
}

function saveTransaction() {
  const name     = document.getElementById('txn-name').value.trim();
  const amount   = parseFloat(document.getElementById('txn-amount').value);
  const date     = document.getElementById('txn-date').value;
  const category = document.getElementById('txn-category').value;
  const note     = document.getElementById('txn-note').value.trim();
  const account  = document.getElementById('txn-account').value;

  if (!name)          { showToast('⚠️ Description is required', 'error'); return; }
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount', 'error'); return; }
  if (!date)          { showToast('⚠️ Date is required', 'error'); return; }

  if (txnEditId) {
    const idx = transactions.findIndex(t => t.id === txnEditId);
    transactions[idx] = { ...transactions[idx], type: txnType, name, amount, date, category, note, account };
    showToast('✅ Transaction updated', 'success');
  } else {
    transactions.push({ id: uid(), type: txnType, name, amount, date, category, note, account });
    showToast('✅ Transaction added', 'success');
  }

  DB.save('transactions', transactions);
  closeModal('txn-modal');
  renderTransactions();
  renderDashboard();
}

function renderTransactions() {
  const list  = document.getElementById('txn-list');
  const empty = document.getElementById('no-txns-empty');

  const search   = document.getElementById('txn-search')?.value.toLowerCase() || '';
  const category = document.getElementById('txn-category-filter')?.value || '';
  const type     = document.getElementById('txn-type-filter')?.value || '';
  const sort     = document.getElementById('txn-sort')?.value || 'date-desc';

  let filtered = [...transactions];
  if (search)   filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || t.category.toLowerCase().includes(search));
  if (category) filtered = filtered.filter(t => t.category === category);
  if (type)     filtered = filtered.filter(t => t.type === type);

  switch(sort) {
    case 'date-desc':   filtered.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
    case 'date-asc':    filtered.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
    case 'amount-desc': filtered.sort((a,b) => b.amount - a.amount); break;
    case 'amount-asc':  filtered.sort((a,b) => a.amount - b.amount); break;
  }

  if (!filtered.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = filtered.map(t => {
    const acc = accounts.find(a => a.id === t.account);
    return `
      <div class="txn-list-item">
        <div class="txn-list-icon" style="background:${getCatColor(t.category)}22">${getCatIcon(t.category)}</div>
        <div class="txn-list-info">
          <div class="txn-list-name">${esc(t.name)}</div>
          <div class="txn-list-meta">
            <span>${formatDate(t.date)}</span>
            <span>${acc ? esc(acc.bank) : 'Manual'}</span>
            ${t.note ? `<span>${esc(t.note)}</span>` : ''}
          </div>
        </div>
        <div class="txn-list-right">
          <div class="txn-list-amount ${t.type}">${t.type==='income' ? '+' : '-'}₹${parseFloat(t.amount).toFixed(2)}</div>
          <span class="cat-badge" style="background:${getCatColor(t.category)}22;color:${getCatColor(t.category)}">${t.category}</span>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn-icon" onclick="openTxnModal('${t.id}')" title="Edit">✎</button>
            <button class="btn-icon" onclick="confirmDelete('txn','${t.id}')" title="Delete">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =====================================================
// SECTION 11: INSIGHTS
// =====================================================

function renderInsights() {
  drawCategoryChart();
  renderCategoryBreakdown();
  drawMonthlyTrendChart();
}

function renderCategoryBreakdown() {
  const el = document.getElementById('category-breakdown');
  const totals = getCategoryTotals();
  const max = Math.max(...Object.values(totals), 1);

  el.innerHTML = Object.entries(totals).map(([cat, amt], i) => `
    <div class="cat-row">
      <div style="font-size:1.1rem">${getCatIcon(cat)}</div>
      <div class="cat-row-label">${cat}</div>
      <div class="cat-row-bar-wrap">
        <div class="cat-row-bar" style="width:${(amt/max*100).toFixed(1)}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
      </div>
      <div class="cat-row-amount">₹${amt.toFixed(0)}</div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);font-size:.85rem;padding:20px;text-align:center">No expense data yet</p>';
}

// =====================================================
// SECTION 12: DELETE / CONFIRM
// =====================================================

function confirmDelete(type, id) {
  const modal = document.getElementById('confirm-modal');
  const btn   = document.getElementById('confirm-action-btn');
  const text  = document.getElementById('confirm-text');

  const labels = { card: 'card', account: 'bank account', txn: 'transaction' };
  text.textContent = `Delete this ${labels[type]}? This cannot be undone.`;

  btn.onclick = () => {
    if (type === 'card')    { cards        = cards.filter(c => c.id !== id); DB.save('cards', cards); renderCards(); renderDashboardCards(); }
    if (type === 'account') { accounts     = accounts.filter(a => a.id !== id); DB.save('accounts', accounts); renderAccounts(); renderDashboard(); }
    if (type === 'txn')     { transactions = transactions.filter(t => t.id !== id); DB.save('transactions', transactions); renderTransactions(); renderDashboard(); }

    closeModal('confirm-modal');
    showToast('🗑 Deleted successfully', 'info');
  };

  modal.classList.remove('hidden');
}

// =====================================================
// SECTION 13: MODALS UTILITY
// =====================================================

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// =====================================================
// SECTION 14: FAB MENU
// =====================================================

function openFABMenu() {
  const btn  = document.getElementById('fab-btn');
  const menu = document.getElementById('fab-menu');
  const open = !menu.classList.contains('hidden');

  if (open) { closeFABMenu(); }
  else {
    menu.classList.remove('hidden');
    btn.classList.add('open');
  }
}

function closeFABMenu() {
  document.getElementById('fab-menu').classList.add('hidden');
  document.getElementById('fab-btn').classList.remove('open');
}

// =====================================================
// SECTION 15: TOAST NOTIFICATIONS
// =====================================================

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =====================================================
// SECTION 16: GLOBAL SEARCH
// =====================================================

function globalSearch(val) {
  if (!val.trim()) return;
  // Switch to transactions and apply search
  showSection('transactions');
  document.getElementById('txn-search').value = val;
  renderTransactions();
}

// =====================================================
// SECTION 17: SKELETON LOADERS
// =====================================================

function showSkeletons() {
  document.querySelectorAll('.skeleton-target').forEach(el => {
    el.style.opacity = '0.5';
    el.classList.add('skeleton');
  });
}

function hideSkeletons() {
  document.querySelectorAll('.skeleton-target').forEach(el => {
    el.style.opacity = '1';
    el.classList.remove('skeleton');
  });
}

// =====================================================
// SECTION 18: HELPER UTILITIES
// =====================================================

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getColorHex(color) {
  const map = { purple:'#7c3aed', blue:'#2563eb', green:'#059669', red:'#dc2626', gold:'#d97706' };
  return map[color] || '#7c3aed';
}

function getCatIcon(cat) {
  const icons = {
    'Food & Dining':     '🍔',
    'Travel':            '✈️',
    'Bills & Utilities': '⚡',
    'Shopping':          '🛍️',
    'Entertainment':     '🎬',
    'Health':            '💊',
    'Education':         '📚',
    'Salary':            '💼',
    'Investment':        '📈',
    'Other':             '💸',
  };
  return icons[cat] || '💳';
}

function getCatColor(cat) {
  const colors = {
    'Food & Dining':     '#f59e0b',
    'Travel':            '#60a5fa',
    'Bills & Utilities': '#a78bfa',
    'Shopping':          '#f472b6',
    'Entertainment':     '#fb923c',
    'Health':            '#34d399',
    'Education':         '#38bdf8',
    'Salary':            '#4ade80',
    'Investment':        '#818cf8',
    'Other':             '#94a3b8',
  };
  return colors[cat] || '#94a3b8';
}

// =====================================================
// SECTION 19: BOOT
// =====================================================

// =====================================================
// SECTION 20: BUDGET TRACKER
// =====================================================

let budgets     = DB.load('budgets', []);
let budgetEditId = null;

function openBudgetModal(id = null) {
  budgetEditId = id;
  document.getElementById('budget-modal-title').textContent = id ? 'Edit Budget' : 'Set Category Budget';

  if (id) {
    const b = budgets.find(b => b.id === id);
    document.getElementById('budget-category').value  = b.category;
    document.getElementById('budget-amount').value    = b.limit;
    document.getElementById('budget-alert-pct').value = b.alertPct;
  } else {
    document.getElementById('budget-amount').value    = '';
    document.getElementById('budget-alert-pct').value = '80';
  }

  document.getElementById('budget-modal').classList.remove('hidden');
}

function saveBudget() {
  const category = document.getElementById('budget-category').value;
  const limit    = parseFloat(document.getElementById('budget-amount').value);
  const alertPct = parseInt(document.getElementById('budget-alert-pct').value) || 80;

  if (!limit || limit <= 0) { showToast('⚠️ Enter a valid budget limit', 'error'); return; }

  // Prevent duplicate category (unless editing)
  const duplicate = budgets.find(b => b.category === category && b.id !== budgetEditId);
  if (duplicate) { showToast('⚠️ Budget for this category already exists', 'error'); return; }

  if (budgetEditId) {
    const idx = budgets.findIndex(b => b.id === budgetEditId);
    budgets[idx] = { ...budgets[idx], category, limit, alertPct };
    showToast('✅ Budget updated', 'success');
  } else {
    budgets.push({ id: uid(), category, limit, alertPct });
    showToast('✅ Budget set for ' + category, 'success');
  }

  DB.save('budgets', budgets);
  closeModal('budget-modal');
  renderBudget();
}

function renderBudget() {
  const list  = document.getElementById('budget-list');
  const empty = document.getElementById('no-budget-empty');

  // Calculate this-month spending per category
  const thisMonth = getThisMonthTxns().filter(t => t.type === 'expense');
  const spentMap  = {};
  thisMonth.forEach(t => { spentMap[t.category] = (spentMap[t.category] || 0) + parseFloat(t.amount); });

  if (!budgets.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    updateBudgetOverview(spentMap);
    return;
  }
  empty.classList.add('hidden');

  // Sort by % used descending
  const sorted = [...budgets].sort((a, b) => {
    const pA = (spentMap[a.category] || 0) / a.limit;
    const pB = (spentMap[b.category] || 0) / b.limit;
    return pB - pA;
  });

  list.innerHTML = sorted.map(b => {
    const spent = spentMap[b.category] || 0;
    const pct   = Math.min((spent / b.limit) * 100, 100);
    const remaining = Math.max(b.limit - spent, 0);
    const overBudget = spent > b.limit;

    let status = 'ok';
    if (pct >= 100)         status = 'danger';
    else if (pct >= b.alertPct) status = 'warning';

    const chipText = overBudget
      ? `🚨 Over by ₹${(spent - b.limit).toFixed(0)}`
      : status === 'warning'
        ? `⚠️ ${pct.toFixed(0)}% used`
        : `✓ On track`;

    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <div class="budget-item-left">
            <div class="budget-cat-icon">${getCatIcon(b.category)}</div>
            <div>
              <div class="budget-cat-name">${esc(b.category)}</div>
              <div class="budget-cat-sub">Alert at ${b.alertPct}%</div>
            </div>
          </div>
          <div class="budget-item-right">
            <div class="budget-amounts">
              <span class="spent">₹${spent.toLocaleString('en-IN', {maximumFractionDigits:0})}</span>
              <span class="limit"> / ₹${b.limit.toLocaleString('en-IN')}</span>
            </div>
            <div class="budget-alert-chip ${status}">${chipText}</div>
          </div>
        </div>
        <div class="budget-bar-wrap">
          <div class="budget-bar ${status}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="budget-item-footer">
          <span class="budget-remaining-text">
            ${overBudget
              ? `<span style="color:var(--neon-red)">Over budget by ₹${(spent-b.limit).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>`
              : `₹${remaining.toLocaleString('en-IN',{maximumFractionDigits:0})} remaining`
            }
          </span>
          <div style="display:flex;gap:8px;">
            <button class="btn-icon" onclick="openBudgetModal('${b.id}')" title="Edit">✎</button>
            <button class="btn-icon" onclick="confirmDelete('budget','${b.id}')" title="Delete">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateBudgetOverview(spentMap);
}

function updateBudgetOverview(spentMap) {
  if (!budgets.length) {
    ['budget-total-set','budget-total-spent','budget-remaining'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '₹0';
    });
    const bar = document.getElementById('budget-master-bar'); if (bar) bar.style.width = '0%';
    const pct = document.getElementById('budget-overall-pct'); if (pct) pct.textContent = '0% used';
    return;
  }

  const totalSet   = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentMap[b.category] || 0), 0);
  const remaining  = Math.max(totalSet - totalSpent, 0);
  const pct        = Math.min((totalSpent / totalSet) * 100, 100);

  const fmt = v => '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const el1 = document.getElementById('budget-total-set');   if (el1) el1.textContent = fmt(totalSet);
  const el2 = document.getElementById('budget-total-spent'); if (el2) el2.textContent = fmt(totalSpent);
  const el3 = document.getElementById('budget-remaining');   if (el3) el3.textContent = fmt(remaining);

  const bar = document.getElementById('budget-master-bar');
  if (bar) {
    bar.style.width = pct.toFixed(1) + '%';
    bar.className = 'budget-master-bar' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
  }
  const badge = document.getElementById('budget-overall-pct');
  if (badge) badge.textContent = pct.toFixed(0) + '% used';
}

// Hook budget delete into confirmDelete
const _origConfirmDelete = window.confirmDelete;
// Override confirmDelete to support 'budget' type
function confirmDelete(type, id) {
  const modal = document.getElementById('confirm-modal');
  const btn   = document.getElementById('confirm-action-btn');
  const text  = document.getElementById('confirm-text');

  const labels = { card:'card', account:'bank account', txn:'transaction', budget:'budget' };
  text.textContent = `Delete this ${labels[type] || type}? This cannot be undone.`;

  btn.onclick = () => {
    if (type === 'card')    { cards        = cards.filter(c => c.id !== id);        DB.save('cards', cards);        renderCards();        renderDashboardCards(); }
    if (type === 'account') { accounts     = accounts.filter(a => a.id !== id);     DB.save('accounts', accounts);  renderAccounts();     renderDashboard(); }
    if (type === 'txn')     { transactions = transactions.filter(t => t.id !== id); DB.save('transactions', transactions); renderTransactions(); renderDashboard(); }
    if (type === 'budget')  { budgets      = budgets.filter(b => b.id !== id);      DB.save('budgets', budgets);    renderBudget(); }

    closeModal('confirm-modal');
    showToast('🗑 Deleted successfully', 'info');
  };

  modal.classList.remove('hidden');
}

// =====================================================
// SECTION 21: SETTINGS & PROFILE
// =====================================================

let prefs = DB.load('prefs', { sound: false, balances: true, compact: false });

function loadSettings() {
  const profile = DB.load('profile', { name: 'Alex Morgan', email: 'alex@vaultx.in' });

  const nameEl  = document.getElementById('settings-name');
  const emailEl = document.getElementById('settings-email');
  if (nameEl)  nameEl.value  = profile.name;
  if (emailEl) emailEl.value = profile.email;

  updateProfileDisplay(profile);

  // Restore preference toggles
  const soundEl   = document.getElementById('pref-sound');
  const balEl     = document.getElementById('pref-balances');
  const compactEl = document.getElementById('pref-compact');
  if (soundEl)   soundEl.checked   = prefs.sound;
  if (balEl)     balEl.checked     = prefs.balances;
  if (compactEl) compactEl.checked = prefs.compact;

  applyPrefs();
}

function saveProfile() {
  const name  = document.getElementById('settings-name').value.trim();
  const email = document.getElementById('settings-email').value.trim();
  if (!name) { showToast('⚠️ Name is required', 'error'); return; }

  const profile = { name, email };
  DB.save('profile', profile);
  updateProfileDisplay(profile);

  // Update sidebar & topbar avatar initials
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
  document.querySelectorAll('.user-name').forEach(el => el.textContent = name);

  showToast('✅ Profile saved', 'success');
}

function updateProfileDisplay(profile) {
  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avEl = document.getElementById('profile-avatar-display');
  const nmEl = document.getElementById('profile-name-display');
  const emEl = document.getElementById('profile-email-display');
  if (avEl) avEl.textContent = initials;
  if (nmEl) nmEl.textContent = profile.name;
  if (emEl) emEl.textContent = profile.email || '—';
}

function savePref(key, val) {
  prefs[key] = val;
  DB.save('prefs', prefs);
  applyPrefs();
  showToast('✅ Preference saved', 'success');
}

function applyPrefs() {
  document.body.classList.toggle('compact', !!prefs.compact);
}

// =====================================================
// SECTION 22: EXPORT CSV
// =====================================================

function exportCSV() {
  if (!transactions.length) { showToast('⚠️ No transactions to export', 'error'); return; }

  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount (₹)', 'Account', 'Note'];
  const rows = transactions
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .map(t => {
      const acc = accounts.find(a => a.id === t.account);
      return [
        t.date,
        `"${t.name.replace(/"/g,'""')}"`,
        t.category,
        t.type,
        t.amount.toFixed(2),
        acc ? `"${acc.bank}"` : 'Manual',
        `"${(t.note || '').replace(/"/g,'""')}"`
      ].join(',');
    });

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `VaultX_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('✅ CSV exported successfully', 'success');
}

// =====================================================
// SECTION 23: BACKUP / RESTORE
// =====================================================

function backupData() {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    cards,
    accounts,
    transactions,
    budgets,
    prefs,
    profile: DB.load('profile', {}),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `VaultX_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('💾 Backup downloaded', 'success');
}

function confirmResetAll() {
  const modal = document.getElementById('confirm-modal');
  const btn   = document.getElementById('confirm-action-btn');
  const text  = document.getElementById('confirm-text');

  text.textContent = 'This will permanently delete ALL your cards, accounts, transactions and budgets. This cannot be undone!';
  btn.onclick = () => {
    ['cards','accounts','transactions','budgets','seeded','profile','prefs'].forEach(k => localStorage.removeItem('vaultx_' + k));
    closeModal('confirm-modal');
    showToast('🗑 All data reset. Reloading...', 'info');
    setTimeout(() => location.reload(), 1500);
  };
  modal.classList.remove('hidden');
}

// =====================================================
// SECTION 24: KEYBOARD SHORTCUTS
// =====================================================

document.addEventListener('keydown', (e) => {
  // Don't fire if user is typing in an input
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  // Don't fire if a modal is open
  const openModal = document.querySelector('.modal-overlay:not(.hidden)');
  if (e.key === 'Escape' && openModal) {
    openModal.classList.add('hidden');
    return;
  }
  if (openModal) return;

  const map = {
    '1': 'dashboard', '2': 'cards', '3': 'accounts',
    '4': 'transactions', '5': 'insights', '6': 'budget', '7': 'settings',
  };

  if (map[e.key])  { showSection(map[e.key]); return; }
  if (e.key === 't' || e.key === 'T') { openTxnModal(); return; }
  if (e.key === 'c' || e.key === 'C') { openCardModal(); return; }
  if (e.key === 'a' || e.key === 'A') { openAccountModal(); return; }
});

// =====================================================
// SECTION 25: SCROLL-TO-TOP BUTTON
// =====================================================

function initScrollTop() {
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.title = 'Back to top';
  btn.textContent = '↑';
  document.body.appendChild(btn);

  const main = document.getElementById('main-content');
  if (!main) return;

  main.addEventListener('scroll', () => {
    btn.classList.toggle('visible', main.scrollTop > 300);
  });

  btn.addEventListener('click', () => {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// =====================================================
// SECTION 26: SMART GREETING
// =====================================================

function updateGreeting() {
  const profile = DB.load('profile', { name: 'Alex Morgan' });
  const firstName = profile.name.split(' ')[0];
  const h = new Date().getHours();
  let greeting = h < 12 ? '☀️ Good morning' : h < 17 ? '👋 Good afternoon' : '🌙 Good evening';
  const el = document.querySelector('#section-dashboard .section-heading h2');
  if (el) el.textContent = `${greeting}, ${firstName}!`;
}

// =====================================================
// SECTION 27: BUDGET ALERT CHECKER
// =====================================================

function checkBudgetAlerts() {
  if (!budgets.length) return;
  const spentMap = {};
  getThisMonthTxns().filter(t => t.type === 'expense').forEach(t => {
    spentMap[t.category] = (spentMap[t.category] || 0) + parseFloat(t.amount);
  });

  budgets.forEach(b => {
    const spent = spentMap[b.category] || 0;
    const pct   = (spent / b.limit) * 100;
    if (pct >= 100 && !sessionStorage.getItem('alerted_over_' + b.id)) {
      showToast(`🚨 ${b.category} is over budget!`, 'error');
      sessionStorage.setItem('alerted_over_' + b.id, '1');
    } else if (pct >= b.alertPct && !sessionStorage.getItem('alerted_warn_' + b.id)) {
      showToast(`⚠️ ${b.category}: ${pct.toFixed(0)}% of budget used`, 'info');
      sessionStorage.setItem('alerted_warn_' + b.id, '1');
    }
  });
}

// =====================================================
// PATCH: Upgrade initApp to call new features
// =====================================================

const _origInitApp = initApp;
function initApp() {
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  budgets = DB.load('budgets', []);
  loadSettings();

  showSkeletons();
  setTimeout(() => {
    hideSkeletons();
    renderDashboard();
    renderCards();
    renderAccounts();
    renderTransactions();
    renderInsights();
    renderBudget();
    updateGreeting();
    checkBudgetAlerts();
    initScrollTop();
  }, 900);
}


// =====================================================
// SECTION 28: BOOT
// =====================================================

window.addEventListener('DOMContentLoaded', () => {
  if (DB.load('loggedin', false)) {
    document.getElementById('landing-page').classList.add('hidden');
    seedDemoData();
    initApp();
  }
});