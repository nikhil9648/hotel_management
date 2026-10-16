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
const {
getGeneralProducts,
createGeneralProduct,
updateGeneralProduct,
deactivateGeneralProduct,
getGeneralProductByBarcode,
} = require("../controllers/generalProductController");
const {
createGeneralBill,
getGeneralBills,
getGeneralBillById,
getGeneralBillingReport,
} = require("../controllers/generalBillingController");


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
// ========================================
// GENERAL POS - PRODUCT MANAGEMENT
// ========================================
router.get("/general-products", protect, authorize("admin"), getGeneralProducts);
router.post("/general-products", protect, authorize("admin"), createGeneralProduct);
router.get(
"/general-products/barcode/:barcode",
protect,
authorize("admin"),
getGeneralProductByBarcode
);
router.put(
"/general-products/:id",
protect,
authorize("admin"),
updateGeneralProduct
);
router.delete(
"/general-products/:id",
protect,
authorize("admin"),
deactivateGeneralProduct
);
// ========================================
// GENERAL POS - BILLING
// ========================================
router.post("/general-bills", protect, authorize("admin"), createGeneralBill);
router.get("/general-bills", protect, authorize("admin"), getGeneralBills);
router.get("/general-bills/:id", protect, authorize("admin"), getGeneralBillById);
router.get(
"/general-billing-report",
protect,
authorize("admin"),
getGeneralBillingReport
);

module.exports = router;