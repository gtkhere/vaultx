/* =====================================================
   VaultX — Navigation & Global Topbar Controls
   ===================================================== */

/** Switch between application sections */
function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target section
  const target = document.getElementById('section-' + name);
  if (target) target.classList.remove('hidden');

  const activeNav = document.querySelector(`[data-section="${name}"]`);
  if (activeNav) activeNav.classList.add('active');

  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  }

  activeSection = name;

  // Refresh dynamic views when section becomes visible
  if (name === 'cards')        renderCards();
  if (name === 'accounts')     renderAccounts();
  if (name === 'transactions') renderTransactions();
  if (name === 'insights')     renderInsights();
  if (name === 'dashboard')    renderDashboard();
  if (name === 'budget')       renderBudget();
  if (name === 'settings')     loadSettings();

  // Close mobile sidebar drawer
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.remove('mobile-open');

  // Close any open topbar dropdowns
  closeAllTopbarDropdowns();
}

/** Toggle sidebar collapsed or mobile overlay */
function toggleSidebar() {
  const sb   = document.getElementById('sidebar');
  const main = document.getElementById('main-content');
  if (!sb || !main) return;

  if (window.innerWidth <= 900) {
    sb.classList.toggle('mobile-open');
    return;
  }

  sidebarCollapsed = !sidebarCollapsed;
  sb.classList.toggle('collapsed', sidebarCollapsed);
  main.classList.toggle('expanded', sidebarCollapsed);

  const icon = sb.querySelector('.toggle-icon');
  if (icon) icon.textContent = sidebarCollapsed ? '›' : '‹';
}

/* =====================================================
   Topbar Dropdown Manager
   ===================================================== */

/** Close all open topbar dropdown panels */
function closeAllTopbarDropdowns() {
  const searchDropdown = document.getElementById('global-search-dropdown');
  const notifDropdown  = document.getElementById('notif-dropdown');
  const profileDropdown = document.getElementById('profile-dropdown');
  const searchWrapper  = document.getElementById('topbar-search-wrapper');
  const avatarBtn      = document.getElementById('topbar-avatar-btn');

  if (searchDropdown) searchDropdown.classList.add('hidden');
  if (notifDropdown)  notifDropdown.classList.add('hidden');
  if (profileDropdown) profileDropdown.classList.add('hidden');
  if (searchWrapper)  searchWrapper.classList.remove('mobile-expanded');
  if (avatarBtn)      avatarBtn.setAttribute('aria-expanded', 'false');
}

/* =====================================================
   Control 1: Global Search
   ===================================================== */

/** Handle real-time input in topbar global search */
function handleGlobalSearch(rawVal) {
  const query = (rawVal || '').trim().toLowerCase();
  const searchDropdown = document.getElementById('global-search-dropdown');
  const resultsContainer = document.getElementById('search-results-list');
  const clearBtn = document.getElementById('global-search-clear');

  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !rawVal || rawVal.length === 0);
  }

  if (!query) {
    if (searchDropdown) searchDropdown.classList.add('hidden');
    return;
  }

  // Search transactions across description, category, note, type, date, amount & bank
  const matches = (transactions || []).filter(t => {
    const nameMatch = (t.name || '').toLowerCase().includes(query);
    const catMatch  = (t.category || '').toLowerCase().includes(query);
    const noteMatch = (t.note || '').toLowerCase().includes(query);
    const typeMatch = (t.type || '').toLowerCase().includes(query);
    const dateMatch = (t.date || '').toLowerCase().includes(query);
    const amtMatch  = String(t.amount || '').includes(query);

    let accMatch = false;
    if (t.account && Array.isArray(accounts)) {
      const acc = accounts.find(a => a.id === t.account);
      if (acc && (acc.bank || '').toLowerCase().includes(query)) {
        accMatch = true;
      }
    }

    return nameMatch || catMatch || noteMatch || typeMatch || dateMatch || amtMatch || accMatch;
  });

  if (searchDropdown && resultsContainer) {
    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          <span class="empty-icon">🔍</span>
          <div class="empty-title">No transactions found</div>
          <div class="empty-desc">No results matching "<strong>${esc(query)}</strong>"</div>
        </div>
      `;
    } else {
      const topMatches = matches.slice(0, 6);
      resultsContainer.innerHTML = topMatches.map(t => {
        const acc = (accounts || []).find(a => a.id === t.account);
        const isIncome = t.type === 'income';
        const sign = isIncome ? '+' : '-';
        const formattedAmt = `${sign}₹${(parseFloat(t.amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
        const icon = isIncome ? '↗' : '↘';
        const meta = [t.category, t.date, acc ? acc.bank : null].filter(Boolean).join(' • ');

        return `
          <div class="search-item" onclick="selectSearchResult('${t.id}')" role="option" tabindex="0">
            <div class="search-item-left">
              <div class="search-type-icon ${t.type}">${icon}</div>
              <div class="search-item-info">
                <span class="search-item-title">${esc(t.name)}</span>
                <span class="search-item-meta">${esc(meta)}</span>
              </div>
            </div>
            <span class="search-item-amount ${t.type}">${formattedAmt}</span>
          </div>
        `;
      }).join('');

      if (matches.length > 0) {
        resultsContainer.innerHTML += `
          <div class="search-dropdown-footer" onclick="viewAllSearchResults('${esc(query)}')">
            View all ${matches.length} matching transaction${matches.length > 1 ? 's' : ''} in Transactions →
          </div>
        `;
      }
    }
    searchDropdown.classList.remove('hidden');
  }
}

