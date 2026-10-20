const express = require("express");

const {
    registerUser,
    loginUser,
    getMe,
    updateMyAddress,
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
router.put("/address", protect, updateMyAddress);
// ========================================
// Protected Routes
// ========================================

router.get("/me", protect, getMe);

module.exports = router;