const express = require("express");

const {
    createKOT,
    getKOTs,
    getKOTById,
    updateKOTStatus,
} = require("../controllers/kotController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// WAITER / STAFF
// =====================================================

// Create KOT
router.post(
    "/",
    protect,
    authorize("admin", "waiter"),
    createKOT
);


// =====================================================
// KITCHEN
// =====================================================

// Get KOTs
router.get(
    "/",
    protect,
    authorize(
        "admin",
        "waiter",
        "kitchen"
    ),
    getKOTs
);


// Get single KOT
router.get(
    "/:id",
    protect,
    authorize(
        "admin",
        "waiter",
        "kitchen"
    ),
    getKOTById
);


// Update KOT status
router.patch(
    "/:id/status",
    protect,
    authorize(
        "admin",
        "kitchen",
        "waiter"
    ),
    updateKOTStatus
);


module.exports = router;