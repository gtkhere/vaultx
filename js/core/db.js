/* =====================================================
   VaultX — Database & Storage Layer (Multi-User Scoped)
   ===================================================== */

const DB = {
  /** Get current active user ID for storage scoping */
  getCurrentUserId() {
    try {
      const sess = localStorage.getItem('vaultx_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed && parsed.userId) return parsed.userId;
      }
    } catch (e) {}
    return 'demo'; // fallback for demo mode
  },

  /** Resolve storage key based on active user context */
  getScopedKey(key) {
    // Global/shared keys that are never user-prefixed
    const globalKeys = ['users', 'session', 'loggedin'];
    if (globalKeys.includes(key)) {
      return 'vaultx_' + key;
    }

    const userId = this.getCurrentUserId();
    if (userId === 'demo') {
      // Legacy demo key preservation (vaultx_accounts, vaultx_transactions, etc.)
      return 'vaultx_' + key;
    }

    // Scoped user key for independent data separation
    return `vaultx_u_${userId}_${key}`;
  },

  /** Load data from localStorage with fallback */
  load(key, fallback = []) {
    try {
      const storageKey = this.getScopedKey(key);
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : fallback;
    } catch (e) {
      console.warn(`Error loading key "${key}" from localStorage:`, e);
      return fallback;
    }
  },

  /** Save data to localStorage */
  save(key, data) {
    try {
      const storageKey = this.getScopedKey(key);
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving key "${key}" to localStorage:`, e);
    }
  },

  /** Remove specific data key from localStorage */
  remove(key) {
    try {
      const storageKey = this.getScopedKey(key);
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error(`Error removing key "${key}" from localStorage:`, e);
    }
  },

  /** Delete all data belonging to a specific user */
  deleteUserData(userId) {
    if (!userId || userId === 'demo') return;
    const prefix = `vaultx_u_${userId}_`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
};
