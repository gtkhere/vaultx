/* =====================================================
   VaultX — Transactions Module Logic
   ===================================================== */

let txnEditId = null;
let txnType   = 'expense';

/** Open transaction add/edit modal */
function openTxnModal(id = null) {
  txnEditId = id;
  const modal = document.getElementById('txn-modal');
  if (!modal) return;
  document.getElementById('txn-modal-title').textContent = id ? 'Edit Transaction' : 'Add Transaction';

  // Default date to today
  document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];

  if (id) {
    const t = transactions.find(t => t.id === id);
    if (t) {
      setTxnType(t.type);
      document.getElementById('txn-name').value     = t.name;
      document.getElementById('txn-amount').value   = t.amount;
      document.getElementById('txn-date').value     = t.date;
      document.getElementById('txn-category').value = t.category;
      document.getElementById('txn-note').value     = t.note || '';
    }
  } else {
    setTxnType('expense');
    ['txn-name', 'txn-amount', 'txn-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  // Populate accounts dropdown
  const accSel = document.getElementById('txn-account');
  if (accSel) {
    accSel.innerHTML = '<option value="">— None —</option>' +
      accounts.map(a => `<option value="${a.id}">${esc(a.bank)} ••••${a.number}</option>`).join('');
    if (id) accSel.value = transactions.find(t => t.id === id)?.account || '';
  }

  // Populate cards dropdown
  const cardSel = document.getElementById('txn-card');
  if (cardSel) {
    cardSel.innerHTML = '<option value="">— Direct Account / None —</option>' +
      cards.map(c => {
        const isCredit = c.type === 'credit';
        const typeLabel = isCredit ? 'Credit' : 'Debit';
        const last4 = (c.number || '').slice(-4) || '••••';
        return `<option value="${c.id}">${esc(c.network)} ••••${last4} (${typeLabel})</option>`;
      }).join('');
    if (id) {
      cardSel.value = transactions.find(t => t.id === id)?.card || '';
    } else {
      cardSel.value = '';
    }
  }

  onTxnCardSelect();
  modal.classList.remove('hidden');
}

/** Handle selecting a card in the transaction modal */
function onTxnCardSelect() {
  const cardId = document.getElementById('txn-card')?.value;
  const accSel = document.getElementById('txn-account');
  const hintEl = document.getElementById('txn-card-hint');

  if (!cardId) {
    if (hintEl) hintEl.textContent = 'Select a card to track debit or credit card spending.';
    return;
  }

  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  if (card.type === 'credit') {
    if (accSel) accSel.value = '';
    if (hintEl) hintEl.textContent = '💳 Credit Card: Purchase increases card outstanding debt. Bank account is not deducted until bill payment.';
  } else {
    // Debit Card
    if (card.linkedAccount) {
      if (accSel) accSel.value = card.linkedAccount;
      const acc = accounts.find(a => a.id === card.linkedAccount);
      if (hintEl) hintEl.textContent = `💳 Debit Card: Debited directly from linked ${acc ? esc(acc.bank) : 'bank account'}.`;
    } else {
      if (hintEl) hintEl.textContent = '⚠️ Debit Card: No bank account currently linked. Select an account or link one in Cards.';
    }
  }
}

/** Handle selecting a bank account directly in the transaction modal */
function onTxnAccountSelect() {
  const accId = document.getElementById('txn-account')?.value;
  const cardSel = document.getElementById('txn-card');
  const cardId = cardSel?.value;
  const hintEl = document.getElementById('txn-card-hint');

  if (!cardId) return;

  const card = cards.find(c => c.id === cardId);
  if (card && card.type === 'credit' && accId) {
    if (cardSel) cardSel.value = '';
    if (hintEl) hintEl.textContent = 'Direct bank account selected. Card selection cleared.';
  }
}

/** Set transaction type: income or expense */
function setTxnType(type) {
  txnType = type;
  const incBtn = document.getElementById('toggle-income');
  const expBtn = document.getElementById('toggle-expense');
  if (incBtn) incBtn.className = 'type-btn' + (type === 'income'  ? ' active-income'  : '');
  if (expBtn) expBtn.className = 'type-btn' + (type === 'expense' ? ' active-expense' : '');
}

/** Save transaction with automatic card debt and bank account balance sync */
function saveTransaction() {
  const name     = document.getElementById('txn-name').value.trim();
  const amount   = parseFloat(document.getElementById('txn-amount').value);
  const date     = document.getElementById('txn-date').value;
  const category = document.getElementById('txn-category').value;
  const note     = document.getElementById('txn-note').value.trim();
  const account  = document.getElementById('txn-account').value;
  const cardId   = document.getElementById('txn-card')?.value || '';

  if (!name) { showToast('⚠️ Description is required', 'error'); return; }
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount', 'error'); return; }
  if (!date) { showToast('⚠️ Date is required', 'error'); return; }

  const card = cardId ? cards.find(c => c.id === cardId) : null;
  const isCredit = card && card.type === 'credit';

  // For credit card purchases, bank account is not immediately deducted
  const effectiveAccount = isCredit ? '' : (account || (card?.linkedAccount || ''));

  if (txnEditId) {
    const idx = transactions.findIndex(t => t.id === txnEditId);
    if (idx !== -1) {
      const oldTxn = transactions[idx];
      const updatedTxn = {
        ...oldTxn,
        type: txnType,
        name,
        amount,
        date,
        category,
        note,
        account: effectiveAccount,
        card: cardId || undefined,
        createdAt: oldTxn.createdAt || Date.now()
      };
      syncBalancesOnTxnEdit(oldTxn, updatedTxn);
      transactions[idx] = updatedTxn;
      showToast('✅ Transaction updated', 'success');
    }
  } else {
    const newTxn = {
      id: uid(),
      type: txnType,
      name,
      amount,
      date,
      category,
      note,
      account: effectiveAccount,
      card: cardId || undefined,
      createdAt: Date.now()
    };

    if (isCredit) {
      if (txnType === 'expense') {
        card.balance = Math.round(((parseFloat(card.balance) || 0) + amount) * 100) / 100;
      } else {
        card.balance = Math.max(0, Math.round(((parseFloat(card.balance) || 0) - amount) * 100) / 100);
      }
      DB.save('cards', cards);
    } else if (newTxn.account) {
      const impact = getTxnNetImpact(newTxn);
      if (impact !== 0) {
        adjustAccountBalance(newTxn.account, impact);
        DB.save('accounts', accounts);
      }
    }

    transactions.push(newTxn);
    showToast('✅ Transaction added', 'success');
  }

  DB.save('transactions', transactions);
  closeModal('txn-modal');
  renderTransactions();
  renderAccounts();
  renderCards();
  renderDashboardCards();
  renderDashboard();
  if (activeSection === 'budget') renderBudget();
  if (activeSection === 'insights') renderInsights();
  if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
}

/**
 * Safely parse any transaction date into a numeric epoch millisecond timestamp.
 * Handles:
 *  - Standard 'YYYY-MM-DD'
 *  - Formatted readable strings like 'November 4, 2026', 'Nov 4, 2026'
 *  - ISO strings ('YYYY-MM-DDTHH:mm:ss.sssZ')
 *  - Date instances and numeric timestamps
 *  - Missing, empty, or invalid date values (returns 0 safely to prevent NaN sort corruption)
 */
function parseTxnDate(val) {
  if (!val) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;

    // Standard YYYY-MM-DD format parsed at local midnight to avoid UTC timezone day shifts
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year  = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day   = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day, 0, 0, 0, 0);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    }

    // Try standard date parsing for strings like 'November 4, 2026'
    const parsed = new Date(trimmed).getTime();
    if (!isNaN(parsed)) return parsed;

    const ts = Date.parse(trimmed);
    if (!isNaN(ts)) return ts;
  }
  return 0;
}

