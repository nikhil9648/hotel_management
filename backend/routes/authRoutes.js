const express = require("express");

const {
    registerUser,
    loginUser,
    getMe,
} = require("../controllers/authController");

const {
    protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// Public Routes
// ========================================

router.post("/register", registerUser);

router.post("/login", loginUser);

// ========================================
// Protected Routes
// ========================================

router.get("/me", protect, getMe);

module.exports = router;