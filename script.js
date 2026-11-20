/**
 * LedgerFlow — Interactive Expense Tracker Web Application
 * Pure Vanilla ES6+ JavaScript (Zero External Dependencies)
 *
 * Features:
 * - Structured Expense Objects: { id, title, amount, category, date }
 * - Full CRUD (Add, Read, Edit, Delete with smooth fade-out & undo)
 * - Strict Client-Side Form Validation with Inline Errors
 * - Multi-Criteria Filtering (Search, Category, Month, Exact Date) & Sorting
 * - Live Calculations (Total, Filtered Subtotal, This Month, Top Category, Category Allocation)
 * - LocalStorage Persistence + Sample Data Loader (visible when empty) + CSV Export
 */

'use strict';

/* ==========================================================================
   1. Constants & Application State
   ========================================================================== */
const STORAGE_KEY = 'ledgerflow_expenses_v1';

const CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Other',
];

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_COMPACT_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** @type {Array<{id: string, title: string, amount: number, category: string, date: string}>} */
let expenses = [];

/** Active edit record ID (null when adding a new expense) */
let editingExpenseId = null;

/** Last deleted record for instant one-click undo */
let lastDeletedExpense = null;

/** Current filter and sort criteria */
const filterState = {
  search: '',
  category: 'ALL',
  month: '',
  date: '',
  sortBy: 'date-desc',
};

/* ==========================================================================
   2. DOM Element References
   ========================================================================== */
