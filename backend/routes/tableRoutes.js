const express = require("express");

const {
    createTable,
    getTables,
    getTableById,
    updateTable,
    deleteTable,
} = require("../controllers/TableController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET TABLES
// =====================================================

// Admin / staff can view tables
router.get(
    "/",
    protect,
    authorize("admin", "waiter", "receptionist"),
    getTables
);


// =====================================================
// GET SINGLE TABLE
// =====================================================

router.get(
    "/:id",
    protect,
    authorize(
        "admin",
        "waiter",
        "receptionist"
    ),
    getTableById
);


// =====================================================
// CREATE TABLE
// =====================================================

router.post(
    "/",
    protect,
    authorize("admin"),
    createTable
);


// =====================================================
// UPDATE TABLE
// =====================================================

router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateTable
);


// =====================================================
// DELETE TABLE
// =====================================================

router.delete(
    "/:id",
    protect,
    authorize("admin"),
    deleteTable
);


module.exports = router;