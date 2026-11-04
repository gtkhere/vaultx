/* =====================================================
   VaultX — Multi-User Authentication & Data Layer
   ===================================================== */

/** Cryptographic Utilities (Web Crypto API with Unique Salts) */
const CryptoUtils = {
  /** Generate a cryptographically secure 16-byte random hex salt */
  generateSalt() {
    const array = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /** Hash a password using PBKDF2 with SHA-256 and unique salt via Web Crypto API */
  async hashPassword(password, salt) {
    const enc = new TextEncoder();
    if (window.crypto && window.crypto.subtle) {
      try {
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          enc.encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );
        const derivedKey = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: enc.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'HMAC', hash: 'SHA-256', length: 256 },
          true,
          ['sign', 'verify']
        );
        const exported = await window.crypto.subtle.exportKey('raw', derivedKey);
        return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('Web Crypto PBKDF2 error, falling back:', e);
      }
    }
    // Fallback if Web Crypto is unavailable in non-secure context
    let hash = 0;
    const combined = password + ':' + salt;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }
};

/** Central Authentication Manager */
const Auth = {
  /** Get all registered users from storage */
  getUsers() {
    return DB.load('users', []);
  },

  /** Save users registry */
  saveUsers(users) {
    DB.save('users', users);
  },

  /** Get active user session */
  getSession() {
    try {
      const sess = localStorage.getItem('vaultx_session');
      return sess ? JSON.parse(sess) : null;
    } catch (e) {
      return null;
    }
  },

  /** Save active user session */
  setSession(session) {
    localStorage.setItem('vaultx_session', JSON.stringify(session));
    localStorage.setItem('vaultx_loggedin', 'true');
    isLoggedIn = true;
  },

  /** Clear active user session */
  clearSession() {
    localStorage.removeItem('vaultx_session');
    localStorage.setItem('vaultx_loggedin', 'false');
    isLoggedIn = false;
  },

  /** Get current authenticated user details */
  getCurrentUser() {
    const sess = this.getSession();
    if (!sess) return null;
    if (sess.userId === 'demo') {
      return { id: 'demo', name: 'Alex Morgan', email: 'alex@vaultx.in', isDemo: true };
    }
    const users = this.getUsers();
    const user = users.find(u => u.id === sess.userId);
    return user || { id: sess.userId, name: sess.name, email: sess.email };
  },

  /** Register a new user with unique ID, salt, and password hash */
  async register({ name, email, password, confirmPassword }) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Please enter your full name (minimum 2 characters).');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (trimmedPassword !== (confirmPassword || '').trim()) {
      throw new Error('Passwords do not match. Please verify your password.');
    }

    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    // Cryptographic hashing with unique salt
    const salt = CryptoUtils.generateSalt();
    const passwordHash = await CryptoUtils.hashPassword(trimmedPassword, salt);

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: trimmedName,
      email: trimmedEmail,
      salt,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Set active session for the new user so DB points to their scoped keys
    this.setSession({
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      rememberMe: true,
      loggedInAt: new Date().toISOString()
    });

    // Initialize clean, independent financial datasets for the new user
    DB.save('profile', { name: newUser.name, email: newUser.email });
    DB.save('cards', []);
    DB.save('accounts', []);
    DB.save('transactions', []);
    DB.save('budgets', []);
    DB.save('prefs', { sound: false, balances: true, compact: false });
    DB.save('read_notifications', []);

    loadUserData();
    return newUser;
  },

  /** Authenticate user with email and password */
  async login({ email, password, rememberMe = true }) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!trimmedEmail) throw new Error('Please enter your email address.');
    if (!trimmedPassword) throw new Error('Please enter your password.');

    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // Verify password hash against stored salt
    const inputHash = await CryptoUtils.hashPassword(trimmedPassword, user.salt);
    if (inputHash !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    // Set active session
    this.setSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      rememberMe: !!rememberMe,
      loggedInAt: new Date().toISOString()
    });

    loadUserData();
    return user;
  },

  /** Log out active user and reset in-memory state */
  logout() {
    clearUserData();
    this.clearSession();

    // Hide workspace and show landing page
    const app = document.getElementById('app');
    const landing = document.getElementById('landing-page');
    if (app) app.classList.add('hidden');
    if (landing) landing.classList.remove('hidden');

    // Close any open topbar dropdowns
    if (typeof closeAllTopbarDropdowns === 'function') closeAllTopbarDropdowns();

    showToast('👋 Logged out successfully', 'info');
  },

  /** Permanently delete active user account and all personal financial records */
  async deleteAccount(userId) {
    if (!userId || userId === 'demo') {
      showToast('⚠️ Cannot delete the demo account', 'error');
      return false;
    }

    // 1. Remove from registered users list
    let users = this.getUsers();
    users = users.filter(u => u.id !== userId);
    this.saveUsers(users);

    // 2. Erase all personal financial data keys scoped to this user
    DB.deleteUserData(userId);

    // 3. Clear session and in-memory state
    clearUserData();
    this.clearSession();

    // 4. Return to landing screen
    const app = document.getElementById('app');
    const landing = document.getElementById('landing-page');
    if (app) app.classList.add('hidden');
    if (landing) landing.classList.remove('hidden');

    if (typeof closeAllTopbarDropdowns === 'function') closeAllTopbarDropdowns();
    return true;
  }
};

