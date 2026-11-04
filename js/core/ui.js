/* =====================================================
   VaultX — Shared UI Controller (Modals, Toasts, FAB)
   ===================================================== */

/** Display a self-dismissing toast notification */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/** Close a modal by element ID */
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
  if (id === 'confirm-modal') {
    const btn = document.getElementById('confirm-action-btn');
    if (btn) btn.onclick = null;
  }
}

/** Handle click on topbar notifications icon */
function openNotifications() {
  if (typeof toggleNotifications === 'function') {
    toggleNotifications();
  } else {
    showToast('🔔 All accounts and budgets are in good standing.', 'info');
  }
}

/** Generic confirmation dialog for deletions */
function confirmDelete(type, id) {
  const modal = document.getElementById('confirm-modal');
  const btn   = document.getElementById('confirm-action-btn');
  const text  = document.getElementById('confirm-text');
  if (!modal || !btn || !text) return;

  const labels = { card: 'card', account: 'bank account', txn: 'transaction', budget: 'budget' };
  text.textContent = `Delete this ${labels[type] || type}? This cannot be undone.`;

  btn.onclick = () => {
    if (type === 'card') {
      cards = cards.filter(c => c.id !== id);
      DB.save('cards', cards);
      renderCards();
      renderDashboardCards();
    }
    if (type === 'account') {
      accounts = accounts.filter(a => a.id !== id);
      DB.save('accounts', accounts);
      renderAccounts();
      renderDashboard();
      renderCards();
      renderDashboardCards();
    }
    if (type === 'txn') {
      const targetTxn = transactions.find(t => t.id === id);
      if (targetTxn) {
        const card = targetTxn.card ? cards.find(c => c.id === targetTxn.card) : null;
        if (card && card.type === 'credit') {
          if (targetTxn.isBillPayment) {
            card.balance = Math.round(((parseFloat(card.balance) || 0) + (parseFloat(targetTxn.amount) || 0)) * 100) / 100;
            if (targetTxn.account) {
              adjustAccountBalance(targetTxn.account, parseFloat(targetTxn.amount) || 0);
              DB.save('accounts', accounts);
            }
          } else if (targetTxn.type === 'expense') {
            card.balance = Math.max(0, Math.round(((parseFloat(card.balance) || 0) - (parseFloat(targetTxn.amount) || 0)) * 100) / 100);
          } else if (targetTxn.type === 'income') {
            card.balance = Math.round(((parseFloat(card.balance) || 0) + (parseFloat(targetTxn.amount) || 0)) * 100) / 100;
          }
          DB.save('cards', cards);
          renderCards();
          renderDashboardCards();
        } else if (targetTxn.account) {
          const impact = getTxnNetImpact(targetTxn);
          if (impact !== 0) {
            adjustAccountBalance(targetTxn.account, -impact);
            DB.save('accounts', accounts);
          }
        }
      }
      transactions = transactions.filter(t => t.id !== id);
      DB.save('transactions', transactions);
      renderTransactions();
      renderAccounts();
      renderDashboard();
      if (activeSection === 'budget') renderBudget();
      if (activeSection === 'insights') renderInsights();
    }
    if (type === 'budget') {
      budgets = budgets.filter(b => b.id !== id);
      DB.save('budgets', budgets);
      renderBudget();
    }

    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();

    closeModal('confirm-modal');
    showToast('🗑 Deleted successfully', 'info');
  };

  modal.classList.remove('hidden');
}

// Close modals when clicking on the dimmed background overlay
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

/** Toggle Floating Action Button (FAB) quick-add menu */
function openFABMenu() {
  const btn  = document.getElementById('fab-btn');
  const menu = document.getElementById('fab-menu');
  if (!btn || !menu) return;
  const open = !menu.classList.contains('hidden');

  if (open) {
    closeFABMenu();
  } else {
    menu.classList.remove('hidden');
    btn.classList.add('open');
  }
}

function closeFABMenu() {
  const btn  = document.getElementById('fab-btn');
  const menu = document.getElementById('fab-menu');
  if (menu) menu.classList.add('hidden');
  if (btn) btn.classList.remove('open');
}

/** Show shimmer skeleton placeholders during initial load */
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

/** Initialize floating scroll-to-top button */
function initScrollTop() {
  if (document.querySelector('.scroll-top')) return; // Avoid duplicate creation
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.title = 'Back to top';
  btn.textContent = '↑';
  document.body.appendChild(btn);

  const main = document.getElementById('main-content');

  const handleScroll = () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop || (main ? main.scrollTop : 0);
    btn.classList.toggle('visible', scrollY > 200);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  if (main) main.addEventListener('scroll', handleScroll, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