/** Select a transaction from the search dropdown */
function selectSearchResult(txnId) {
  const t = (transactions || []).find(item => item.id === txnId);
  closeAllTopbarDropdowns();
  showSection('transactions');
  if (t) {
    const txnSearch = document.getElementById('txn-search');
    if (txnSearch) {
      txnSearch.value = t.name;
      renderTransactions();
    }
  }
}

/** Navigate to Transactions section with the active search query applied */
function viewAllSearchResults(query) {
  closeAllTopbarDropdowns();
  showSection('transactions');
  const txnSearch = document.getElementById('txn-search');
  if (txnSearch) {
    txnSearch.value = query;
    renderTransactions();
  }
}

/** Clear search input field and close search dropdown */
function clearGlobalSearch() {
  const input = document.getElementById('global-search');
  const clearBtn = document.getElementById('global-search-clear');
  const dropdown = document.getElementById('global-search-dropdown');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  if (dropdown) dropdown.classList.add('hidden');
}

/** Toggle mobile responsive search expander */
function toggleMobileSearch(e) {
  if (e) e.stopPropagation();
  const wrapper = document.getElementById('topbar-search-wrapper');
  if (!wrapper) return;
  const isExpanded = wrapper.classList.toggle('mobile-expanded');
  if (isExpanded) {
    const input = document.getElementById('global-search');
    if (input) {
      input.focus();
      if (input.value.trim()) handleGlobalSearch(input.value);
    }
  } else {
    const dropdown = document.getElementById('global-search-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }
}

/** Backward-compatible global search alias */
function globalSearch(val) {
  handleGlobalSearch(val);
}

/* =====================================================
   Control 2: Real Notifications Bell
   ===================================================== */

/** Compute real application notifications from live state */
function getNotificationList() {
  const list = [];
  const readList = DB.load('read_notifications', []);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Budget Alerts
  if (Array.isArray(budgets) && budgets.length > 0) {
    const spentMap = {};
    if (typeof getThisMonthTxns === 'function') {
      getThisMonthTxns().filter(t => t.type === 'expense').forEach(t => {
        spentMap[t.category] = (spentMap[t.category] || 0) + (parseFloat(t.amount) || 0);
      });
    }
    budgets.forEach(b => {
      const spent = spentMap[b.category] || 0;
      const limit = parseFloat(b.limit) || 0;
      if (limit > 0) {
        const pct = (spent / limit) * 100;
        if (pct >= 100) {
          list.push({
            id: `notif_budget_over_${b.id}_${currentMonthKey}`,
            type: 'danger',
            icon: '🚨',
            title: `Budget Exceeded: ${b.category}`,
            desc: `Spent ₹${spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹${limit.toLocaleString('en-IN')} (${pct.toFixed(0)}%)`,
            time: 'This month',
            section: 'budget'
          });
        } else if (pct >= (b.alertPct || 80)) {
          list.push({
            id: `notif_budget_warn_${b.id}_${currentMonthKey}`,
            type: 'warning',
            icon: '⚠️',
            title: `Budget Alert: ${b.category}`,
            desc: `${pct.toFixed(0)}% used (₹${spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹${limit.toLocaleString('en-IN')})`,
            time: 'This month',
            section: 'budget'
          });
        }
      }
    });
  }

  // 2. Bank Account Alerts (Low balance < ₹40,000 or negative balance)
  if (Array.isArray(accounts)) {
    accounts.forEach(a => {
      const bal = parseFloat(a.balance) || 0;
      if (bal < 0) {
        list.push({
          id: `notif_acc_neg_${a.id}`,
          type: 'danger',
          icon: '🚨',
          title: `Overdrawn Account: ${a.bank}`,
          desc: `Account ••••${a.number || ''} has a negative balance of -₹${Math.abs(bal).toLocaleString('en-IN')}`,
          time: 'Immediate attention',
          section: 'accounts'
        });
      } else if (bal < 40000) {
        list.push({
          id: `notif_acc_low_${a.id}`,
          type: 'warning',
          icon: '⚠️',
          title: `Low Balance: ${a.bank}`,
          desc: `Account ••••${a.number || ''} balance is ₹${bal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (below ₹40,000 threshold)`,
          time: 'Action recommended',
          section: 'accounts'
        });
      }
    });
  }

  // 3. High-Value Expense Alerts (expenses >= ₹10,000 in past 30 days)
  if (Array.isArray(transactions)) {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentHighExpenses = transactions.filter(t => {
      if (t.type !== 'expense' || parseFloat(t.amount) < 10000) return false;
      const tDate = new Date(t.date);
      return !isNaN(tDate.getTime()) && tDate >= thirtyDaysAgo;
    });

    recentHighExpenses.slice(0, 3).forEach(t => {
      list.push({
        id: `notif_txn_high_${t.id}`,
        type: 'info',
        icon: '💸',
        title: `High Expense: ${t.name}`,
        desc: `₹${parseFloat(t.amount).toLocaleString('en-IN')} in ${t.category} on ${t.date}`,
        time: t.date,
        section: 'transactions',
        txnId: t.id
      });
    });
  }

  // Tag items with persistent read state
  return list.map(item => ({
    ...item,
    isRead: readList.includes(item.id)
  }));
}

/** Update topbar notification badge counter */
function updateNotificationBadge() {
  const notifs = getNotificationList();
  const unreadCount = notifs.filter(n => !n.isRead).length;
  const badge = document.getElementById('notif-badge');
  const countPill = document.getElementById('notif-count-pill');

  if (countPill) countPill.textContent = unreadCount;

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
    }
  }
}