/* =====================================================
   Demo Mode Support (Preserves existing demo data)
   ===================================================== */

/** Populate realistic seed data for the first-time demo */
function seedDemoData() {
  if (DB.load('seeded', false)) {
    // Already seeded: reload existing data from storage
    cards        = DB.load('cards', []);
    accounts     = DB.load('accounts', []);
    transactions = DB.load('transactions', []);
    budgets      = DB.load('budgets', []);
    return;
  }

  accounts = [
    { id: uid(), bank: 'HDFC Bank',  number: '4521', type: 'salary',   balance: 124500.00, color: 'blue',   holder: 'Alex Morgan', connectionType: 'connected' },
    { id: uid(), bank: 'SBI',        number: '8823', type: 'savings',  balance: 83200.50,  color: 'purple', holder: 'Alex Morgan', connectionType: 'manual'    },
    { id: uid(), bank: 'ICICI Bank', number: '3310', type: 'checking', balance: 37500.00,  color: 'green',  holder: 'Alex Morgan', connectionType: 'manual'    },
  ];

  cards = [
    { id: uid(), type: 'credit', network: 'VISA',       number: '4111222233334291', holder: 'ALEX MORGAN', expiry: '12/28', cvv: '742', color: 'purple', linkedAccount: accounts[0].id },
    { id: uid(), type: 'debit',  network: 'MASTERCARD', number: '5555666677778888', holder: 'ALEX MORGAN', expiry: '08/27', cvv: '318', color: 'blue',   linkedAccount: accounts[1].id },
    { id: uid(), type: 'debit',  network: 'RUPAY',      number: '6011000000001234', holder: 'ALEX MORGAN', expiry: '03/26', cvv: '509', color: 'green',  linkedAccount: accounts[2].id },
  ];

  const now = new Date();
  const mkDate = (daysAgo) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const mkTs = (daysAgo) => now.getTime() - (daysAgo * 86400000);

  transactions = [
    { id: uid(), type: 'income',  name: 'Monthly Salary',     category: 'Salary',           amount: 95000,  date: mkDate(1),  createdAt: mkTs(1),  note: '',           account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Netflix',            category: 'Entertainment',    amount: 649,    date: mkDate(2),  createdAt: mkTs(2),  note: 'Streaming',   account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Big Basket',         category: 'Food & Dining',    amount: 3240,   date: mkDate(3),  createdAt: mkTs(3),  note: 'Groceries',   account: accounts[1].id },
    { id: uid(), type: 'expense', name: 'Ola Cab',            category: 'Travel',           amount: 380,    date: mkDate(4),  createdAt: mkTs(4),  note: 'Ride',        account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Electricity Bill',   category: 'Bills & Utilities',amount: 2800,   date: mkDate(5),  createdAt: mkTs(5),  note: '',            account: accounts[1].id },
    { id: uid(), type: 'income',  name: 'Freelance Payment',  category: 'Investment',       amount: 28000,  date: mkDate(7),  createdAt: mkTs(7),  note: 'Design work', account: accounts[2].id },
    { id: uid(), type: 'expense', name: 'Zomato',             category: 'Food & Dining',    amount: 520,    date: mkDate(8),  createdAt: mkTs(8),  note: 'Dinner',      account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Flipkart',           category: 'Shopping',         amount: 12999,  date: mkDate(10), createdAt: mkTs(10), note: 'Headphones',  account: accounts[0].id },
    { id: uid(), type: 'income',  name: 'Mutual Fund Return', category: 'Investment',       amount: 8400,   date: mkDate(12), createdAt: mkTs(12), note: '',            account: accounts[1].id },
    { id: uid(), type: 'expense', name: 'Cult.fit',           category: 'Health',           amount: 1999,   date: mkDate(13), createdAt: mkTs(13), note: '',            account: accounts[2].id },
    { id: uid(), type: 'expense', name: 'Spotify',            category: 'Entertainment',    amount: 119,    date: mkDate(14), createdAt: mkTs(14), note: '',            account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Goa Trip Hotel',     category: 'Travel',           amount: 18500,  date: mkDate(16), createdAt: mkTs(16), note: 'Trip',        account: accounts[0].id },
    { id: uid(), type: 'expense', name: 'Udemy Course',       category: 'Education',        amount: 499,    date: mkDate(18), createdAt: mkTs(18), note: '',            account: accounts[1].id },
    { id: uid(), type: 'income',  name: 'Side Project',       category: 'Investment',       amount: 15000,  date: mkDate(20), createdAt: mkTs(20), note: '',            account: accounts[2].id },
    { id: uid(), type: 'expense', name: 'Airtel Broadband',   category: 'Bills & Utilities',amount: 999,    date: mkDate(22), createdAt: mkTs(22), note: '',            account: accounts[1].id },
  ];

  budgets = DB.load('budgets', []);
  DB.save('profile', { name: 'Alex Morgan', email: 'alex@vaultx.in' });

  saveAll();
  DB.save('seeded', true);
}

/** Demo login trigger from landing page */
function demoLogin() {
  showToast('⚡ Opening demo workspace…', 'info');
  Auth.setSession({
    userId: 'demo',
    name: 'Alex Morgan',
    email: 'alex@vaultx.in',
    isDemo: true
  });

  const landing = document.getElementById('landing-page');
  if (landing) landing.classList.add('hidden');

  seedDemoData();
  loadUserData();
  initApp();
}

/** Legacy logout trigger */
function doLogout() {
  Auth.logout();
}

/* =====================================================
   Auth Modal & Form UI Controllers
   ===================================================== */

/** Open Authentication Modal in Login or Register mode */
function openAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  switchAuthTab(tab);
  modal.classList.remove('hidden');

  // Auto focus first input
  setTimeout(() => {
    if (tab === 'login') {
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    } else {
      const nameInput = document.getElementById('register-name');
      if (nameInput) nameInput.focus();
    }
  }, 100);
}

/** Switch tabs between Sign In and Create Account */
function switchAuthTab(tab) {
  const loginTabBtn = document.getElementById('auth-tab-login');
  const regTabBtn   = document.getElementById('auth-tab-register');
  const loginPanel  = document.getElementById('auth-panel-login');
  const regPanel    = document.getElementById('auth-panel-register');

  if (loginTabBtn) {
    loginTabBtn.classList.toggle('active', tab === 'login');
    loginTabBtn.setAttribute('aria-selected', tab === 'login' ? 'true' : 'false');
  }
  if (regTabBtn) {
    regTabBtn.classList.toggle('active', tab === 'register');
    regTabBtn.setAttribute('aria-selected', tab === 'register' ? 'true' : 'false');
  }

  if (loginPanel) loginPanel.classList.toggle('hidden', tab !== 'login');
  if (regPanel)   regPanel.classList.toggle('hidden', tab !== 'register');

  clearAuthErrors();
}

/** Clear all auth form error messages */
function clearAuthErrors() {
  document.querySelectorAll('.field-error-text').forEach(el => el.textContent = '');
  document.querySelectorAll('.auth-error-banner').forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
  });
}

