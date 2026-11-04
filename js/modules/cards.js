/* =====================================================
   VaultX — Card Manager Module Logic
   ===================================================== */

let cardEditId = null;

/** Handle card type change (Debit vs Credit) in Card Modal */
function onCardTypeChange() {
  const type = document.getElementById('card-type')?.value || 'debit';
  const limitGroup = document.getElementById('card-credit-limit-group');
  const linkedLabel = document.getElementById('card-linked-account-label');
  const linkedHint = document.getElementById('card-linked-account-hint');
  const linkedSelect = document.getElementById('card-linked-account');

  if (type === 'credit') {
    if (limitGroup) limitGroup.classList.remove('hidden');
    if (linkedLabel) linkedLabel.textContent = 'Associated Payment Account (for Bill Pay)';
    if (linkedHint) linkedHint.textContent = 'Bank account used to settle monthly credit card statements.';
  } else {
    if (limitGroup) limitGroup.classList.add('hidden');
    if (linkedLabel) linkedLabel.textContent = 'Linked Bank Account';
    if (linkedHint) linkedHint.textContent = 'Debited directly from this account for purchases.';
  }

  updateCardPreview();
}

/** Open card add/edit modal */
function openCardModal(id = null) {
  cardEditId = id;
  const modal = document.getElementById('card-modal');
  if (!modal) return;
  document.getElementById('card-modal-title').textContent = id ? 'Edit Card' : 'Add New Card';

  if (id) {
    const c = cards.find(c => c.id === id);
    if (c) {
      document.getElementById('card-type').value    = c.type;
      document.getElementById('card-network').value = c.network;
      document.getElementById('card-number').value  = formatNum(c.number);
      document.getElementById('card-holder').value  = c.holder;
      document.getElementById('card-expiry').value  = c.expiry;
      document.getElementById('card-cvv').value     = c.cvv;
      document.getElementById('card-color').value   = c.color;
      if (document.getElementById('card-credit-limit')) {
        document.getElementById('card-credit-limit').value = c.creditLimit || 100000;
      }
    }
  } else {
    document.getElementById('card-type').value    = 'debit';
    document.getElementById('card-network').value = 'VISA';
    document.getElementById('card-number').value  = '';
    document.getElementById('card-holder').value  = '';
    document.getElementById('card-expiry').value  = '';
    document.getElementById('card-cvv').value     = '';
    document.getElementById('card-color').value   = 'purple';
    if (document.getElementById('card-credit-limit')) {
      document.getElementById('card-credit-limit').value = 100000;
    }
  }

  // Populate linked accounts dropdown
  const sel = document.getElementById('card-linked-account');
  if (sel) {
    const curType = document.getElementById('card-type')?.value || 'debit';
    const noneText = curType === 'credit' ? '— No Auto-Pay Account —' : '— No Linked Bank Account —';
    sel.innerHTML = `<option value="">${noneText}</option>` +
      accounts.map(a => `<option value="${a.id}" ${id && cards.find(c => c.id === id)?.linkedAccount === a.id ? 'selected' : ''}>${esc(a.bank)} ••••${a.number}</option>`).join('');
  }

  onCardTypeChange();
  modal.classList.remove('hidden');
}