const dom = {
  // Summary Dashboard
  totalExpensesAmount: document.getElementById('total-expenses-amount'),
  totalCountLabel: document.getElementById('total-count-label'),
  filteredTotalAmount: document.getElementById('filtered-total-amount'),
  filteredCountLabel: document.getElementById('filtered-count-label'),
  currentMonthName: document.getElementById('current-month-name'),
  monthExpensesAmount: document.getElementById('month-expenses-amount'),
  monthTransactionCount: document.getElementById('month-transaction-count'),
  avgExpenseAmount: document.getElementById('avg-expense-amount'),
  topCategoryName: document.getElementById('top-category-name'),
  topCategoryShare: document.getElementById('top-category-share'),
  topCategoryAmount: document.getElementById('top-category-amount'),

  // Form Elements
  entrySection: document.getElementById('entry-section'),
  formHeading: document.getElementById('form-heading'),
  formSubheading: document.getElementById('form-subheading'),
  editModeIndicator: document.getElementById('edit-mode-indicator'),
  form: document.getElementById('expense-form'),
  expenseIdInput: document.getElementById('expense-id'),
  titleInput: document.getElementById('expense-title'),
  amountInput: document.getElementById('expense-amount'),
  categoryInput: document.getElementById('expense-category'),
  dateInput: document.getElementById('expense-date'),
  submitBtn: document.getElementById('submit-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  resetFormBtn: document.getElementById('reset-form-btn'),

  // Inline Validation Error Nodes
  errorTitle: document.getElementById('error-title'),
  errorAmount: document.getElementById('error-amount'),
  errorCategory: document.getElementById('error-category'),
  errorDate: document.getElementById('error-date'),

  // Category Breakdown
  breakdownList: document.getElementById('category-breakdown-list'),
  breakdownBasisLabel: document.getElementById('breakdown-basis-label'),

  // Filters & Sort
  searchInput: document.getElementById('search-input'),
  filterCategory: document.getElementById('filter-category'),
  filterMonth: document.getElementById('filter-month'),
  filterDate: document.getElementById('filter-date'),
  sortBy: document.getElementById('sort-by'),
  clearFiltersBtn: document.getElementById('clear-filters-btn'),

  // Ledger Table & Empty States
  ledgerStatusText: document.getElementById('ledger-status-text'),
  tableContainer: document.getElementById('table-container'),
  expenseTbody: document.getElementById('expense-tbody'),
  emptyState: document.getElementById('empty-state'),
  emptyStateTitle: document.getElementById('empty-state-title'),
  emptyStateDesc: document.getElementById('empty-state-desc'),
  emptyLoadSampleBtn: document.getElementById('empty-load-sample-btn'),
  emptyResetFilterBtn: document.getElementById('empty-reset-filter-btn'),

  // Bulk & Utility Actions
  exportCsvBtn: document.getElementById('export-csv-btn'),
  clearAllDataBtn: document.getElementById('clear-all-data-btn'),
  confirmClearBanner: document.getElementById('confirm-clear-banner'),
  confirmClearYes: document.getElementById('confirm-clear-yes'),
  confirmClearNo: document.getElementById('confirm-clear-no'),

  // Toast Container
  toastContainer: document.getElementById('toast-container'),

  // GitHub Deliverables Viewer
  deliverablesSection: document.getElementById('repo-deliverables'),
  closeDeliverablesBtn: document.getElementById('close-deliverables-btn'),
  deliverableTabs: document.querySelectorAll('.tab-btn'),
  activeCodeFilename: document.getElementById('active-code-filename'),
  codeContentArea: document.getElementById('code-content-area'),
  copyCodeBtn: document.getElementById('copy-code-btn'),
  downloadCodeBtn: document.getElementById('download-code-btn'),
};

/* ==========================================================================
   3. Utility & Formatting Helpers
   ========================================================================== */

/**
 * Returns today's date in YYYY-MM-DD local format for the date input default.
 * @returns {string}
 */
function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a date offset by `daysAgo` days in YYYY-MM-DD format.
 * @param {number} daysAgo
 * @returns {string}
 */
function getPastDateISO(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a numeric amount into Indian Rupee (₹) currency string.
 * @param {number} amount
 * @returns {string}
 */
function formatINR(amount) {
  return INR_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Formats YYYY-MM-DD string into a readable date (e.g., "19 Nov 2026").
 * @param {string} isoDate
 * @returns {string}
 */
function formatDisplayDate(isoDate) {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generates a unique ID for each expense object.
 * @returns {string}
 */
function generateExpenseId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Escapes HTML special characters to prevent XSS when inserting strings.
 * @param {string} text
 * @returns {string}
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/* ==========================================================================
   4. LocalStorage Persistence
   ========================================================================== */

/**
 * Loads saved expenses array from LocalStorage safely.
 * @returns {Array<{id: string, title: string, amount: number, category: string, date: string}>}
 */
function loadExpensesFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Number.isFinite(Number(item.amount)) &&
          Number(item.amount) > 0 &&
          typeof item.category === 'string' &&
          typeof item.date === 'string'
      )
      .map((item) => ({
        id: item.id,
        title: item.title.trim(),
        amount: Number(item.amount),
        category: CATEGORIES.includes(item.category) ? item.category : 'Other',
        date: item.date,
      }));
  } catch (err) {
    console.error('Failed to load expenses from LocalStorage:', err);
    return [];
  }
}

/**
 * Persists the current expenses array to LocalStorage.
 */
function saveExpensesToStorage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses to LocalStorage:', err);
    showToast('Unable to save changes to browser storage.');
  }
}

/* ==========================================================================
   5. Sample Data Seeding (Only visible when ledger is empty)
   ========================================================================== */

/**
 * Loads realistic INR expenses for immediate testing and demonstration.
 */
