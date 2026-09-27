const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

// @desc    List all accounts for the logged-in user, with computed balances
// @route   GET /api/accounts
// @access  Private
const getAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ user: req.user._id }).lean();

  // Compute each account's running balance from its transactions rather than storing
  // a mutable "balance" field that could drift out of sync with the transaction log.
  const balances = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: "$account",
        income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
        expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
      },
    },
  ]);

  const balanceMap = new Map(balances.map((b) => [String(b._id), b.income - b.expense]));

  const result = accounts.map((acc) => ({
    ...acc,
    balance: acc.initialBalance + (balanceMap.get(String(acc._id)) || 0),
  }));

  const combinedTotal = result.reduce((sum, acc) => sum + acc.balance, 0);

  res.json({ accounts: result, combinedTotal });
});

// @desc    Create an account
// @route   POST /api/accounts
// @access  Private
const createAccount = asyncHandler(async (req, res) => {
  const { name, type, initialBalance } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Account name is required");
  }

  const account = await Account.create({
    user: req.user._id,
    name,
    type: type || "Cash",
    initialBalance: initialBalance || 0,
  });

  res.status(201).json(account);
});

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private
const updateAccount = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid account id");
  }

  // Scoping by both _id AND user is what prevents User A from editing User B's account
  // even if they guess/enumerate a valid Mongo ObjectId.
  const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }

  const { name, type, initialBalance } = req.body;
  if (name !== undefined) account.name = name;
  if (type !== undefined) account.type = type;
  if (initialBalance !== undefined) account.initialBalance = initialBalance;

  await account.save();
  res.json(account);
});

// @desc    Delete an account (only if it has no transactions)
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid account id");
  }

  const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }

  const txnCount = await Transaction.countDocuments({ account: account._id, user: req.user._id });
  if (txnCount > 0) {
    res.status(400);
    throw new Error("Cannot delete an account that has transactions. Delete or reassign them first.");
  }

  await account.deleteOne();
  res.json({ message: "Account deleted" });
});

module.exports = { getAccounts, createAccount, updateAccount, deleteAccount };
