const asyncHandler = require("express-async-handler");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// @desc    Dashboard summary: balance, totals, budget usage
// @route   GET /api/analytics/summary
// @access  Private
const getDashboardSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [allTimeTotals] = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
        totalExpense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
      },
    },
  ]);

  const [monthTotals] = await Transaction.aggregate([
    { $match: { user: req.user._id, date: { $gte: monthStart, $lte: monthEnd } } },
    {
      $group: {
        _id: null,
        monthlyIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
        monthlyExpense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
      },
    },
  ]);

  const totalIncome = allTimeTotals?.totalIncome || 0;
  const totalExpense = allTimeTotals?.totalExpense || 0;
  const monthlyExpense = monthTotals?.monthlyExpense || 0;
  const monthlyIncome = monthTotals?.monthlyIncome || 0;

  const budget = await Budget.findOne({ user: req.user._id, month: now.getMonth() + 1, year: now.getFullYear() });
  const overallLimit = budget?.overallLimit || 0;
  const remainingBudget = overallLimit ? overallLimit - monthlyExpense : null;
  const percentUsed = overallLimit ? Math.round((monthlyExpense / overallLimit) * 100) : null;

  res.json({
    totalBalance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    monthlyIncome,
    monthlyExpense,
    monthlyBudget: overallLimit,
    remainingBudget,
    percentBudgetUsed: percentUsed,
  });
});

// @desc    Income vs expense trend + category breakdown for a given period
// @route   GET /api/analytics/trends?period=week|month|3months|year
// @access  Private
const getTrends = asyncHandler(async (req, res) => {
  const period = ["week", "month", "3months", "year"].includes(req.query.period) ? req.query.period : "month";
  const now = new Date();
  let startDate;
  let dateFormat;

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFormat = "%Y-%m-%d";
      break;
    case "3months":
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      dateFormat = "%Y-%m-%d";
      break;
    case "year":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      dateFormat = "%Y-%m";
      break;
    case "month":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      dateFormat = "%Y-%m-%d";
      break;
  }

  const trend = await Transaction.aggregate([
    { $match: { user: req.user._id, date: { $gte: startDate, $lte: now } } },
    {
      $group: {
        _id: { period: { $dateToString: { format: dateFormat, date: "$date" } }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.period": 1 } },
  ]);

  const categoryBreakdown = await Transaction.aggregate([
    { $match: { user: req.user._id, type: "expense", date: { $gte: startDate, $lte: now } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
  ]);

  const netSavings = trend.reduce((sum, row) => sum + (row._id.type === "income" ? row.total : -row.total), 0);

  res.json({
    period,
    trend: trend.map((row) => ({ period: row._id.period, type: row._id.type, total: row.total })),
    categoryBreakdown: categoryBreakdown.map((row) => ({ category: row._id, total: row.total })),
    netSavings,
  });
});

module.exports = { getDashboardSummary, getTrends };