/** Save card form */
function saveCard() {
  const type    = document.getElementById('card-type').value;
  const network = document.getElementById('card-network').value;
  const raw     = document.getElementById('card-number').value.replace(/\s/g, '');
  const holder  = document.getElementById('card-holder').value.trim();
  const expiry  = document.getElementById('card-expiry').value.trim();
  const cvv     = document.getElementById('card-cvv').value.trim();
  const color   = document.getElementById('card-color').value;
  const linked  = document.getElementById('card-linked-account').value;
  const creditLimit = type === 'credit' ? (parseFloat(document.getElementById('card-credit-limit')?.value) || 100000) : undefined;

  if (!raw || raw.length < 12) { showToast('⚠️ Enter a valid card number', 'error'); return; }
  if (!holder) { showToast('⚠️ Card holder name required', 'error'); return; }
  if (!expiry) { showToast('⚠️ Expiry date required', 'error'); return; }

  if (cardEditId) {
    const idx = cards.findIndex(c => c.id === cardEditId);
    if (idx !== -1) {
      cards[idx] = {
        ...cards[idx],
        type,
        network,
        number: raw,
        holder: holder.toUpperCase(),
        expiry,
        cvv,
        color,
        linkedAccount: linked,
        creditLimit: type === 'credit' ? creditLimit : undefined
      };
      showToast('✅ Card updated successfully', 'success');
    }
  } else {
    cards.push({
      id: uid(),
      type,
      network,
      number: raw,
      holder: holder.toUpperCase(),
      expiry,
      cvv,
      color,
      linkedAccount: linked,
      creditLimit: type === 'credit' ? creditLimit : undefined,
      balance: type === 'credit' ? 0 : undefined
    });
    showToast('✅ Card added successfully', 'success');
  }

  DB.save('cards', cards);
  closeModal('card-modal');
  renderCards();
  renderDashboardCards();
}

