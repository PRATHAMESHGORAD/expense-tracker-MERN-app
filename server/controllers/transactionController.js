const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const { processDueRecurringTransactions } = require("../utils/recurrence");

// Builds a safe Mongo filter object from already-validated (see transactionValidators.js)
// query params. Every value here has already passed an express-validator type check,
// so by the time it's interpolated into the filter it's a known primitive - never a raw
// object an attacker could shape into a Mongo operator injection.
function buildFilter(user, query) {
  const filter = { user: user._id };

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.account) filter.account = query.account;

  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }

  if (query.amountMin !== undefined || query.amountMax !== undefined) {
    filter.amount = {};
    if (query.amountMin !== undefined) filter.amount.$gte = query.amountMin;
    if (query.amountMax !== undefined) filter.amount.$lte = query.amountMax;
  }

  if (query.search) {
    // Escape regex special characters so the search string can't be used to build an
    // unexpectedly expensive or malformed pattern.
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const asNumber = Number(query.search);
    const searchClauses = [{ note: { $regex: escaped, $options: "i" } }, { category: { $regex: escaped, $options: "i" } }];
    if (!Number.isNaN(asNumber)) searchClauses.push({ amount: asNumber });
    filter.$or = searchClauses;
  }

  return filter;
}

// @desc    List transactions (paginated, filterable, searchable)
// @route   GET /api/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  await processDueRecurringTransactions(req.user._id);

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const filter = buildFilter(req.user, req.query);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("account", "name type"),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// @desc    Get the most recent N transactions (used by the dashboard)
// @route   GET /api/transactions/recent?count=5
// @access  Private
const getRecentTransactions = asyncHandler(async (req, res) => {
  const count = Math.min(parseInt(req.query.count, 10) || 5, 10);
  const transactions = await Transaction.find({ user: req.user._id })
    .sort({ date: -1 })
    .limit(count)
    .populate("account", "name type");
  res.json(transactions);
});

// @desc    Create a transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, account, note, date, isRecurring, recurrence, attachmentUrl } = req.body;

  // Confirms the account both exists AND belongs to this user - without this check a
  // user could attach a transaction to another user's account id.
  const accountDoc = await Account.findOne({ _id: account, user: req.user._id });
  if (!accountDoc) {
    res.status(400);
    throw new Error("Account not found");
  }

  const txnDate = date ? new Date(date) : new Date();

  const transaction = await Transaction.create({
    user: req.user._id,
    amount,
    type,
    category,
    account,
    note,
    date: txnDate,
    attachmentUrl: attachmentUrl || null,
    isRecurring: !!isRecurring,
    recurrence: isRecurring
      ? { frequency: recurrence.frequency, nextRunDate: txnDate, parentTransaction: null }
      : undefined,
  });

  res.status(201).json(transaction);
});

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }

  if (req.body.account) {
    const accountDoc = await Account.findOne({ _id: req.body.account, user: req.user._id });
    if (!accountDoc) {
      res.status(400);
      throw new Error("Account not found");
    }
  }

  const editable = ["amount", "type", "category", "account", "note", "date", "attachmentUrl"];
  for (const field of editable) {
    if (req.body[field] !== undefined) transaction[field] = req.body[field];
  }

  await transaction.save();
  res.json(transaction);
});

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid transaction id");
  }
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }
  await transaction.deleteOne();
  res.json({ message: "Transaction deleted" });
});

// Wraps a field in quotes only when needed, and escapes embedded quotes - keeps notes
// containing commas/newlines from corrupting the CSV structure.
function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// @desc    Export transactions as CSV, respecting active filters
// @route   GET /api/transactions/export
// @access  Private
const exportTransactionsCSV = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.user, req.query);
  const transactions = await Transaction.find(filter).sort({ date: 1 }).populate("account", "name");

  const header = ["Date", "Type", "Category", "Account", "Amount", "Note"];
  const lines = [header.join(",")];

  for (const t of transactions) {
    lines.push(
      [
        t.date.toISOString().slice(0, 10),
        t.type === "income" ? "Income" : "Expense",
        t.category,
        t.account ? t.account.name : "",
        t.amount,
        t.note || "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  res.header("Content-Type", "text/csv");
  res.attachment("transactions.csv");
  res.send(lines.join("\n"));
});

module.exports = {
  getTransactions,
  getRecentTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCSV,
};
