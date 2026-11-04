/* =====================================================
   VaultX — Bank Accounts & Simulated Fintech Connect Module
   ===================================================== */

let accountEditId = null;
let connectSelectedBank = null;
let connectCurrentStep = 1;

/** Sample demonstration financial institutions */
const SAMPLE_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', initials: 'HB', color: 'blue', type: 'Private Banking', balance: 185420, number: '8842', logoColor: '#004c8f' },
  { id: 'icici', name: 'ICICI Bank', initials: 'IC', color: 'red', type: 'Universal Banking', balance: 94250, number: '7103', logoColor: '#f37021' },
  { id: 'sbi', name: 'State Bank of India', initials: 'SB', color: 'blue', type: 'Public Sector Banking', balance: 342100, number: '9241', logoColor: '#280071' },
  { id: 'axis', name: 'Axis Bank', initials: 'AB', color: 'purple', type: 'Retail & Commercial', balance: 142800, number: '6630', logoColor: '#97144d' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', initials: 'KM', color: 'red', type: 'Wealth & Savings', balance: 76500, number: '3152', logoColor: '#ed1c24' },
  { id: 'bob', name: 'Bank of Baroda', initials: 'BB', color: 'gold', type: 'Nationalized Banking', balance: 112000, number: '5519', logoColor: '#f26522' },
  { id: 'pnb', name: 'Punjab National Bank', initials: 'PN', color: 'gold', type: 'Public Sector', balance: 68400, number: '4028', logoColor: '#a20034' },
  { id: 'canara', name: 'Canara Bank', initials: 'CB', color: 'blue', type: 'Commercial Banking', balance: 53100, number: '1974', logoColor: '#0083ca' }
];

/** Get active user name for account holder field */
function getActiveAccountHolder() {
  if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
    const u = Auth.getCurrentUser();
    if (u && u.name) return u.name;
  }
  return 'Alex Morgan';
}

/** Open bank account add/edit modal */
function openAccountModal(editId = null) {
  accountEditId = editId;
  const modal = document.getElementById('account-modal');
  if (!modal) return;

  const titleEl = document.getElementById('account-modal-title');
  const chooserEl = document.getElementById('account-mode-chooser');
  const manualFields = document.getElementById('manual-account-fields');

  if (titleEl) titleEl.textContent = editId ? 'Edit Bank Account' : 'Add Bank Account';

  if (editId) {
    const a = accounts.find(a => a.id === editId);
    if (!a) { showToast('⚠️ Account not found', 'error'); return; }
    if (chooserEl) chooserEl.classList.add('hidden');
    if (manualFields) manualFields.classList.remove('hidden');

    document.getElementById('account-bank').value    = a.bank;
    document.getElementById('account-number').value  = a.number;
    document.getElementById('account-type').value    = a.type;
    document.getElementById('account-balance').value = a.balance;
    document.getElementById('account-color').value   = a.color || 'purple';
  } else {
    if (chooserEl) chooserEl.classList.remove('hidden');
    if (manualFields) manualFields.classList.remove('hidden');

    document.getElementById('account-bank').value    = '';
    document.getElementById('account-number').value  = '';
    document.getElementById('account-balance').value = '';
    document.getElementById('account-type').value    = 'savings';
    document.getElementById('account-color').value   = 'purple';

    selectAddAccountMode('manual');
  }

  modal.classList.remove('hidden');
}

/** Toggle between manual form and option cards in the main modal */
function selectAddAccountMode(mode) {
  const manualCard = document.getElementById('mode-opt-manual');
  const connectCard = document.getElementById('mode-opt-connect');
  const manualFields = document.getElementById('manual-account-fields');

  if (mode === 'manual') {
    if (manualCard) manualCard.classList.add('active');
    if (connectCard) connectCard.classList.remove('active');
    if (manualFields) manualFields.classList.remove('hidden');
  } else if (mode === 'connect') {
    startBankConnectFlow();
  }
}

