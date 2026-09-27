const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, enum: ["income", "expense"], required: true, index: true },
    category: { type: String, required: true, trim: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    note: { type: String, trim: true, default: "" },
    date: { type: Date, required: true, default: Date.now, index: true },
    attachmentUrl: { type: String, default: null },

    isRecurring: { type: Boolean, default: false },
    recurrence: {
      frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly", null], default: null },
      nextRunDate: { type: Date, default: null },
      // When a recurring transaction spawns a new occurrence, that occurrence points back
      // to the template it came from so we don't regenerate duplicates.
      parentTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    },
  },
  { timestamps: true }
);

// Supports the combinable filters (type/category/account/date range/amount range) efficiently.
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, account: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
