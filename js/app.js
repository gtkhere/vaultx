/* =====================================================
   VaultX — Main Application Bootstrapper
   ===================================================== */

/** Initialize the application workspace and render all views */
function initApp() {
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.remove('hidden');

  const todayEl = document.getElementById('today-date');
  if (todayEl) {
    todayEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  // Load user configurations and datasets
  loadUserData();
  loadSettings();

  // Show loading skeleton animation briefly for smooth feel
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
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
    if (typeof refreshProfileUI === 'function') refreshProfileUI();
    initScrollTop();
  }, 900);
}

/** Boot listener on window DOMContentLoaded */
window.addEventListener('DOMContentLoaded', () => {
  const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
  const isLogged = DB.load('loggedin', false);
  if (isLogged && session && session.userId) {
    const landing = document.getElementById('landing-page');
    if (landing) landing.classList.add('hidden');
    if (session.userId === 'demo') {
      seedDemoData();
    }
    loadUserData();
    initApp();
  }
});