/** Render cards grid in Cards section */
function renderCards() {
  const grid  = document.getElementById('cards-grid');
  const empty = document.getElementById('no-cards-empty');
  if (!grid || !empty) return;

  if (!cards.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = cards.map(c => {
    const isCredit = c.type === 'credit';
    const linkedAcc = (accounts || []).find(a => a.id === c.linkedAccount);
    const hasLinkedAcc = !!linkedAcc;

    // Linked account status label
    let linkedStatusHtml = '';
    if (isCredit) {
      if (hasLinkedAcc) {
        linkedStatusHtml = `<span class="card-bank-tag"><span class="bank-tag-icon">🏦</span> Bill Pay: ${esc(linkedAcc.bank)} ••••${linkedAcc.number}</span>`;
      } else {
        linkedStatusHtml = `<span class="card-bank-tag unlinked"><span class="bank-tag-icon">⚠️</span> No Auto-Pay Account</span>`;
      }
    } else {
      if (hasLinkedAcc) {
        linkedStatusHtml = `<span class="card-bank-tag"><span class="bank-tag-icon">🏦</span> Linked: ${esc(linkedAcc.bank)} ••••${linkedAcc.number}</span>`;
      } else {
        linkedStatusHtml = `<span class="card-bank-tag unlinked"><span class="bank-tag-icon">⚠️</span> No Linked Account</span>`;
      }
    }

    // Credit stats for credit cards
    const creditStatsHtml = isCredit ? `
      <div class="card-credit-meta">
        <div class="credit-meta-col">
          <span class="meta-sub">OUTSTANDING DEBT</span>
          <span class="meta-val highlight-debt">₹${(parseFloat(c.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="credit-meta-col">
          <span class="meta-sub">CREDIT LIMIT</span>
          <span class="meta-val">₹${(parseFloat(c.creditLimit) || 100000).toLocaleString('en-IN')}</span>
        </div>
      </div>
    ` : '';

    return `
      <div class="payment-card-wrapper">
        <div class="payment-card card-theme-${c.color} ${isCredit ? 'is-credit-card' : 'is-debit-card'}" onclick="this.classList.toggle('flipped')" style="cursor:pointer;" title="Click to flip card">

          <!-- FRONT -->
          <div class="card-face">
            <div class="card-shine"></div>
            <div class="card-circles"></div>
            <div class="card-top-row">
              <span class="card-logo">⬡ VaultX</span>
              <span class="card-type-badge ${isCredit ? 'badge-credit' : 'badge-debit'}">${isCredit ? 'CREDIT CARD' : 'DEBIT CARD'}</span>
            </div>

            <div class="card-chip-row">
              <div class="card-chip"></div>
              ${linkedStatusHtml}
            </div>

            <div class="card-number">${maskCardNumber(c.number)}</div>

            ${creditStatsHtml}

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
            <div class="card-back-details">
              <span>${isCredit ? 'Credit Facility · Not a Debit Account' : (hasLinkedAcc ? `Linked Account: ${esc(linkedAcc.bank)} ••••${linkedAcc.number}` : 'Unlinked Debit Card')}</span>
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
          ${isCredit ? `<button class="btn-pay-bill-action" onclick="openPayBillModal('${c.id}')">💳 Pay Bill</button>` : ''}
          <span style="flex:1;font-size:.78rem;color:var(--text-muted);text-align:right;">Click card to flip</span>
        </div>
      </div>
    `;
  }).join('');
}

// =====================================================
// CREDIT CARD BILL PAYMENT CONTROLLERS
// =====================================================

/** Open Pay Credit Card Bill modal */
function openPayBillModal(cardId) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  const modal = document.getElementById('pay-bill-modal');
  if (!modal) return;

  document.getElementById('pay-bill-card-id').value = card.id;

  const summaryEl = document.getElementById('bill-pay-card-summary');
  const outstanding = parseFloat(card.balance) || 0;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="bill-pay-card-pill">
        <div class="bill-pay-card-left">
          <span class="badge-credit" style="font-size:0.68rem; padding:2px 8px; border-radius:4px;">CREDIT</span>
          <strong>${esc(card.network)} •••• ${esc(card.number.slice(-4))}</strong>
          <span style="font-size:0.8rem; color:var(--text-muted);">${esc(card.holder)}</span>
        </div>
        <div class="bill-pay-card-right">
          <span style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted);">Current Due</span>
          <span class="bill-pay-debt-amount">₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    `;
  }

  // Set default payment amount to full outstanding balance (or 0 if none)
  const amtInput = document.getElementById('pay-bill-amount');
  if (amtInput) amtInput.value = outstanding > 0 ? outstanding : '';

  // Populate accounts dropdown (pre-select linked account if valid)
  const sel = document.getElementById('pay-bill-account');
  if (sel) {
    if (!accounts.length) {
      sel.innerHTML = '<option value="">No bank accounts available</option>';
    } else {
      sel.innerHTML = accounts.map(a => {
        const isPreselected = card.linkedAccount === a.id;
        return `<option value="${a.id}" ${isPreselected ? 'selected' : ''}>${esc(a.bank)} ••••${a.number} (Bal: ₹${(parseFloat(a.balance)||0).toLocaleString('en-IN')})</option>`;
      }).join('');
    }
  }

  modal.classList.remove('hidden');
}

/** Quick button to set payment amount to full outstanding balance */
function setPayBillFullAmount() {
  const cardId = document.getElementById('pay-bill-card-id')?.value;
  const card = cards.find(c => c.id === cardId);
  const amtInput = document.getElementById('pay-bill-amount');
  if (card && amtInput) {
    amtInput.value = Math.max(0, parseFloat(card.balance) || 0);
  }
}

/** Submit credit card bill payment */
function submitCreditCardBillPayment() {
  const cardId = document.getElementById('pay-bill-card-id')?.value;
  const card = cards.find(c => c.id === cardId);
  if (!card) { showToast('⚠️ Card not found', 'error'); return; }

  const amount = parseFloat(document.getElementById('pay-bill-amount')?.value);
  if (!amount || amount <= 0) {
    showToast('⚠️ Please enter a valid payment amount', 'error');
    return;
  }

  const accountId = document.getElementById('pay-bill-account')?.value;
  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    showToast('⚠️ Please select a valid bank account to pay from', 'error');
    return;
  }

  // 1. Deduct payment from bank account
  adjustAccountBalance(accountId, -amount);

  // 2. Reduce credit card outstanding debt
  const curDebt = parseFloat(card.balance) || 0;
  card.balance = Math.max(0, Math.round((curDebt - amount) * 100) / 100);

  // 3. Log transaction
  const txnRecord = {
    id: uid(),
    type: 'expense',
    name: `Credit Card Bill Payment - ${card.network} ••••${card.number.slice(-4)}`,
    amount,
    date: new Date().toISOString().split('T')[0],
    category: 'Bills & Utilities',
    note: `Card bill settled via ${account.bank} ••••${account.number}`,
    account: account.id,
    card: card.id,
    isBillPayment: true,
    createdAt: Date.now()
  };
  transactions.push(txnRecord);

  // Save all updated entities
  DB.save('cards', cards);
  DB.save('accounts', accounts);
  DB.save('transactions', transactions);

  closeModal('pay-bill-modal');
  renderCards();
  renderAccounts();
  renderTransactions();
  renderDashboard();

  showToast(`✅ Paid ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} towards ${card.network} ••••${card.number.slice(-4)}`, 'success');
}

// =====================================================
// UTILITIES & PREVIEW
// =====================================================

function maskCardNumber(num) {
  const clean = String(num || '').replace(/\s/g, '');
  const last4 = clean.slice(-4) || '••••';
  return '•••• •••• •••• ' + last4;
}

function formatNum(num) {
  return String(num || '').replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function formatCardNumber(input) {
  let v = input.value.replace(/\D/g, '');
  input.value = v.replace(/(.{4})/g, '$1 ').trim().substring(0, 19);
}

function updateCardPreview() {
  const number  = document.getElementById('card-number')?.value || '•••• •••• •••• ••••';
  const holder  = document.getElementById('card-holder')?.value || 'YOUR NAME';
  const expiry  = document.getElementById('card-expiry')?.value || 'MM/YY';
  const network = document.getElementById('card-network')?.value || 'VISA';
  const type    = document.getElementById('card-type')?.value || 'debit';
  const color   = document.getElementById('card-color')?.value || 'purple';
  const linkedId = document.getElementById('card-linked-account')?.value;

  const prevNum = document.getElementById('prev-number');
  const prevHol = document.getElementById('prev-holder');
  const prevExp = document.getElementById('prev-expiry');
  const prevNet = document.getElementById('prev-network');
  const prevTyp = document.getElementById('prev-type-badge');
  const prevLnk = document.getElementById('prev-linked-account-badge');
  const liveCard = document.getElementById('live-card-preview');

  if (prevNum) prevNum.textContent  = number;
  if (prevHol) prevHol.textContent  = holder.toUpperCase();
  if (prevExp) prevExp.textContent  = expiry;
  if (prevNet) prevNet.textContent  = network;

  const isCredit = type === 'credit';
  if (prevTyp) {
    prevTyp.textContent = isCredit ? 'CREDIT' : 'DEBIT';
    prevTyp.className = `card-type-badge ${isCredit ? 'badge-credit' : 'badge-debit'}`;
  }

  // Update preview linked badge
  if (prevLnk) {
    const acc = (accounts || []).find(a => a.id === linkedId);
    if (isCredit) {
      prevLnk.textContent = acc ? `Bill Pay: ${acc.bank} ••••${acc.number}` : 'Bill Pay: None';
      prevLnk.className = `card-preview-linked-pill ${acc ? '' : 'unlinked'}`;
    } else {
      prevLnk.textContent = acc ? `Linked: ${acc.bank} ••••${acc.number}` : 'No Linked Account';
      prevLnk.className = `card-preview-linked-pill ${acc ? '' : 'unlinked'}`;
    }
  }

  const themes = {
    purple: 'linear-gradient(135deg, #4c1d95, #7c3aed, #4338ca)',
    blue:   'linear-gradient(135deg, #1e3a8a, #1d4ed8, #0e7490)',
    green:  'linear-gradient(135deg, #064e3b, #059669, #0d9488)',
    red:    'linear-gradient(135deg, #7f1d1d, #dc2626, #db2777)',
    gold:   'linear-gradient(135deg, #78350f, #d97706, #b45309)',
    dark:   'linear-gradient(135deg, #111827, #1f2937, #374151)',
  };
  if (liveCard) liveCard.style.background = themes[color] || themes.purple;
}