function loadSampleData() {
  if (expenses.length > 0) return;

  const sampleRecords = [
    {
      id: generateExpenseId(),
      title: 'Monthly Fiber Broadband & Wi-Fi',
      amount: 1179.0,
      category: 'Bills & Utilities',
      date: getPastDateISO(0),
    },
    {
      id: generateExpenseId(),
      title: 'Fresh Vegetables & Weekly Groceries',
      amount: 1845.5,
      category: 'Food & Dining',
      date: getPastDateISO(1),
    },
    {
      id: generateExpenseId(),
      title: 'Metro Card Recharge & Auto Commute',
      amount: 650.0,
      category: 'Transport',
      date: getPastDateISO(2),
    },
    {
      id: generateExpenseId(),
      title: 'Electricity Bill — BESCOM',
      amount: 2420.0,
      category: 'Bills & Utilities',
      date: getPastDateISO(4),
    },
    {
      id: generateExpenseId(),
      title: 'Team Lunch at South Indian Cafe',
      amount: 920.0,
      category: 'Food & Dining',
      date: getPastDateISO(5),
    },
    {
      id: generateExpenseId(),
      title: 'Running Shoes & Cotton Tees',
      amount: 3299.0,
      category: 'Shopping',
      date: getPastDateISO(8),
    },
    {
      id: generateExpenseId(),
      title: 'Pharmacy & Vitamin Supplements',
      amount: 785.0,
      category: 'Health',
      date: getPastDateISO(10),
    },
    {
      id: generateExpenseId(),
      title: 'Weekend Cinema Tickets & Snacks',
      amount: 1150.0,
      category: 'Entertainment',
      date: getPastDateISO(12),
    },
  ];

  expenses = sampleRecords;
  saveExpensesToStorage();
  renderAll();
  showToast('Loaded 8 sample INR transactions.');
}

/* ==========================================================================
   6. Input Validation & Form Handling
   ========================================================================== */

/**
 * Clears all inline validation errors from the form.
 */
function clearFormErrors() {
  const fields = [
    [dom.titleInput, dom.errorTitle],
    [dom.amountInput, dom.errorAmount],
    [dom.categoryInput, dom.errorCategory],
    [dom.dateInput, dom.errorDate],
  ];

  fields.forEach(([inputEl, errorEl]) => {
    inputEl.classList.remove('has-error');
    inputEl.removeAttribute('aria-invalid');
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  });
}

/**
 * Displays an inline error message for a specific form field.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
function setFieldError(inputEl, errorEl, message) {
  inputEl.classList.add('has-error');
  inputEl.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

/**
 * Validates form inputs strictly before saving.
 * @returns {{ valid: boolean, data?: { title: string, amount: number, category: string, date: string } }}
 */
function validateForm() {
  clearFormErrors();
  let isValid = true;
  let firstInvalidField = null;

  const title = dom.titleInput.value.trim();
  const rawAmount = dom.amountInput.value.trim();
  const amount = Number.parseFloat(rawAmount);
  const category = dom.categoryInput.value;
  const date = dom.dateInput.value;

  if (!title) {
    setFieldError(dom.titleInput, dom.errorTitle, 'Please enter a descriptive title for this expense.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.titleInput;
  } else if (title.length < 2) {
    setFieldError(dom.titleInput, dom.errorTitle, 'Title must be at least 2 characters long.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.titleInput;
  }

  if (rawAmount === '' || Number.isNaN(amount)) {
    setFieldError(dom.amountInput, dom.errorAmount, 'Please enter a valid numeric amount in ₹.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.amountInput;
  } else if (amount <= 0) {
    setFieldError(dom.amountInput, dom.errorAmount, 'Amount must be greater than ₹0.00.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.amountInput;
  } else if (amount > 100000000) {
    setFieldError(dom.amountInput, dom.errorAmount, 'Amount exceeds the maximum single-entry limit.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.amountInput;
  }

  if (!category || !CATEGORIES.includes(category)) {
    setFieldError(dom.categoryInput, dom.errorCategory, 'Please select a valid expense category.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.categoryInput;
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    setFieldError(dom.dateInput, dom.errorDate, 'Please choose a valid transaction date.');
    isValid = false;
    firstInvalidField = firstInvalidField || dom.dateInput;
  }

  if (!isValid && firstInvalidField) {
    firstInvalidField.focus();
    return { valid: false };
  }

  return {
    valid: true,
    data: {
      title,
      amount: Math.round(amount * 100) / 100,
      category,
      date,
    },
  };
}

/**
 * Resets the form back to clean "Add Expense" mode with today's date.
 */
function resetFormToAddMode() {
  editingExpenseId = null;
  dom.expenseIdInput.value = '';
  dom.form.reset();
  dom.dateInput.value = getTodayISO();
  clearFormErrors();

  dom.entrySection.classList.remove('is-editing');
  dom.formHeading.textContent = 'Record New Expense';
  dom.formSubheading.textContent = 'Enter transaction details below. All fields are validated before saving.';
  dom.editModeIndicator.classList.add('hidden');
  dom.submitBtn.textContent = 'Add Expense';
  dom.cancelEditBtn.classList.add('hidden');

  renderExpenseTable();
}

/**
 * Enters edit mode for an existing expense record.
 * @param {string} id
 */
function startEditExpense(id) {
  const target = expenses.find((item) => item.id === id);
  if (!target) return;

  editingExpenseId = target.id;
  dom.expenseIdInput.value = target.id;
  dom.titleInput.value = target.title;
  dom.amountInput.value = target.amount.toFixed(2);
  dom.categoryInput.value = target.category;
  dom.dateInput.value = target.date;
  clearFormErrors();

  dom.entrySection.classList.add('is-editing');
  dom.formHeading.textContent = 'Edit Expense Record';
  dom.formSubheading.textContent = 'Update the details below and click Save Changes to apply.';
  dom.editModeIndicator.classList.remove('hidden');
  dom.submitBtn.textContent = 'Save Changes';
  dom.cancelEditBtn.classList.remove('hidden');

  renderExpenseTable();
  dom.entrySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  dom.titleInput.focus();
}

/**
 * Handles form submit for both adding a new expense and updating an existing one.
 * @param {SubmitEvent} event
 */
function handleFormSubmit(event) {
  event.preventDefault();
  const result = validateForm();
  if (!result.valid || !result.data) return;

  if (editingExpenseId) {
    expenses = expenses.map((item) =>
      item.id === editingExpenseId
        ? { id: item.id, ...result.data }
        : item
    );
    saveExpensesToStorage();
    resetFormToAddMode();
    renderAll();
    showToast('Expense updated successfully.');
  } else {
    const newExpense = {
      id: generateExpenseId(),
      ...result.data,
    };
    expenses = [newExpense, ...expenses];
    saveExpensesToStorage();
    resetFormToAddMode();
    renderAll();
    showToast(`Added "${newExpense.title}" (${formatINR(newExpense.amount)}).`);
  }
}

/**
 * Deletes an expense with a smooth row fade-out animation and provides an Undo action.
 * @param {string} id
 * @param {HTMLTableRowElement | null} rowEl
 */
function deleteExpense(id, rowEl) {
  const target = expenses.find((item) => item.id === id);
  if (!target) return;

  const finalizeRemoval = () => {
    lastDeletedExpense = { ...target };
    expenses = expenses.filter((item) => item.id !== id);

    if (editingExpenseId === id) {
      resetFormToAddMode();
    }

    saveExpensesToStorage();
    renderAll();
    showToast(`Deleted "${target.title}".`, {
      undoLabel: 'Undo',
      onUndo: () => {
        if (!lastDeletedExpense) return;
        expenses = [lastDeletedExpense, ...expenses];
        lastDeletedExpense = null;
        saveExpensesToStorage();
        renderAll();
        showToast('Expense restored.');
      },
    });
  };

  if (rowEl) {
    rowEl.classList.add('is-removing');
    window.setTimeout(finalizeRemoval, 210);
  } else {
    finalizeRemoval();
  }
}

/* ==========================================================================
   7. Filtering, Sorting & Live Aggregation (.filter, .sort, .reduce)
   ========================================================================== */

/**
 * Checks whether any search, category, month, or date filter is currently active.
 * @returns {boolean}
 */
function hasActiveFilters() {
  return Boolean(
    filterState.search.trim() ||
    filterState.category !== 'ALL' ||
    filterState.month ||
    filterState.date
  );
}

/**
 * Applies active filters and sort order using Array.prototype.filter() and .sort().
 * @returns {Array<{id: string, title: string, amount: number, category: string, date: string}>}
 */
function getFilteredAndSortedExpenses() {
  const searchQuery = filterState.search.trim().toLowerCase();

  const filtered = expenses.filter((expense) => {
    if (searchQuery) {
      const haystack = `${expense.title} ${expense.category}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }

    if (filterState.category !== 'ALL' && expense.category !== filterState.category) {
      return false;
    }

    if (filterState.month && !expense.date.startsWith(filterState.month)) {
      return false;
    }

    if (filterState.date && expense.date !== filterState.date) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (filterState.sortBy) {
      case 'date-asc':
        return a.date.localeCompare(b.date);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      case 'date-desc':
      default:
        return b.date.localeCompare(a.date);
    }
  });
}

/**
 * Computes summary metrics using Array.prototype.reduce().
 * @param {Array} allExpenses
 * @param {Array} visibleExpenses
 */
function computeMetrics(allExpenses, visibleExpenses) {
  const totalAmount = allExpenses.reduce((sum, item) => sum + item.amount, 0);
  const filteredAmount = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);

  // Current month key (YYYY-MM)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const monthExpenses = allExpenses.filter((item) => item.date.startsWith(currentMonthKey));
  const monthAmount = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const avgAmount = allExpenses.length > 0 ? totalAmount / allExpenses.length : 0;

  // Overall top spending category
  const overallTotalsByCategory = allExpenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  let topCategory = null;
  let topCategoryAmount = 0;

  Object.entries(overallTotalsByCategory).forEach(([cat, amount]) => {
    if (amount > topCategoryAmount) {
      topCategoryAmount = amount;
      topCategory = cat;
    }
  });

  const topCategoryShare =
    totalAmount > 0 ? Math.round((topCategoryAmount / totalAmount) * 100) : 0;

  // Category breakdown for the visible/filtered view
  const breakdownTotals = visibleExpenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  return {
    totalAmount,
    totalCount: allExpenses.length,
    filteredAmount,
    filteredCount: visibleExpenses.length,
    currentMonthLabel,
    monthAmount,
    monthCount: monthExpenses.length,
    avgAmount,
    topCategory,
    topCategoryAmount,
    topCategoryShare,
    breakdownTotals,
  };
}

/* ==========================================================================
   8. Dynamic DOM Rendering
   ========================================================================== */

/**
 * Renders the 3-card Spending Summary Dashboard and top toolbar visibility.
 */
function renderSummaryDashboard(metrics) {
  dom.totalExpensesAmount.textContent = formatINR(metrics.totalAmount);
  dom.totalCountLabel.textContent = `${metrics.totalCount} ${metrics.totalCount === 1 ? 'transaction' : 'transactions'}`;
  dom.filteredTotalAmount.textContent = formatINR(metrics.filteredAmount);
  dom.filteredCountLabel.textContent = `${metrics.filteredCount} shown`;

  dom.currentMonthName.textContent = metrics.currentMonthLabel;
  dom.monthExpensesAmount.textContent = formatINR(metrics.monthAmount);
  dom.monthTransactionCount.textContent = `${metrics.monthCount} ${metrics.monthCount === 1 ? 'transaction' : 'transactions'} this month`;
  dom.avgExpenseAmount.textContent = INR_COMPACT_FORMATTER.format(metrics.avgAmount);

  if (metrics.topCategory) {
    dom.topCategoryName.textContent = metrics.topCategory;
    dom.topCategoryShare.textContent = `${metrics.topCategoryShare}% of total`;
    dom.topCategoryAmount.textContent = formatINR(metrics.topCategoryAmount);
  } else {
    dom.topCategoryName.textContent = 'No data yet';
    dom.topCategoryShare.textContent = '0% of total';
    dom.topCategoryAmount.textContent = formatINR(0);
  }

  const isEmpty = expenses.length === 0;
  dom.clearAllDataBtn.classList.toggle('hidden', isEmpty);
  dom.exportCsvBtn.disabled = isEmpty;
}

/**
 * Renders the visual Category Allocation CSS progress bars.
 */
function renderCategoryBreakdown(metrics) {
  dom.breakdownBasisLabel.textContent = hasActiveFilters()
    ? 'Based on filtered view'
    : 'Based on all expenses';

  if (metrics.filteredAmount <= 0) {
    dom.breakdownList.innerHTML = `
      <div class="breakdown-empty">
        Add expenses or clear filters to visualize percentage spending across categories.
      </div>
    `;
    return;
  }

  const rankedCategories = CATEGORIES.map((category) => {
    const amount = metrics.breakdownTotals[category] || 0;
    const pct = metrics.filteredAmount > 0 ? (amount / metrics.filteredAmount) * 100 : 0;
    return { category, amount, pct };
  })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const highestAmount = rankedCategories[0]?.amount || 0;

  dom.breakdownList.innerHTML = rankedCategories
    .map((entry) => {
      const pctText = entry.pct < 1 ? '<1%' : `${Math.round(entry.pct)}%`;
      const isTop = entry.amount === highestAmount && rankedCategories.length > 1;
      return `
        <div class="breakdown-item">
          <div class="breakdown-row">
            <span class="breakdown-name">${escapeHTML(entry.category)}</span>
            <span class="breakdown-stats tabular-nums">
              <span class="breakdown-amount">${formatINR(entry.amount)}</span>
              <span aria-hidden="true">·</span>
              <span>${pctText}</span>
            </span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuenow="${Math.round(entry.pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHTML(entry.category)} spending percentage">
            <div class="progress-fill ${isTop ? 'is-top' : ''}" style="width: ${Math.max(entry.pct, 1.5).toFixed(1)}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Renders the dynamic Expense Listing Table (or contextual empty state).
 */
function renderExpenseTable() {
  const visibleExpenses = getFilteredAndSortedExpenses();

  const sortLabels = {
    'date-desc': 'newest date first',
    'date-asc': 'oldest date first',
    'amount-desc': 'highest amount first',
    'amount-asc': 'lowest amount first',
  };

  if (hasActiveFilters()) {
    dom.ledgerStatusText.textContent = `Showing ${visibleExpenses.length} matching ${visibleExpenses.length === 1 ? 'record' : 'records'} sorted by ${sortLabels[filterState.sortBy]}.`;
  } else {
    dom.ledgerStatusText.textContent = `Showing all ${expenses.length} recorded ${expenses.length === 1 ? 'expense' : 'expenses'} sorted by ${sortLabels[filterState.sortBy]}.`;
  }

  // Handle Empty States
  if (visibleExpenses.length === 0) {
    dom.tableContainer.classList.add('hidden');
    dom.emptyState.classList.remove('hidden');

    if (expenses.length === 0) {
      dom.emptyStateTitle.textContent = 'No expenses recorded yet';
      dom.emptyStateDesc.textContent =
        'Start tracking your personal finances by adding your first expense above, or load sample Indian Rupee (₹) transactions to explore filtering and sorting.';
      dom.emptyLoadSampleBtn.classList.remove('hidden');
      dom.emptyResetFilterBtn.classList.add('hidden');
    } else {
      dom.emptyStateTitle.textContent = 'No matching expenses found';
      dom.emptyStateDesc.textContent =
        'Try adjusting your search keywords, category selection, or date filters to view matching transactions.';
      dom.emptyLoadSampleBtn.classList.add('hidden');
      dom.emptyResetFilterBtn.classList.remove('hidden');
    }
    dom.expenseTbody.innerHTML = '';
    return;
  }

  dom.tableContainer.classList.remove('hidden');
  dom.emptyState.classList.add('hidden');

  dom.expenseTbody.innerHTML = visibleExpenses
    .map((expense) => {
      const isEditing = editingExpenseId === expense.id;
      return `
        <tr data-id="${escapeHTML(expense.id)}" class="${isEditing ? 'is-editing-row' : ''}">
          <td>
            <div class="expense-title-cell">
              <span class="expense-title-text">${escapeHTML(expense.title)}</span>
              <span class="expense-meta-line">
                <span>${escapeHTML(expense.category)}</span>
                ${isEditing ? '<span aria-hidden="true">·</span><span>Currently editing</span>' : ''}
              </span>
            </div>
          </td>
          <td class="expense-date-cell tabular-nums">${formatDisplayDate(expense.date)}</td>
          <td class="expense-amount-cell text-right tabular-nums">${formatINR(expense.amount)}</td>
          <td class="text-right">
            <div class="row-actions">
              <button type="button" class="action-link action-edit" data-action="edit" data-id="${escapeHTML(expense.id)}">Edit</button>
              <button type="button" class="action-link action-delete" data-action="delete" data-id="${escapeHTML(expense.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Re-renders all reactive dashboard views from the current state.
 */
function renderAll() {
  const visibleExpenses = getFilteredAndSortedExpenses();
  const metrics = computeMetrics(expenses, visibleExpenses);

  renderSummaryDashboard(metrics);
  renderCategoryBreakdown(metrics);
  renderExpenseTable();
}

/* ==========================================================================
   9. Toast Notifications & CSV Export
   ========================================================================== */

/**
 * Displays a clean, auto-dismissing notification toast with optional Undo button.
 * @param {string} message
 * @param {{ undoLabel?: string, onUndo?: () => void }} [options]
 */
function showToast(message, options = {}) {
  const toast = document.createElement('div');
  toast.className = 'toast';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.remove();
  };

  if (options.undoLabel && typeof options.onUndo === 'function') {
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = options.undoLabel;
    undoBtn.addEventListener('click', () => {
      options.onUndo();
      dismiss();
    });
    toast.appendChild(undoBtn);
  }

  dom.toastContainer.appendChild(toast);
  window.setTimeout(dismiss, options.onUndo ? 5000 : 3200);
}

/**
 * Exports the currently visible/filtered expenses to a clean CSV file.
 */
function exportExpensesToCSV() {
  const rows = getFilteredAndSortedExpenses();
  if (rows.length === 0) {
    showToast('No expenses available to export.');
    return;
  }

  const header = ['ID', 'Title', 'Category', 'Date', 'Amount (INR)'];
  const csvLines = [
    header.join(','),
    ...rows.map((item) => {
      const safeTitle = `"${item.title.replace(/"/g, '""')}"`;
      const safeCategory = `"${item.category.replace(/"/g, '""')}"`;
      return [item.id, safeTitle, safeCategory, item.date, item.amount.toFixed(2)].join(',');
    }),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ledgerflow-expenses-${getTodayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Exported ${rows.length} ${rows.length === 1 ? 'record' : 'records'} to CSV.`);
}

/* ==========================================================================
   10. GitHub Deliverables Code & README Viewer
   ========================================================================== */
const fileCache = {};
let activeDeliverableFile = 'README.md';

async function loadDeliverableFile(filename) {
  activeDeliverableFile = filename;
  dom.activeCodeFilename.textContent = filename;

  dom.deliverableTabs.forEach((tab) => {
    const isSelected = tab.dataset.file === filename;
    tab.classList.toggle('active', isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
  });

  if (fileCache[filename]) {
    dom.codeContentArea.textContent = fileCache[filename];
    return;
  }

  dom.codeContentArea.textContent = `Loading ${filename}...`;
  try {
    const response = await fetch(`./${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    fileCache[filename] = text;
    dom.codeContentArea.textContent = text;
  } catch (err) {
    dom.codeContentArea.textContent = `Unable to fetch ${filename} directly in this preview environment. You can inspect or download the file directly from the project root directory.`;
  }
}

function openDeliverablesViewer(event) {
  if (event) event.preventDefault();
  dom.deliverablesSection.classList.remove('hidden');
  loadDeliverableFile(activeDeliverableFile);
  dom.deliverablesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==========================================================================
   11. Event Listeners & Initialization
   ========================================================================== */
function bindEvents() {
  // Form submit, cancel edit, reset fields
  dom.form.addEventListener('submit', handleFormSubmit);
  dom.cancelEditBtn.addEventListener('click', resetFormToAddMode);
  dom.resetFormBtn.addEventListener('click', () => {
    if (editingExpenseId) {
      resetFormToAddMode();
    } else {
      dom.form.reset();
      dom.dateInput.value = getTodayISO();
      clearFormErrors();
    }
  });

  // Clear field errors live as the user corrects inputs
  [dom.titleInput, dom.amountInput, dom.categoryInput, dom.dateInput].forEach((input) => {
    input.addEventListener('input', () => {
      if (input.classList.contains('has-error')) {
        clearFormErrors();
      }
    });
  });

  // Event delegation for Edit and Delete buttons inside the expense table
  dom.expenseTbody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    if (action === 'edit') {
      startEditExpense(id);
    } else if (action === 'delete') {
      const row = btn.closest('tr');
      deleteExpense(id, row);
    }
  });

  // Live Filtering & Sorting Controls
  dom.searchInput.addEventListener('input', (event) => {
    filterState.search = event.target.value;
    renderAll();
  });

  dom.filterCategory.addEventListener('change', (event) => {
    filterState.category = event.target.value;
    renderAll();
  });

  dom.filterMonth.addEventListener('change', (event) => {
    filterState.month = event.target.value;
    // Clear exact date when choosing a month for intuitive filtering
    if (filterState.month && filterState.date) {
      filterState.date = '';
      dom.filterDate.value = '';
    }
    renderAll();
  });

  dom.filterDate.addEventListener('change', (event) => {
    filterState.date = event.target.value;
    // Clear month filter when choosing an exact date
    if (filterState.date && filterState.month) {
      filterState.month = '';
      dom.filterMonth.value = '';
    }
    renderAll();
  });

  dom.sortBy.addEventListener('change', (event) => {
    filterState.sortBy = event.target.value;
    renderAll();
  });

  const resetAllFilters = () => {
    filterState.search = '';
    filterState.category = 'ALL';
    filterState.month = '';
    filterState.date = '';
    filterState.sortBy = 'date-desc';

    dom.searchInput.value = '';
    dom.filterCategory.value = 'ALL';
    dom.filterMonth.value = '';
    dom.filterDate.value = '';
    dom.sortBy.value = 'date-desc';

    renderAll();
  };

  dom.clearFiltersBtn.addEventListener('click', resetAllFilters);
  dom.emptyResetFilterBtn.addEventListener('click', resetAllFilters);

  // Sample Data Button (visible only when empty)
  dom.emptyLoadSampleBtn.addEventListener('click', loadSampleData);

  // CSV Export
  dom.exportCsvBtn.addEventListener('click', exportExpensesToCSV);

  // Clear All Records (Inline confirmation banner instead of window.confirm)
  dom.clearAllDataBtn.addEventListener('click', () => {
    if (expenses.length === 0) return;
    dom.confirmClearBanner.classList.remove('hidden');
  });

  dom.confirmClearNo.addEventListener('click', () => {
    dom.confirmClearBanner.classList.add('hidden');
  });

  dom.confirmClearYes.addEventListener('click', () => {
    expenses = [];
    lastDeletedExpense = null;
    saveExpensesToStorage();
    resetFormToAddMode();
    dom.confirmClearBanner.classList.add('hidden');
    renderAll();
    showToast('All expense records cleared.');
  });

  // Deliverables Code Viewer
  if (dom.closeDeliverablesBtn) {
    dom.closeDeliverablesBtn.addEventListener('click', () => {
      dom.deliverablesSection.classList.add('hidden');
    });
  }

  dom.deliverableTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.file) {
        loadDeliverableFile(tab.dataset.file);
      }
    });
  });

  dom.copyCodeBtn.addEventListener('click', async () => {
    const content = dom.codeContentArea.textContent || '';
    try {
      await navigator.clipboard.writeText(content);
      showToast(`Copied ${activeDeliverableFile} to clipboard.`);
    } catch {
      showToast('Copy failed. Please select and copy manually.');
    }
  });

  dom.downloadCodeBtn.addEventListener('click', () => {
    const content = dom.codeContentArea.textContent || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeDeliverableFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${activeDeliverableFile}.`);
  });
}

/**
 * Initializes the application on DOM ready.
 */
function init() {
  dom.dateInput.value = getTodayISO();
  expenses = loadExpensesFromStorage();
  bindEvents();
  renderAll();
}

init();
