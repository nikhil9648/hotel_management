const express = require("express");

const {
    getAdminProfile,
    getAdminDashboard,
    createStaff,
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
} = require("../controllers/adminController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// ADMIN PROFILE
// ========================================

router.get(
    "/profile",
    protect,
    authorize("admin"),
    getAdminProfile
);

// ========================================
// ADMIN DASHBOARD
// ========================================

router.get(
    "/dashboard",
    protect,
    authorize("admin"),
    getAdminDashboard
);

// ========================================
// STAFF MANAGEMENT
// ========================================

// Create staff
// POST /api/admin/staff

router.post(
    "/staff",
    protect,
    authorize("admin"),
    createStaff
);

// Get all staff
// GET /api/admin/staff

router.get(
    "/staff",
    protect,
    authorize("admin"),
    getAllStaff
);

// Get staff by ID
// GET /api/admin/staff/:id

router.get(
    "/staff/:id",
    protect,
    authorize("admin"),
    getStaffById
);

// Update staff
// PUT /api/admin/staff/:id

router.put(
    "/staff/:id",
    protect,
    authorize("admin"),
    updateStaff
);

// Deactivate staff
// DELETE /api/admin/staff/:id

router.delete(
    "/staff/:id",
    protect,
    authorize("admin"),
    deleteStaff
);

module.exports = router;