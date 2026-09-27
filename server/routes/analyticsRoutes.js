const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getDashboardSummary, getTrends } = require("../controllers/analyticsController");

const router = express.Router();

router.use(protect);
router.get("/summary", getDashboardSummary);
router.get("/trends", getTrends);

module.exports = router;
