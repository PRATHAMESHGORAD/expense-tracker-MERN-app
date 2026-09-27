const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getTransactions,
  getRecentTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCSV,
} = require("../controllers/transactionController");
const {
  createTransactionValidation,
  updateTransactionValidation,
  listTransactionsValidation,
} = require("../middleware/validators/transactionValidators");

const router = express.Router();

router.use(protect);

// More specific routes must come before the generic "/:id" style routes.
router.get("/recent", getRecentTransactions);
router.get("/export", listTransactionsValidation, exportTransactionsCSV);

router.route("/").get(listTransactionsValidation, getTransactions).post(createTransactionValidation, createTransaction);

router.route("/:id").put(updateTransactionValidation, updateTransaction).delete(deleteTransaction);

module.exports = router;