/** Save bank account form (Manual addition / Edit) */
function saveAccount() {
  const bank    = document.getElementById('account-bank').value.trim();
  const number  = document.getElementById('account-number').value.trim();
  const type    = document.getElementById('account-type').value;
  const balance = parseFloat(document.getElementById('account-balance').value) || 0;
  const color   = document.getElementById('account-color').value;

  if (!bank) { showToast('⚠️ Bank name is required', 'error'); return; }

  if (accountEditId) {
    const idx = accounts.findIndex(a => a.id === accountEditId);
    if (idx !== -1) {
      accounts[idx] = {
        ...accounts[idx],
        bank,
        number,
        type,
        balance,
        color,
        holder: accounts[idx].holder || getActiveAccountHolder(),
        connectionType: accounts[idx].connectionType || 'manual'
      };
      showToast('✅ Account updated', 'success');
    }
  } else {
    accounts.push({
      id: uid(),
      bank,
      number,
      type,
      balance,
      color,
      holder: getActiveAccountHolder(),
      connectionType: 'manual'
    });
    showToast('✅ Account added manually', 'success');
  }

  DB.save('accounts', accounts);
  closeModal('account-modal');
  renderAccounts();
  renderDashboard();
  if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
}

// =====================================================
// SIMULATED BANK CONNECTION FLOW CONTROLLERS
// =====================================================

/** Launch the 4-step Simulated Bank Connection Flow */
function startBankConnectFlow() {
  closeModal('account-modal');
  const modal = document.getElementById('bank-connect-modal');
  if (!modal) return;

  connectSelectedBank = null;
  connectCurrentStep = 1;
  setConnectStep(1);

  const searchInput = document.getElementById('bank-search-input');
  if (searchInput) searchInput.value = '';
  renderBankList('');

  modal.classList.remove('hidden');
}

/** Close the connection modal */
function closeConnectModal() {
  const modal = document.getElementById('bank-connect-modal');
  if (modal) modal.classList.add('hidden');
  connectSelectedBank = null;
}

/** Switch active step in the connection wizard */
function setConnectStep(step) {
  connectCurrentStep = step;
  for (let i = 1; i <= 4; i++) {
    const view = document.getElementById(`connect-step-${i}`);
    const pill = document.getElementById(`step-pill-${i}`);
    if (view) {
      if (i === step) view.classList.remove('hidden');
      else view.classList.add('hidden');
    }
    if (pill) {
      if (i === step) {
        pill.classList.add('active');
        pill.classList.remove('completed');
      } else if (i < step) {
        pill.classList.remove('active');
        pill.classList.add('completed');
      } else {
        pill.classList.remove('active');
        pill.classList.remove('completed');
      }
    }
  }
}

/** Go back to a previous step in the wizard */
function goBackConnectStep(targetStep) {
  setConnectStep(targetStep);
}

/** Render bank institution cards for Step 1 */
function renderBankList(filterTerm = '') {
  const grid = document.getElementById('bank-institution-grid');
  if (!grid) return;

  const term = (filterTerm || '').trim().toLowerCase();
  const filtered = SAMPLE_BANKS.filter(b =>
    b.name.toLowerCase().includes(term) ||
    b.initials.toLowerCase().includes(term) ||
    b.type.toLowerCase().includes(term)
  );

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="no-banks-found">
        <span class="no-banks-icon">🏛️</span>
        <p>No institutions matching "<strong>${esc(filterTerm)}</strong>"</p>
        <button class="btn-ghost" style="margin-top:8px;" onclick="renderBankList(''); document.getElementById('bank-search-input').value='';">Clear Search</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(b => {
    const isConnected = (accounts || []).some(a =>
      a.bank.toLowerCase() === b.name.toLowerCase() && a.connectionType === 'connected'
    );

    return `
      <div class="bank-card-item ${isConnected ? 'already-connected' : ''}" onclick="selectBankForConnect('${b.id}')">
        <div class="bank-item-avatar" style="background:${b.logoColor}22; border-color:${b.logoColor}44; color:${b.logoColor}">
          <span>${b.initials}</span>
        </div>
        <div class="bank-item-info">
          <div class="bank-item-name">${esc(b.name)}</div>
          <div class="bank-item-type">${esc(b.type)}</div>
        </div>
        ${isConnected
          ? `<span class="bank-status-pill connected-pill">Connected</span>`
          : `<span class="bank-select-arrow">→</span>`
        }
      </div>
    `;
  }).join('');
}

/** Filter banks input listener */
function filterBankList(val) {
  renderBankList(val);
}

