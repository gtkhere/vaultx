/* =====================================================
   VaultX — Central Application State
   ===================================================== */

// Core state entities
let cards        = [];
let accounts     = [];
let transactions = [];
let budgets      = [];
let prefs        = { sound: false, balances: true, compact: false };
let isLoggedIn   = false;

// UI state
let sidebarCollapsed = false;
let activeSection    = 'dashboard';

/** Populate state entities from current user's scoped storage */
function loadUserData() {
  cards        = DB.load('cards', []);
  accounts     = DB.load('accounts', []);
  transactions = DB.load('transactions', []);
  budgets      = DB.load('budgets', []);
  prefs        = DB.load('prefs', { sound: false, balances: true, compact: false });
}

/** Clear all in-memory data on logout to prevent cross-user leakage */
function clearUserData() {
  cards        = [];
  accounts     = [];
  transactions = [];
  budgets      = [];
  prefs        = { sound: false, balances: true, compact: false };
}

/** Save core datasets to localStorage */
function saveAll() {
  DB.save('cards', cards);
  DB.save('accounts', accounts);
  DB.save('transactions', transactions);
  DB.save('budgets', budgets);
}

/** Generate a unique ID */
function uid() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Initial state load
loadUserData();