/** Toggle password visibility between text and password */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  if (btn) btn.textContent = isPassword ? '🙈' : '👁';
}

/** Handle Sign In submission */
async function handleLoginSubmit(e) {
  e.preventDefault();
  clearAuthErrors();

  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const rememberMe = document.getElementById('login-remember')?.checked;
  const submitBtn = document.getElementById('login-submit-btn');

  const banner = document.getElementById('login-general-error');

  if (!email) {
    const err = document.getElementById('login-email-error');
    if (err) err.textContent = 'Email address is required.';
    return;
  }
  if (!password) {
    const err = document.getElementById('login-password-error');
    if (err) err.textContent = 'Password is required.';
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing in…</span>';
  }

  try {
    const user = await Auth.login({ email, password, rememberMe });
    closeModal('auth-modal');

    // Show workspace
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app');
    if (landing) landing.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    initApp();
    showToast(`👋 Welcome back, ${user.name}!`, 'success');
  } catch (err) {
    if (banner) {
      banner.textContent = err.message || 'Invalid credentials.';
      banner.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In</span><span class="btn-arrow">→</span>';
    }
  }
}

/** Handle Registration submission */
async function handleRegisterSubmit(e) {
  e.preventDefault();
  clearAuthErrors();

  const name = document.getElementById('register-name')?.value.trim();
  const email = document.getElementById('register-email')?.value.trim();
  const password = document.getElementById('register-password')?.value;
  const confirmPassword = document.getElementById('register-confirm')?.value;
  const submitBtn = document.getElementById('register-submit-btn');
  const banner = document.getElementById('register-general-error');

  let hasError = false;

  if (!name || name.length < 2) {
    const err = document.getElementById('register-name-error');
    if (err) err.textContent = 'Full name must be at least 2 characters.';
    hasError = true;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    const err = document.getElementById('register-email-error');
    if (err) err.textContent = 'Please enter a valid email address.';
    hasError = true;
  }

  if (!password || password.length < 6) {
    const err = document.getElementById('register-password-error');
    if (err) err.textContent = 'Password must be at least 6 characters.';
    hasError = true;
  }

  if (password !== confirmPassword) {
    const err = document.getElementById('register-confirm-error');
    if (err) err.textContent = 'Passwords do not match.';
    hasError = true;
  }

  if (hasError) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating Account…</span>';
  }

  try {
    const newUser = await Auth.register({ name, email, password, confirmPassword });
    closeModal('auth-modal');

    // Show workspace
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app');
    if (landing) landing.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    initApp();
    showToast(`🎉 Account created! Welcome to VaultX, ${newUser.name}!`, 'success');
  } catch (err) {
    if (banner) {
      banner.textContent = err.message || 'Registration failed.';
      banner.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account</span><span class="btn-arrow">→</span>';
    }
  }
}

/** Confirm account deletion dialog */
function confirmDeleteAccount() {
  const currentUser = Auth.getCurrentUser();
  if (!currentUser) {
    showToast('⚠️ No active user session', 'error');
    return;
  }
  if (currentUser.id === 'demo') {
    showToast('⚠️ The demo workspace cannot be deleted', 'error');
    return;
  }

  const modal = document.getElementById('confirm-modal');
  const btn   = document.getElementById('confirm-action-btn');
  const text  = document.getElementById('confirm-text');
  if (!modal || !btn || !text) return;

  text.textContent = `Are you sure you want to permanently delete the account for "${currentUser.name}" (${currentUser.email})? All your cards, accounts, transactions, and budgets will be permanently erased from this browser. This action cannot be undone.`;

  btn.onclick = async () => {
    closeModal('confirm-modal');
    const ok = await Auth.deleteAccount(currentUser.id);
    if (ok) {
      showToast('🗑 Your account and financial data have been permanently deleted', 'info');
    }
  };

  modal.classList.remove('hidden');
}
