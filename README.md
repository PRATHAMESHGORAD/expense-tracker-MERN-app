# Expense Tracker (MERN)

A full-stack personal expense management app: JWT-authenticated REST API (Node/Express/MongoDB) with a React frontend for tracking income, expenses, budgets, recurring transactions, and savings goals.

## Features

- **Auth** — register/login/logout with JWT, bcrypt password hashing, protected routes on both API and frontend, per-user data isolation.
- **Dashboard** — total balance, income/expense totals, monthly budget usage, recent transactions, income-vs-expense chart, quick-add.
- **Transactions** — full CRUD, custom categories, backend pagination, combinable filters (type/category/account/date range/amount range), search by note/category/amount, CSV export respecting active filters.
- **Analytics** — monthly income/expense, net savings, category breakdown (pie), spending trend (bar), switchable Week/Month/3 Months/Year — all computed live from stored transactions.
- **Accounts & Wallets** — multiple accounts (Cash, Bank, Credit Card, Wallet, Savings) with computed balances and a combined total.
- **Budgets** — overall monthly budget with 50/75/90/100%+ warnings, plus independent per-category budgets.
- **Recurring transactions** — daily/weekly/monthly/yearly; the next occurrence is generated automatically on login/API access (catches up on any missed periods).
- **Savings goals** — target amount, current amount, target date, progress %.

## Architecture

```
expense-tracker/
├── server/            Express API (MVC)
│   ├── config/        DB connection
│   ├── controllers/   Route handlers
│   ├── middleware/     Auth, error handling, validators
│   ├── models/        Mongoose schemas
│   ├── routes/        Route definitions
│   ├── utils/         JWT helper, recurrence engine
│   └── tests/         Jest + Supertest
└── client/            React (Vite)
    ├── src/api/        Axios instance (attaches JWT)
    ├── src/context/     Auth + shared data (Context API)
    ├── src/components/  Reusable UI (forms, modal, nav)
    ├── src/pages/       Route-level pages
    └── src/**/__tests__ React Testing Library + Vitest
```

Backend is MVC-style: routes → validators → controllers → models. A single centralized error handler formats every thrown error consistently. Every controller scopes its Mongoose queries by `req.user._id` (set by the JWT auth middleware), which is what prevents one user from reading or modifying another user's data even by guessing a valid MongoDB ObjectId.

## API Endpoints

All routes except register/login require `Authorization: Bearer <token>`.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | /api/auth/register | Create account | No |
| POST | /api/auth/login | Log in, get JWT | No |
| GET | /api/auth/me | Current user profile | Yes |
| GET | /api/accounts | List accounts + balances | Yes |
| POST | /api/accounts | Create account/wallet | Yes |
| PUT | /api/accounts/:id | Update account | Yes |
| DELETE | /api/accounts/:id | Delete account (no txns) | Yes |
| GET | /api/categories | List categories (?type=) | Yes |
| POST | /api/categories | Create custom category | Yes |
| DELETE | /api/categories/:id | Delete custom category | Yes |
| GET | /api/transactions | Paginated/filtered/searched list | Yes |
| GET | /api/transactions/recent | Recent N transactions | Yes |
| GET | /api/transactions/export | CSV export (filters applied) | Yes |
| POST | /api/transactions | Create transaction | Yes |
| PUT | /api/transactions/:id | Update transaction | Yes |
| DELETE | /api/transactions/:id | Delete transaction | Yes |
| GET | /api/analytics/summary | Dashboard totals | Yes |
| GET | /api/analytics/trends | Trend + category breakdown | Yes |
| GET | /api/budgets/current | Current month budget + usage | Yes |
| PUT | /api/budgets/overall | Set overall monthly limit | Yes |
| PUT | /api/budgets/category | Set per-category limit | Yes |
| GET | /api/goals | List savings goals | Yes |
| POST | /api/goals | Create goal | Yes |
| PUT | /api/goals/:id | Update goal (e.g. add funds) | Yes |
| DELETE | /api/goals/:id | Delete goal | Yes |

## Setup

### Backend
```bash
cd server
cp .env.example .env   # fill in MONGO_URI (Atlas) and JWT_SECRET
npm install
npm run dev             # nodemon, http://localhost:5000
```

### Frontend
```bash
cd client
cp .env.example .env   # set VITE_API_URL if not using the default
npm install
npm run dev             # http://localhost:5173
```

### Environment variables

**server/.env**
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — long random string
- `JWT_EXPIRES_IN` — e.g. `7d`
- `PORT` — defaults to 5000
- `CLIENT_ORIGIN` — comma-separated allowed frontend origin(s) for CORS

**client/.env**
- `VITE_API_URL` — backend API base URL, e.g. `http://localhost:5000/api`

## Testing

**Backend** (Jest + Supertest, in-memory MongoDB via `mongodb-memory-server`):
```bash
cd server
npm test
```
Covers: register/login/duplicate-email/short-password, protected-route rejection with no/invalid token, transaction CRUD, pagination, combinable filters, cross-user data isolation (User B cannot read/update/delete User A's account, transaction, or attach a transaction to User A's account), and a NoSQL-injection-style query rejection.

> Note: the very first `npm test` run needs to download a MongoDB binary — this requires normal internet access. In network-restricted environments (e.g. some CI sandboxes) this download can fail; it works normally on a typical dev machine or CI runner.

**Frontend** (Vitest + React Testing Library):
```bash
cd client
npm test
```
Covers the login form, the add-transaction form (validation + successful submit), and the transactions list/filtering (rendering, filter-triggered refetch, empty state).

## Deployment

1. Create a MongoDB Atlas cluster and get the connection string.
2. Deploy `server/` to Render/Railway — set `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (your deployed frontend URL) as environment variables there.
3. Deploy `client/` to Vercel/Netlify — set `VITE_API_URL` to your deployed backend's `/api` URL.
4. Confirm the live frontend URL can register, log in, and create a transaction end-to-end before submitting.

## Known limitations

- Recurring transactions are generated lazily (on login/API access), not by a background scheduler — fine for a personal app, not for guaranteed same-day generation if the user doesn't log in.
- No file storage service wired up yet for the transaction attachment field — `attachmentUrl` accepts a URL string only.
- CSV export loads matching rows into memory rather than streaming, which is fine at personal-use scale but not for very large histories.
