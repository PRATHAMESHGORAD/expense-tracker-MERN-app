const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getCurrentBudget,
  setOverallBudget,
  setCategoryBudget,
  deleteCategoryBudget,
} = require("../controllers/budgetController");

const router = express.Router();

router.use(protect);
router.get("/current", getCurrentBudget);
router.put("/overall", setOverallBudget);
router.put("/category", setCategoryBudget);
router.delete("/category/:category", deleteCategoryBudget);

module.exports = router;