const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Goal = require("../models/Goal");

const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(goals);
});

const createGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, currentAmount, targetDate } = req.body;
  if (!name || typeof targetAmount !== "number" || targetAmount <= 0) {
    res.status(400);
    throw new Error("name and a positive targetAmount are required");
  }

  const goal = await Goal.create({
    user: req.user._id,
    name,
    targetAmount,
    currentAmount: currentAmount || 0,
    targetDate,
  });
  res.status(201).json(goal);
});

const updateGoal = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid goal id");
  }
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  const editable = ["name", "targetAmount", "currentAmount", "targetDate"];
  for (const field of editable) {
    if (req.body[field] !== undefined) goal[field] = req.body[field];
  }
  await goal.save();
  res.json(goal);
});

const deleteGoal = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid goal id");
  }
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  await goal.deleteOne();
  res.json({ message: "Goal deleted" });
});

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };
