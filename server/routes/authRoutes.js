const express = require("express");
const rateLimit = require("express-rate-limit");
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { registerValidation, loginValidation } = require("../middleware/validators/authValidators");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Limits brute-force login/register attempts per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, registerValidation, registerUser);
router.post("/login", authLimiter, loginValidation, loginUser);
router.get("/me", protect, getMe);

module.exports = router;
