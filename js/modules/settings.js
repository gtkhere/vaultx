/* =====================================================
   VaultX — Settings, Profile, Export & Backup Module
   ===================================================== */

/** Load saved profile and preferences into Settings inputs */
function loadSettings() {
  const currentUser = typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser() : null;
  const defaultName = currentUser && currentUser.name ? currentUser.name : 'Alex Morgan';
  const defaultEmail = currentUser && currentUser.email ? currentUser.email : 'alex@vaultx.in';

  const profile = DB.load('profile', { name: defaultName, email: defaultEmail });

  const nameEl  = document.getElementById('settings-name');
  const emailEl = document.getElementById('settings-email');
  if (nameEl)  nameEl.value  = profile.name;
  if (emailEl) emailEl.value = profile.email;

  updateProfileDisplay(profile);

  // Update account status badge in settings
  const statusSub = document.getElementById('settings-account-type-sub');
  const statusBadge = document.getElementById('settings-user-badge');
  if (currentUser && currentUser.id !== 'demo') {
    if (statusSub) statusSub.textContent = `Registered account: ${currentUser.email}`;
    if (statusBadge) {
      statusBadge.textContent = 'Registered User';
      statusBadge.style.background = 'rgba(52,211,153,0.15)';
      statusBadge.style.color = 'var(--neon-green)';
    }
  } else {
    if (statusSub) statusSub.textContent = 'Active demo session';
    if (statusBadge) {
      statusBadge.textContent = 'Demo Mode';
      statusBadge.style.background = 'rgba(251,191,36,0.15)';
      statusBadge.style.color = 'var(--neon-gold)';
    }
  }

  // Restore preference toggles
  const soundEl   = document.getElementById('pref-sound');
  const balEl     = document.getElementById('pref-balances');
  const compactEl = document.getElementById('pref-compact');
  if (soundEl)   soundEl.checked   = prefs.sound;
  if (balEl)     balEl.checked     = prefs.balances;
  if (compactEl) compactEl.checked = prefs.compact;

  applyPrefs();
}

/** Save user profile display name and email */
function saveProfile() {
  const name  = document.getElementById('settings-name')?.value.trim();
  const email = document.getElementById('settings-email')?.value.trim();
  if (!name) { showToast('⚠️ Name is required', 'error'); return; }

  const profile = { name, email };
  DB.save('profile', profile);

  if (typeof Auth !== 'undefined' && Auth.getCurrentUser) {
    const cu = Auth.getCurrentUser();
    if (cu && cu.id !== 'demo') {
      cu.name = name;
      cu.email = email;
      Auth.setSession(cu);
      const users = Auth.getUsers();
      const uIdx = users.findIndex(u => u.id === cu.id);
      if (uIdx !== -1) {
        users[uIdx].name = name;
        users[uIdx].email = email;
        Auth.saveUsers(users);
      }
    }
  }

  updateProfileDisplay(profile);

  // Update sidebar & topbar avatar initials and name
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
  document.querySelectorAll('.user-name').forEach(el => el.textContent = name);
  if (typeof refreshProfileUI === 'function') refreshProfileUI();
  if (typeof updateGreeting === 'function') updateGreeting();

  showToast('✅ Profile saved', 'success');
}

/** Update avatar initials and name display across profile cards */
function updateProfileDisplay(profile) {
  if (typeof refreshProfileUI === 'function') {
    refreshProfileUI();
  }
  const initials = (profile.name || 'Alex Morgan').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avEl = document.getElementById('profile-avatar-display');
  const nmEl = document.getElementById('profile-name-display');
  const emEl = document.getElementById('profile-email-display');
  if (avEl) avEl.textContent = initials;
  if (nmEl) nmEl.textContent = profile.name;
  if (emEl) emEl.textContent = profile.email || '—';
}

/** Save a preference setting */
function savePref(key, val) {
  prefs[key] = val;
  DB.save('prefs', prefs);
  applyPrefs();
  showToast('✅ Preference saved', 'success');
}

/** Apply preferences to the active DOM */
function applyPrefs() {
  document.body.classList.toggle('compact', !!prefs.compact);
  renderDashboardAccounts();
  renderAccounts();
  updateBalanceSummary();
  renderRecentTransactions();
}

/** Export all transactions as a CSV spreadsheet */
function exportCSV() {
  if (!transactions.length) { showToast('⚠️ No transactions to export', 'error'); return; }

  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount (₹)', 'Account', 'Note'];
  const rows = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(t => {
      const acc = accounts.find(a => a.id === t.account);
      return [
        t.date,
        `"${t.name.replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.amount.toFixed(2),
        acc ? `"${acc.bank}"` : 'Manual',
        `"${(t.note || '').replace(/"/g, '""')}"`
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

/** Backup full vault data into a downloadable JSON file */
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

/** Factory reset: wipe all localStorage data */
function confirmResetAll() {
  const modal = document.getElementById('confirm-modal');
  const btn   = document.getElementById('confirm-action-btn');
  const text  = document.getElementById('confirm-text');
  if (!modal || !btn || !text) return;

  text.textContent = 'This will permanently delete ALL your cards, accounts, transactions and budgets. This cannot be undone!';
  btn.onclick = () => {
    ['cards', 'accounts', 'transactions', 'budgets', 'seeded', 'profile', 'prefs'].forEach(k => localStorage.removeItem('vaultx_' + k));
    closeModal('confirm-modal');
    showToast('🗑 All data reset. Reloading...', 'info');
    setTimeout(() => location.reload(), 1500);
  };
  modal.classList.remove('hidden');
}