/**
 * Handle changes to the transactions sorting dropdown.
 * Persists the sort preference in localStorage so it remains correct after browser refresh.
 */
function onTxnSortChange() {
  const sortSel = document.getElementById('txn-sort');
  if (sortSel) {
    DB.save('txn_sort', sortSel.value);
  }
  renderTransactions();
}

/** Render transaction list with filtering and search */
function renderTransactions() {
  const list  = document.getElementById('txn-list');
  const empty = document.getElementById('no-txns-empty');
  if (!list || !empty) return;

  const sortSel = document.getElementById('txn-sort');
  let sort = 'date-desc';

  if (sortSel) {
    // If not yet initialized in current DOM, restore persisted sort choice
    if (!sortSel.dataset.initialized) {
      const savedSort = DB.load('txn_sort', 'date-desc');
      if (savedSort && Array.from(sortSel.options).some(o => o.value === savedSort)) {
        sortSel.value = savedSort;
      }
      sortSel.dataset.initialized = 'true';
    }
    sort = sortSel.value || 'date-desc';
    // Keep persisted state in sync
    DB.save('txn_sort', sort);
  }

  const search   = document.getElementById('txn-search')?.value.toLowerCase() || '';
  const category = document.getElementById('txn-category-filter')?.value || '';
  const type     = document.getElementById('txn-type-filter')?.value || '';

  // Filter transactions without modifying original stored array
  let filtered = [...transactions];
  if (search) {
    filtered = filtered.filter(t => 
      (t.name && t.name.toLowerCase().includes(search)) || 
      (t.category && t.category.toLowerCase().includes(search)) ||
      (t.note && t.note.toLowerCase().includes(search))
    );
  }
  if (category) filtered = filtered.filter(t => t.category === category);
  if (type)     filtered = filtered.filter(t => t.type === type);

  // Apply deterministic, safe sorting using actual transaction dates and creation timestamps
  switch (sort) {
    case 'date-desc':
      filtered.sort((a, b) => {
        const diff = parseTxnDate(b.date) - parseTxnDate(a.date);
        if (diff !== 0) return diff;
        // Same date tie-breaker: newest created transaction appears first (at the top)
        return getTxnCreatedAt(b) - getTxnCreatedAt(a);
      });
      break;
    case 'date-asc':
      filtered.sort((a, b) => {
        const diff = parseTxnDate(a.date) - parseTxnDate(b.date);
        if (diff !== 0) return diff;
        // Same date tie-breaker: earliest created transaction appears first
        return getTxnCreatedAt(a) - getTxnCreatedAt(b);
      });
      break;
    case 'amount-desc':
      filtered.sort((a, b) => {
        const diff = (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
        if (diff !== 0) return diff;
        const dateDiff = parseTxnDate(b.date) - parseTxnDate(a.date);
        if (dateDiff !== 0) return dateDiff;
        return getTxnCreatedAt(b) - getTxnCreatedAt(a);
      });
      break;
    case 'amount-asc':
      filtered.sort((a, b) => {
        const diff = (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
        if (diff !== 0) return diff;
        const dateDiff = parseTxnDate(a.date) - parseTxnDate(b.date);
        if (dateDiff !== 0) return dateDiff;
        return getTxnCreatedAt(a) - getTxnCreatedAt(b);
      });
      break;
    default:
      filtered.sort((a, b) => {
        const diff = parseTxnDate(b.date) - parseTxnDate(a.date);
        return diff !== 0 ? diff : getTxnCreatedAt(b) - getTxnCreatedAt(a);
      });
      break;
  }

  if (!filtered.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = filtered.map(t => {
    const acc = accounts.find(a => a.id === t.account);
    const card = t.card ? cards.find(c => c.id === t.card) : null;

    let sourceMeta = 'Manual';
    if (t.isBillPayment) {
      sourceMeta = `💳 Bill Pay · ${acc ? esc(acc.bank) : 'Bank'}`;
    } else if (card) {
      sourceMeta = `💳 ${esc(card.network)} ••••${(card.number || '').slice(-4)} (${card.type === 'credit' ? 'Credit' : 'Debit'})`;
    } else if (acc) {
      sourceMeta = esc(acc.bank);
    }

    return `
      <div class="txn-list-item">
        <div class="txn-list-icon" style="background:${getCatColor(t.category)}22">${getCatIcon(t.category)}</div>
        <div class="txn-list-info">
          <div class="txn-list-name">${esc(t.name)}</div>
          <div class="txn-list-meta">
            <span>${formatDate(t.date)}</span>
            <span>${sourceMeta}</span>
            ${t.note ? `<span>${esc(t.note)}</span>` : ''}
          </div>
        </div>
        <div class="txn-list-right">
          <div class="txn-list-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₹${parseFloat(t.amount).toFixed(2)}</div>
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
