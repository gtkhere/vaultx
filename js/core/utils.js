/* =====================================================
   VaultX — Shared Utility Functions
   ===================================================== */

/** Escape HTML characters to prevent XSS injection */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format a date string (YYYY-MM-DD or readable string) into a human readable string */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  let d;
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    d = new Date(dateStr.trim() + 'T00:00:00');
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

    // Standard YYYY-MM-DD format parsed at local midnight to avoid UTC day shifts
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
 * Get a transaction's creation timestamp.
 * Prioritizes explicit `txn.createdAt`.
 * Fallback: uses the transaction's index in the stored array or id timestamp.
 */
function getTxnCreatedAt(txn) {
  if (!txn) return 0;
  if (typeof txn.createdAt === 'number' && isFinite(txn.createdAt)) {
    return txn.createdAt;
  }
  if (typeof transactions !== 'undefined' && Array.isArray(transactions)) {
    const idx = transactions.indexOf(txn);
    if (idx !== -1) return idx;
  }
  return 0;
}

/** Get hex color code from named theme */
function getColorHex(color) {
  const map = {
    purple: '#7c3aed',
    blue:   '#2563eb',
    green:  '#059669',
    red:    '#dc2626',
    gold:   '#d97706'
  };
  return map[color] || '#7c3aed';
}

/** Get emoji icon for transaction and budget categories */
function getCatIcon(cat) {
  const icons = {
    'Food & Dining':     '🍔',
    'Travel':            '✈️',
    'Bills & Utilities': '⚡',
    'Shopping':          '🛍️',
    'Entertainment':     '🎬',
    'Health':            '💊',
    'Education':         '📚',
    'Salary':            '💼',
    'Investment':        '📈',
    'Other':             '💸',
  };
  return icons[cat] || '💳';
}

/** Get accent color for transaction and budget categories */
function getCatColor(cat) {
  const colors = {
    'Food & Dining':     '#f59e0b',
    'Travel':            '#60a5fa',
    'Bills & Utilities': '#a78bfa',
    'Shopping':          '#f472b6',
    'Entertainment':     '#fb923c',
    'Health':            '#34d399',
    'Education':         '#38bdf8',
    'Salary':            '#4ade80',
    'Investment':        '#818cf8',
    'Other':             '#94a3b8',
  };
  return colors[cat] || '#94a3b8';
}

/** Check if a date string falls within a specific calendar year and month (0-indexed) */
function isDateInMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return false;
  return parseInt(parts[0], 10) === year && (parseInt(parts[1], 10) - 1) === month;
}

/** Filter transactions belonging to a specific date period */
function getTxnsForPeriod(period = 'this-month', txnList = transactions) {
  if (!Array.isArray(txnList)) return [];
  if (period === 'all') return [...txnList];

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  if (period === 'this-month') {
    return txnList.filter(t => isDateInMonth(t.date, curYear, curMonth));
  }

  if (period === 'last-month') {
    const lastMDate = new Date(curYear, curMonth - 1, 1);
    const targetY = lastMDate.getFullYear();
    const targetM = lastMDate.getMonth();
    return txnList.filter(t => isDateInMonth(t.date, targetY, targetM));
  }

  if (period === 'last-30') {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];
    return txnList.filter(t => t.date && t.date >= cutoffStr && t.date <= todayStr);
  }

  if (period === 'this-year') {
    return txnList.filter(t => {
      if (!t.date) return false;
      const parts = String(t.date).split('-');
      return parseInt(parts[0], 10) === curYear;
    });
  }

  return [...txnList];
}

/** Filter transactions belonging to the current calendar month */
function getThisMonthTxns() {
  return getTxnsForPeriod('this-month');
}
