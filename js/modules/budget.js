/* =====================================================
   VaultX — Budget Planner Module Logic
   ===================================================== */

let budgetEditId = null;

/** Open category budget add/edit modal */
function openBudgetModal(id = null) {
  budgetEditId = id;
  const modal = document.getElementById('budget-modal');
  if (!modal) return;
  document.getElementById('budget-modal-title').textContent = id ? 'Edit Budget' : 'Set Category Budget';

  if (id) {
    const b = budgets.find(b => b.id === id);
    if (b) {
      document.getElementById('budget-category').value  = b.category;
      document.getElementById('budget-amount').value    = b.limit;
      document.getElementById('budget-alert-pct').value = b.alertPct;
    }
  } else {
    document.getElementById('budget-amount').value    = '';
    document.getElementById('budget-alert-pct').value = '80';
  }

  modal.classList.remove('hidden');
}

/** Save budget limit form */
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
    if (idx !== -1) {
      budgets[idx] = { ...budgets[idx], category, limit, alertPct };
      showToast('✅ Budget updated', 'success');
    }
  } else {
    budgets.push({ id: uid(), category, limit, alertPct });
    showToast('✅ Budget set for ' + category, 'success');
  }

  DB.save('budgets', budgets);
  closeModal('budget-modal');
  renderBudget();
  if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
}

/** Render budget list and progress bars */
function renderBudget() {
  const list  = document.getElementById('budget-list');
  const empty = document.getElementById('no-budget-empty');
  if (!list || !empty) return;

  // Calculate this-month spending per category
  const thisMonth = getThisMonthTxns().filter(t => t.type === 'expense');
  const spentMap  = {};
  thisMonth.forEach(t => {
    spentMap[t.category] = (spentMap[t.category] || 0) + parseFloat(t.amount);
  });

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
              <span class="spent">₹${spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
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
              ? `<span style="color:var(--neon-red)">Over budget by ₹${(spent - b.limit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>`
              : `₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} remaining`
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

/** Update Master Monthly Budget progress bar and totals */
function updateBudgetOverview(spentMap) {
  if (!budgets.length) {
    ['budget-total-set', 'budget-total-spent', 'budget-remaining'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '₹0';
    });
    const bar = document.getElementById('budget-master-bar');
    if (bar) bar.style.width = '0%';
    const pct = document.getElementById('budget-overall-pct');
    if (pct) pct.textContent = '0% used';
    return;
  }

  const totalSet   = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentMap[b.category] || 0), 0);
  const remaining  = Math.max(totalSet - totalSpent, 0);
  const pct        = Math.min((totalSpent / totalSet) * 100, 100);

  const fmt = v => '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const el1 = document.getElementById('budget-total-set');
  const el2 = document.getElementById('budget-total-spent');
  const el3 = document.getElementById('budget-remaining');
  if (el1) el1.textContent = fmt(totalSet);
  if (el2) el2.textContent = fmt(totalSpent);
  if (el3) el3.textContent = fmt(remaining);

  const bar = document.getElementById('budget-master-bar');
  if (bar) {
    bar.style.width = pct.toFixed(1) + '%';
    bar.className = 'budget-master-bar' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
  }
  const badge = document.getElementById('budget-overall-pct');
  if (badge) badge.textContent = pct.toFixed(0) + '% used';
}

/** Toast notifications for exceeded budgets */
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
