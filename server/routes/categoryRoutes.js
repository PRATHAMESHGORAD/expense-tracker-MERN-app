const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getCategories, createCategory, deleteCategory } = require("../controllers/categoryController");

const router = express.Router();

router.use(protect);

router.route("/").get(getCategories).post(createCategory);
router.route("/:id").delete(deleteCategory);

module.exports = router;
