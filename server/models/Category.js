const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    isCustom: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

const DEFAULT_EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Rent",
  "Entertainment",
  "Health",
  "Education",
  "Subscription",
  "Other",
];

const DEFAULT_INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

// Ensures a new user has the default category set without needing separate seed scripts.
async function seedDefaultCategories(userId) {
  const Category = mongoose.model("Category");
  const docs = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ user: userId, name, type: "expense", isCustom: false })),
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ user: userId, name, type: "income", isCustom: false })),
  ];
  try {
    await Category.insertMany(docs, { ordered: false });
  } catch (err) {
    // Duplicate key errors are expected if categories already exist; anything else should surface.
    if (err.code !== 11000) throw err;
  }
}

module.exports = mongoose.model("Category", categorySchema);
module.exports.seedDefaultCategories = seedDefaultCategories;
module.exports.DEFAULT_EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;
module.exports.DEFAULT_INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORIES;
