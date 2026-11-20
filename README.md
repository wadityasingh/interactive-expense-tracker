# LedgerFlow — Interactive Expense Tracker Web Application

A clean, production-ready, browser-based **Interactive Expense Tracker Web Application** built using pure **HTML5**, **CSS3**, and **Vanilla ES6+ JavaScript** with zero external frameworks or runtime dependencies. Designed for instant hosting on **GitHub Pages**.

---

## Project Overview

LedgerFlow enables users to record, categorize, edit, delete, search, filter, and sort daily personal expenses in Indian Rupees (`₹ / INR`). All changes update the spending summary dashboard and category breakdown charts dynamically in real time without page reloads and persist automatically in the browser's `localStorage`.

### Learning Objectives Covered
- Semantic HTML5 structure and accessible form controls
- Responsive SaaS/Fintech UI layout using CSS Custom Properties, Flexbox, and CSS Grid
- Structured JavaScript data modeling (`{ id, title, amount, category, date }`)
- DOM manipulation and event delegation for dynamic UI rendering
- Functional array operations (`.filter()`, `.sort()`, `.reduce()`, `.map()`)
- Strict client-side input validation with inline error feedback
- Persistent state synchronization with the browser `localStorage` API

---

## Core Features

1. **Spending Summary Dashboard (3-Card Overview)**
   - **Total Expenses**: Lifetime total across all saved records, transaction count, and live filtered subtotal.
   - **This Month's Spending**: Automatically filters expenses matching the current calendar month (`YYYY-MM`) and displays average cost per entry.
   - **Top Spending Category**: Identifies the highest-spend category and its percentage share of total expenditure.

2. **Validated Expense Entry & Edit Form**
   - Captures **Title/Description**, **Amount (`₹ INR`)**, **Category** (`Food & Dining`, `Transport`, `Shopping`, `Bills & Utilities`, `Entertainment`, `Health`, `Other`), and **Date** (defaults to today).
   - Enforces strict validation (prevents empty titles, zero/negative amounts, missing category, or invalid dates) with accessible inline error messages.
   - Seamless **Edit Mode** populates existing record values into the form and highlights the active table row.

3. **Dynamic Expense Listing & CRUD**
   - Instant DOM updates without page reloads.
   - Smooth fade-out delete animation paired with a non-blocking **Undo** toast notification.
   - Inline confirmation banner for clearing all records safely.

4. **Multi-Criteria Filtering, Search & Sorting**
   - Live keyword search across titles and categories.
   - Filter by **Category**, **Month (`YYYY-MM`)**, or **Exact Date (`YYYY-MM-DD`)** with a one-click **Clear Filters** reset.
   - Sort by **Date (Newest / Oldest)** or **Amount (Highest / Lowest)**.

5. **Visual Category Allocation & Utilities**
   - Pure CSS progress bars showing live spending percentage per category.
   - **LocalStorage Persistence** across browser refreshes.
   - **Load Sample Data** button (automatically displayed only when the ledger is empty) for rapid testing.
   - **Export CSV** functionality for spreadsheet analysis.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Markup | Semantic HTML5 |
| Styling | Pure CSS3 (CSS Variables, Flexbox, Grid, Media Queries) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | Browser `localStorage` API |
| Version Control & Hosting | Git & GitHub Pages |

---

## Project Structure

```text
interactive-expense-tracker/
├── index.html      # Semantic HTML5 layout, summary cards, form, filter bar, and table
├── style.css       # Clean white fintech theme, responsive breakpoints, progress bars
├── script.js       # Modular ES6+ state management, CRUD, validation, filtering, LocalStorage
└── README.md       # Project documentation, setup, deployment, and rollback guide
```

---

## Local Setup & Usage

Because the application uses zero build tools or external frameworks, you can run it locally in seconds:

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/interactive-expense-tracker.git
   cd interactive-expense-tracker
   ```
2. **Run locally**
   - Open `index.html` directly via a local static server (recommended because `script.js` uses `type="module"`):
     ```bash
     npx serve .
     # or using Python 3:
     python3 -m http.server 8000
     ```
   - Visit `http://localhost:8000` (or `http://localhost:3000`) in your browser.
3. **Test quickly**
   - Click **Load Sample Data** on an empty ledger to populate 8 realistic INR transactions and test category/date filters, sorting, editing, and CSV export.

---

## Deployment Configuration (GitHub Pages)

This project is structured to deploy directly from the root directory on GitHub Pages with no build step required:

1. Push `index.html`, `style.css`, `script.js`, and `README.md` to the `main` branch of a public GitHub repository.
2. Navigate to **Repository Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/ (root)`**, then click **Save**.
5. GitHub Pages automatically publishes the live site at `https://<your-username>.github.io/<repository-name>/`.

---

## Rollback Strategy & Version Control Evidence

To ensure safe iterative releases on GitHub Pages:

- Every feature increment is committed atomically using semantic Git commit messages (e.g., `feat: add category allocation progress bars`, `fix: handle month/date mutual filter reset`).
- **Rollback Procedure**:
  1. Identify the last known-good commit hash via `git log --oneline`.
  2. Revert the faulty commit cleanly without rewriting shared history:
     ```bash
     git revert <commit-hash>
     git push origin main
     ```
  3. GitHub Pages automatically redeploys the reverted stable state within 1–2 minutes.

---

## Outcome

Delivered a responsive, accessible, and zero-dependency Expense Tracker web application that demonstrates clean separation of concerns across HTML5, CSS3, and Vanilla JavaScript, complete CRUD workflows, functional array transformations, and reliable client-side persistence.
