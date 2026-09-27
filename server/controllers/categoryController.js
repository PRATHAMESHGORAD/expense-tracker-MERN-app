const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Category = require("../models/Category");

// @desc    List categories for the logged-in user (optionally filtered by type)
// @route   GET /api/categories?type=income|expense
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.type) filter.type = req.query.type;

  const categories = await Category.find(filter).sort({ name: 1 });
  res.json(categories);
});

// @desc    Create a custom category
// @route   POST /api/categories
// @access  Private
const createCategory = asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name || !["income", "expense"].includes(type)) {
    res.status(400);
    throw new Error("A category name and a valid type (income/expense) are required");
  }

  const existing = await Category.findOne({ user: req.user._id, name, type });
  if (existing) {
    res.status(400);
    throw new Error("This category already exists");
  }

  const category = await Category.create({ user: req.user._id, name, type, isCustom: true });
  res.status(201).json(category);
});

// @desc    Delete a custom category (default categories cannot be deleted)
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid category id");
  }

  const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  if (!category.isCustom) {
    res.status(400);
    throw new Error("Default categories cannot be deleted");
  }

  await category.deleteOne();
  res.json({ message: "Category deleted" });
});

module.exports = { getCategories, createCategory, deleteCategory };