/** Handle selecting a bank in Step 1 */
function selectBankForConnect(bankId) {
  const bank = SAMPLE_BANKS.find(b => b.id === bankId);
  if (!bank) return;

  // Prevent duplicate demo connection
  const isConnected = (accounts || []).some(a =>
    a.bank.toLowerCase() === bank.name.toLowerCase() && a.connectionType === 'connected'
  );
  if (isConnected) {
    showToast(`⚠️ ${bank.name} is already connected to your vault.`, 'info');
    return;
  }

  connectSelectedBank = bank;

  // Populate Step 2 (Consent)
  const consentTitle = document.getElementById('consent-bank-title');
  if (consentTitle) consentTitle.textContent = `Connect to ${bank.name}`;

  const banner = document.getElementById('consent-bank-banner');
  if (banner) {
    banner.innerHTML = `
      <div class="bank-item-avatar" style="background:${bank.logoColor}22; border-color:${bank.logoColor}44; color:${bank.logoColor}">
        <span>${bank.initials}</span>
      </div>
      <div>
        <div style="font-weight:700; font-size:1.05rem;">${esc(bank.name)}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${esc(bank.type)} · Demonstration Node</div>
      </div>
    `;
  }

  const checkbox = document.getElementById('connect-consent-checkbox');
  if (checkbox) checkbox.checked = false;

  const continueBtn = document.getElementById('btn-consent-continue');
  if (continueBtn) continueBtn.disabled = true;

  setConnectStep(2);
}

/** Consent checkbox toggle */
function toggleConnectConsent(checkbox) {
  const continueBtn = document.getElementById('btn-consent-continue');
  if (continueBtn) {
    continueBtn.disabled = !checkbox.checked;
  }
}

/** Proceed to Step 3 (Authentication) */
function proceedToAuthStep() {
  if (!connectSelectedBank) return;

  const authTitle = document.getElementById('auth-bank-title');
  if (authTitle) authTitle.textContent = `${connectSelectedBank.name} NetBanking`;

  const brandEl = document.getElementById('auth-bank-brand');
  if (brandEl) {
    brandEl.innerHTML = `
      <div class="auth-bank-badge" style="border-left: 3px solid ${connectSelectedBank.logoColor}">
        <span class="auth-bank-name">${esc(connectSelectedBank.name)}</span>
        <span class="auth-portal-sub">Demo Portal</span>
      </div>
    `;
  }

  const holderInput = document.getElementById('demo-auth-holder');
  if (holderInput) holderInput.value = getActiveAccountHolder();

  const custInput = document.getElementById('demo-auth-custid');
  if (custInput) custInput.value = `DEMO-${connectSelectedBank.initials}-${connectSelectedBank.number}`;

  const btnText = document.getElementById('auth-btn-text');
  const spinner = document.getElementById('auth-btn-spinner');
  const submitBtn = document.getElementById('btn-auth-submit');
  if (btnText) btnText.textContent = 'Authenticate & Connect';
  if (spinner) spinner.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = false;

  setConnectStep(3);
}

/** Execute simulated demo authentication (Step 3 -> Step 4) */
function executeDemoAuth() {
  if (!connectSelectedBank) return;

  const btnText = document.getElementById('auth-btn-text');
  const spinner = document.getElementById('auth-btn-spinner');
  const submitBtn = document.getElementById('btn-auth-submit');

  if (btnText) btnText.textContent = 'Connecting with Bank...';
  if (spinner) spinner.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = true;

  const holderName = document.getElementById('demo-auth-holder')?.value.trim() || getActiveAccountHolder();

  setTimeout(() => {
    // Add the new demo connected account
    const newAccount = {
      id: uid(),
      bank: connectSelectedBank.name,
      holder: holderName,
      number: connectSelectedBank.number,
      type: 'savings',
      balance: connectSelectedBank.balance,
      color: connectSelectedBank.color || 'blue',
      connectionType: 'connected',
      connectedAt: new Date().toISOString()
    };

    accounts.push(newAccount);
    DB.save('accounts', accounts);
    renderAccounts();
    renderDashboard();
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();

    // Populate Step 4 (Success) preview
    const previewEl = document.getElementById('success-account-preview');
    if (previewEl) {
      previewEl.innerHTML = `
        <div class="success-preview-card color-${newAccount.color}">
          <div class="preview-header">
            <div class="preview-identity">
              <span class="preview-avatar accent-${newAccount.color}">${esc(connectSelectedBank.initials)}</span>
              <div>
                <div class="preview-bank">${esc(newAccount.bank)}</div>
                <div class="preview-holder">${esc(newAccount.holder)}</div>
              </div>
            </div>
            <span class="connection-status-badge status-connected">🔗 DEMO CONNECTED</span>
          </div>
          <div class="preview-meta-row">
            <div>
              <span class="preview-label">Account Number</span>
              <div class="preview-val">•••• ${esc(newAccount.number)}</div>
            </div>
            <div>
              <span class="preview-label">Account Type</span>
              <div class="preview-val">Savings Account</div>
            </div>
            <div>
              <span class="preview-label">Opening Balance</span>
              <div class="preview-val highlight">₹${newAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      `;
    }

    if (btnText) btnText.textContent = 'Authenticate & Connect';
    if (spinner) spinner.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;

    setConnectStep(4);
  }, 650);
}

/** Finish connection flow from Step 4 */
function finishBankConnect() {
  closeConnectModal();
  showSection('accounts');
  showToast(`✅ ${connectSelectedBank ? connectSelectedBank.name : 'Bank'} connected successfully (Demo)`, 'success');
  connectSelectedBank = null;
}

// =====================================================
// RENDERING & HELPERS
// =====================================================

/** Helper to extract 2-letter uppercase initials for bank monogram */
function getBankInitials(bankName) {
  if (!bankName) return 'BK';
  const parts = String(bankName).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return String(bankName).trim().slice(0, 2).toUpperCase();
}

/** Helper to format account type title */
function formatAccountType(type) {
  const map = {
    savings: 'Savings',
    checking: 'Checking',
    salary: 'Salary',
    joint: 'Joint'
  };
  return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Savings');
}

/** Render bank accounts grid and overview in Accounts section */
function renderAccounts() {
  const grid  = document.getElementById('accounts-grid');
  const empty = document.getElementById('no-accounts-empty');

  const accList = accounts || [];
  const totalBalance = accList.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
  const totalAccounts = accList.length;
  const connectedAccounts = accList.filter(a => a.connectionType === 'connected').length;
  const manualAccounts = accList.filter(a => a.connectionType !== 'connected').length;

  // 1. Update Accounts Overview Banner
  const totalBalanceEl = document.getElementById('accounts-total-balance');
  const countDisplayEl = document.getElementById('accounts-count-display');
  const connectedCountEl = document.getElementById('accounts-connected-count');
  const manualCountEl = document.getElementById('accounts-manual-count');

  if (totalBalanceEl) {
    const formatted = (typeof prefs !== 'undefined' && prefs.balances === false)
      ? '••••••'
      : '₹' + totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalBalanceEl.textContent = formatted;
  }
  if (countDisplayEl) countDisplayEl.textContent = String(totalAccounts);
  if (connectedCountEl) connectedCountEl.textContent = String(connectedAccounts);
  if (manualCountEl) manualCountEl.textContent = String(manualAccounts);

  if (!grid || !empty) return;

  if (!accList.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = accList.map(a => {
    const balanceVal = parseFloat(a.balance) || 0;
    const displayBalance = (typeof prefs !== 'undefined' && prefs.balances === false)
      ? '••••••'
      : '₹' + balanceVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const maskedNum = a.number ? a.number.slice(-4) : '••••';
    const initials = esc(getBankInitials(a.bank));
    const typeLabel = esc(formatAccountType(a.type));
    const tierName = a.color ? a.color.charAt(0).toUpperCase() + a.color.slice(1) : 'Standard';
    const isConnected = a.connectionType === 'connected';
    const holderName = esc(a.holder || getActiveAccountHolder());

    return `
      <div class="account-card color-${a.color || 'purple'} ${isConnected ? 'is-connected' : 'is-manual'}" data-account-id="${a.id}">
        <div class="account-accent-bar"></div>
        <div class="account-header">
          <div class="account-bank-identity">
            <div class="account-avatar accent-${a.color || 'purple'}">
              <span class="account-initials">${initials}</span>
            </div>
            <div class="account-title-wrap">
              <h4 class="account-bank-name">${esc(a.bank)}</h4>
              <div class="account-holder-info">
                <span class="holder-name">${holderName}</span>
              </div>
            </div>
          </div>
          <div class="account-badges-wrap">
            <span class="connection-status-badge ${isConnected ? 'status-connected' : 'status-manual'}">
              ${isConnected ? '🔗 DEMO CONNECTED' : '✍️ MANUALLY ADDED'}
            </span>
            <span class="account-type-badge">${typeLabel}</span>
          </div>
        </div>

        <div class="account-number-row">
          <span class="account-number-label">Account Number</span>
          <div class="account-masked-number">
            <span class="masked-dots">••••</span>
            <span class="masked-digits">${esc(maskedNum)}</span>
          </div>
        </div>

        <div class="account-balance-section">
          <div class="account-balance-label">Current Balance</div>
          <div class="account-balance-val">${displayBalance}</div>
        </div>

        <div class="account-footer">
          <div class="account-status-tag">
            <span class="account-color-dot accent-dot-${a.color || 'purple'}"></span>
            <span>${tierName} Tier</span>
          </div>
          <div class="account-actions">
            <button class="account-action-btn edit-btn" onclick="openAccountModal('${a.id}')" title="Edit Account">
              <span class="action-icon">✎</span>
              <span class="action-text">Edit</span>
            </button>
            <button class="account-action-btn delete-btn" onclick="confirmDelete('account','${a.id}')" title="Delete Account">
              <span class="action-icon">🗑</span>
              <span class="action-text">Delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =====================================================
// AUTOMATIC BALANCE SYNCHRONIZATION HELPERS
// =====================================================

/**
 * Calculate the net financial impact of a transaction on an account balance.
 * Income increases balance (+amount), Expense decreases balance (-amount).
 */
function getTxnNetImpact(txn) {
  if (!txn || !txn.amount) return 0;
  const amt = parseFloat(txn.amount) || 0;
  if (txn.type === 'income') return amt;
  if (txn.type === 'expense') return -amt;
  return 0;
}

/**
 * Adjust a specific bank account's balance by a delta value.
 * Rounds to 2 decimal places to prevent floating-point inaccuracies.
 */
function adjustAccountBalance(accountId, delta) {
  if (!accountId || !delta) return false;
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return false;
  const current = parseFloat(acc.balance) || 0;
  acc.balance = Math.round((current + delta) * 100) / 100;
  return true;
}

/**
 * Synchronize bank account balances and card debt when a transaction is edited.
 * Handles credit card debt, bill payments, debit cards, and direct bank accounts.
 */
function syncBalancesOnTxnEdit(oldTxn, newTxn) {
  let accountsChanged = false;
  let cardsChanged = false;

  // 1. REVERSE OLD TRANSACTION IMPACT
  const oldCard = oldTxn.card ? cards.find(c => c.id === oldTxn.card) : null;
  if (oldCard && oldCard.type === 'credit') {
    if (oldTxn.isBillPayment) {
      oldCard.balance = Math.round(((parseFloat(oldCard.balance) || 0) + (parseFloat(oldTxn.amount) || 0)) * 100) / 100;
      if (oldTxn.account) {
        adjustAccountBalance(oldTxn.account, parseFloat(oldTxn.amount) || 0);
        accountsChanged = true;
      }
    } else if (oldTxn.type === 'expense') {
      oldCard.balance = Math.max(0, Math.round(((parseFloat(oldCard.balance) || 0) - (parseFloat(oldTxn.amount) || 0)) * 100) / 100);
    } else if (oldTxn.type === 'income') {
      oldCard.balance = Math.round(((parseFloat(oldCard.balance) || 0) + (parseFloat(oldTxn.amount) || 0)) * 100) / 100;
    }
    cardsChanged = true;
  } else if (oldTxn.account) {
    const oldImpact = getTxnNetImpact(oldTxn);
    if (oldImpact !== 0) {
      adjustAccountBalance(oldTxn.account, -oldImpact);
      accountsChanged = true;
    }
  }

  // 2. APPLY NEW TRANSACTION IMPACT
  const newCard = newTxn.card ? cards.find(c => c.id === newTxn.card) : null;
  if (newCard && newCard.type === 'credit') {
    if (newTxn.isBillPayment) {
      newCard.balance = Math.max(0, Math.round(((parseFloat(newCard.balance) || 0) - (parseFloat(newTxn.amount) || 0)) * 100) / 100);
      if (newTxn.account) {
        adjustAccountBalance(newTxn.account, -(parseFloat(newTxn.amount) || 0));
        accountsChanged = true;
      }
    } else if (newTxn.type === 'expense') {
      newCard.balance = Math.round(((parseFloat(newCard.balance) || 0) + (parseFloat(newTxn.amount) || 0)) * 100) / 100;
    } else if (newTxn.type === 'income') {
      newCard.balance = Math.max(0, Math.round(((parseFloat(newCard.balance) || 0) - (parseFloat(newTxn.amount) || 0)) * 100) / 100);
    }
    cardsChanged = true;
  } else if (newTxn.account) {
    const newImpact = getTxnNetImpact(newTxn);
    if (newImpact !== 0) {
      adjustAccountBalance(newTxn.account, newImpact);
      accountsChanged = true;
    }
  }

  if (accountsChanged) {
    DB.save('accounts', accounts);
  }
  if (cardsChanged) {
    DB.save('cards', cards);
    renderCards();
    renderDashboardCards();
  }
}
