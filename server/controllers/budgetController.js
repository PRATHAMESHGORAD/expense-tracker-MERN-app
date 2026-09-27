const asyncHandler = require("express-async-handler");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

function warningFor(percent) {
  if (percent >= 100) return "exceeded";
  if (percent >= 90) return "critical";
  if (percent >= 75) return "high";
  if (percent >= 50) return "moderate";
  return null;
}

// @desc    Get (or lazily create) the current month's budget with live usage
// @route   GET /api/budgets/current
// @access  Private
const getCurrentBudget = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let budget = await Budget.findOne({ user: req.user._id, month, year });
  if (!budget) {
    budget = await Budget.create({ user: req.user._id, month, year, overallLimit: 0, categoryLimits: {} });
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const categorySpend = await Transaction.aggregate([
    { $match: { user: req.user._id, type: "expense", date: { $gte: monthStart, $lte: monthEnd } } },
    { $group: { _id: "$category", spent: { $sum: "$amount" } } },
  ]);
    const spendMap = new Map(categorySpend.map((c) => [c._id.toLowerCase(), c.spent]));
  const totalSpent = categorySpend.reduce((sum, c) => sum + c.spent, 0);

  const overallPercent = budget.overallLimit ? Math.round((totalSpent / budget.overallLimit) * 100) : 0;

  const monthName = monthStart.toLocaleString("default", { month: "long" });
  const categories = Array.from(budget.categoryLimits.entries()).map(([category, limit]) => {
        const spent = spendMap.get(category.toLowerCase()) || 0;
    const percent = limit ? Math.round((spent / limit) * 100) : 0;
    return { category, limit, spent, percent, warning: warningFor(percent) };
  });

  res.json({
    month,
    year,
    monthName,
    overallLimit: budget.overallLimit,
    totalSpent,
    overallPercent,
    overallWarning: warningFor(overallPercent),
    overallMessage:
      overallPercent >= 100
        ? `Budget exceeded by ${(totalSpent - budget.overallLimit).toFixed(2)}.`
        : budget.overallLimit
        ? `You have used ${overallPercent}% of your ${monthName} budget.`
        : null,
    categories,
  });
});

// @desc    Set/update the overall monthly budget limit
// @route   PUT /api/budgets/overall
// @access  Private
const setOverallBudget = asyncHandler(async (req, res) => {
  const { overallLimit } = req.body;
  if (typeof overallLimit !== "number" || overallLimit < 0) {
    res.status(400);
    throw new Error("overallLimit must be a non-negative number");
  }

  const now = new Date();
  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, month: now.getMonth() + 1, year: now.getFullYear() },
    { $set: { overallLimit } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(budget);
});

// @desc    Set/update a per-category monthly budget limit
// @route   PUT /api/budgets/category
// @access  Private
const setCategoryBudget = asyncHandler(async (req, res) => {
  const { category, limit } = req.body;
  if (!category || typeof limit !== "number" || limit < 0) {
    res.status(400);
    throw new Error("category and a non-negative limit are required");
  }
  // category becomes part of a Mongo field path below ($set: { "categoryLimits.<category>" }),
  // so "." or "$" in it could target an unintended field or operator - reject those outright.
  if (/[.$]/.test(category)) {
    res.status(400);
    throw new Error("Category name cannot contain '.' or '$'");
  }

  const now = new Date();
  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, month: now.getMonth() + 1, year: now.getFullYear() },
    { $set: { [`categoryLimits.${category}`]: limit } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(budget);
});

const deleteCategoryBudget = asyncHandler(async (req, res) => {
  const { category } = req.params;
  if (!category || /[.$]/.test(category)) {
    res.status(400);
    throw new Error("Invalid category name");
  }

  const now = new Date();
  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, month: now.getMonth() + 1, year: now.getFullYear() },
    { $unset: { [`categoryLimits.${category}`]: "" } },
    { new: true }
  );

  if (!budget) {
    res.status(404);
    throw new Error("Budget not found");
  }

  res.json(budget);
});

module.exports = { getCurrentBudget, setOverallBudget, setCategoryBudget, deleteCategoryBudget };
