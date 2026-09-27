const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../controllers/accountController");

const router = express.Router();

router.use(protect);

router.route("/").get(getAccounts).post(createAccount);
router.route("/:id").put(updateAccount).delete(deleteAccount);

module.exports = router;