/** Render notifications into the topbar notification dropdown */
function renderNotifications() {
  const container = document.getElementById('notif-list');
  if (!container) return;
  const notifs = getNotificationList();
  updateNotificationBadge();

  if (notifs.length === 0) {
    container.innerHTML = `
      <div class="notif-empty">
        <span class="notif-empty-icon">🎉</span>
        <div class="notif-empty-title">All Caught Up!</div>
        <div class="notif-empty-desc">All account balances and category budgets are in great standing.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.isRead ? 'read' : 'unread'}" onclick="handleNotificationClick('${n.id}', '${n.section}', '${n.txnId || ''}')" role="button" tabindex="0">
      <div class="notif-item-icon">${n.icon}</div>
      <div class="notif-item-body">
        <div class="notif-item-title">${esc(n.title)}</div>
        <div class="notif-item-desc">${esc(n.desc)}</div>
        <div class="notif-item-time">${esc(n.time)}</div>
      </div>
    </div>
  `).join('');
}

/** Toggle notification dropdown panel open/close */
function toggleNotifications(e) {
  if (e) e.stopPropagation();
  const notifDropdown = document.getElementById('notif-dropdown');
  if (!notifDropdown) return;
  const isHidden = notifDropdown.classList.contains('hidden');
  closeAllTopbarDropdowns();
  if (isHidden) {
    renderNotifications();
    notifDropdown.classList.remove('hidden');
  }
}

/** Handle notification click: mark as read and navigate to relevant section */
function handleNotificationClick(id, section, txnId) {
  const readList = DB.load('read_notifications', []);
  if (!readList.includes(id)) {
    readList.push(id);
    DB.save('read_notifications', readList);
  }
  closeAllTopbarDropdowns();
  updateNotificationBadge();
  if (section) {
    showSection(section);
    if (section === 'transactions' && txnId) {
      const targetTxn = (transactions || []).find(t => t.id === txnId);
      if (targetTxn) {
        const txnSearch = document.getElementById('txn-search');
        if (txnSearch) {
          txnSearch.value = targetTxn.name;
          renderTransactions();
        }
      }
    }
  }
}

/** Mark all notifications as read */
function markAllNotificationsAsRead() {
  const notifs = getNotificationList();
  const readList = DB.load('read_notifications', []);
  notifs.forEach(n => {
    if (!readList.includes(n.id)) {
      readList.push(n.id);
    }
  });
  DB.save('read_notifications', readList);
  renderNotifications();
  showToast('✓ All notifications marked as read', 'info');
}

/** Backward-compatible openNotifications */
function openNotifications() {
  toggleNotifications();
}

/* =====================================================
   Control 3: Profile Avatar & Menu
   ===================================================== */

/** Synchronize profile avatar initials, display name, and email across topbar & sidebar */
function refreshProfileUI() {
  const profile = DB.load('profile', { name: 'Alex Morgan', email: 'alex@vaultx.in' });
  const rawName = (profile.name || 'Alex Morgan').trim();
  const parts = rawName.split(/\s+/);
  const initials = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();

  const topbarInitials = document.getElementById('topbar-avatar-initials');
  const dropdownAvatar = document.getElementById('profile-dropdown-avatar');
  const dropdownName   = document.getElementById('profile-dropdown-name');
  const dropdownEmail  = document.getElementById('profile-dropdown-email');

  if (topbarInitials) topbarInitials.textContent = initials;
  if (dropdownAvatar) dropdownAvatar.textContent = initials;
  if (dropdownName)   dropdownName.textContent = rawName;
  if (dropdownEmail)  dropdownEmail.textContent = profile.email || 'alex@vaultx.in';

  // Synchronize sidebar user avatar and name
  document.querySelectorAll('.sidebar-user .user-avatar').forEach(el => el.textContent = initials);
  document.querySelectorAll('.sidebar-user .user-name').forEach(el => el.textContent = rawName);
}

/** Toggle profile dropdown menu */
function toggleProfileDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('profile-dropdown');
  const avatarBtn = document.getElementById('topbar-avatar-btn');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  closeAllTopbarDropdowns();
  if (isHidden) {
    refreshProfileUI();
    dropdown.classList.remove('hidden');
    if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'true');
  }
}

/** Navigate from profile menu and close menu */
function openSectionFromMenu(section) {
  closeAllTopbarDropdowns();
  showSection(section);
}

/** Handle logout trigger from profile menu */
function handleLogoutFromMenu() {
  closeAllTopbarDropdowns();
  doLogout();
}

/* =====================================================
   Global Event Listeners & Shortcuts
   ===================================================== */

/** Global click listener to close dropdowns when clicking outside */
document.addEventListener('click', (e) => {
  const searchWrapper = document.getElementById('topbar-search-wrapper');
  if (searchWrapper && !searchWrapper.contains(e.target)) {
    const searchDropdown = document.getElementById('global-search-dropdown');
    if (searchDropdown) searchDropdown.classList.add('hidden');
    searchWrapper.classList.remove('mobile-expanded');
  }

  const notifWrapper = document.getElementById('topbar-notif-wrapper');
  if (notifWrapper && !notifWrapper.contains(e.target)) {
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifDropdown) notifDropdown.classList.add('hidden');
  }

  const profileWrapper = document.getElementById('topbar-profile-wrapper');
  if (profileWrapper && !profileWrapper.contains(e.target)) {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.add('hidden');
    const avatarBtn = document.getElementById('topbar-avatar-btn');
    if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'false');
  }
});

/** Global Keyboard Shortcuts */
document.addEventListener('keydown', (e) => {
  // Close open topbar dropdown on Escape
  if (e.key === 'Escape') {
    const searchDropdown  = document.getElementById('global-search-dropdown');
    const notifDropdown   = document.getElementById('notif-dropdown');
    const profileDropdown = document.getElementById('profile-dropdown');
    const anyDropdownOpen = (searchDropdown && !searchDropdown.classList.contains('hidden')) ||
                            (notifDropdown && !notifDropdown.classList.contains('hidden')) ||
                            (profileDropdown && !profileDropdown.classList.contains('hidden'));
    if (anyDropdownOpen) {
      closeAllTopbarDropdowns();
      if (document.activeElement && document.activeElement.id === 'global-search') {
        document.activeElement.blur();
      }
      return;
    }
  }

  // Handle Enter in global search input to jump directly to Transactions
  if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'global-search') {
    const val = document.activeElement.value.trim();
    closeAllTopbarDropdowns();
    showSection('transactions');
    const txnSearch = document.getElementById('txn-search');
    if (txnSearch) {
      txnSearch.value = val;
      renderTransactions();
    }
    return;
  }

  // Ignore navigation keystrokes when typing inside input fields
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  // Close open modal on Escape
  const openModal = document.querySelector('.modal-overlay:not(.hidden)');
  if (e.key === 'Escape' && openModal) {
    openModal.classList.add('hidden');
    return;
  }
  if (openModal) return;

  const sectionMap = {
    '1': 'dashboard',
    '2': 'cards',
    '3': 'accounts',
    '4': 'transactions',
    '5': 'insights',
    '6': 'budget',
    '7': 'settings',
  };

  if (sectionMap[e.key]) {
    showSection(sectionMap[e.key]);
    return;
  }
  if (e.key === 't' || e.key === 'T') { openTxnModal(); return; }
  if (e.key === 'c' || e.key === 'C') { openCardModal(); return; }
  if (e.key === 'a' || e.key === 'A') { openAccountModal(); return; }
});
