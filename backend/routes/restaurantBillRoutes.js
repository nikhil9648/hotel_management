const express = require("express");

const {
    createRestaurantBill,
    getRestaurantBill,
    payRestaurantBill,
    generateRestaurantBillPDF,
    getAllRestaurantBills,
    getRestaurantDashboard,
} = require("../controllers/restaurantBillController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// CREATE BILL FROM ORDER IDS
// POST /api/restaurant-bills
// =====================================================

router.post(
    "/",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist",
        "waiter"
    ),
    createRestaurantBill
);


// =====================================================
// CREATE BILL FROM TABLE
// POST /api/restaurant-bills/table/:tableId
// =====================================================

router.post(
    "/table/:tableId",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist",
        "waiter"
    ),
    createRestaurantBill
);


// =====================================================
// GET ALL BILLS
// GET /api/restaurant-bills
// =====================================================

router.get(
    "/",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist",
        "waiter"
    ),
    getAllRestaurantBills
);


// =====================================================
// RESTAURANT BILL DASHBOARD
// GET /api/restaurant-bills/dashboard
// =====================================================

router.get(
    "/dashboard",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist"
    ),
    getRestaurantDashboard
);


// =====================================================
// PAY BILL
// POST /api/restaurant-bills/:id/pay
// =====================================================

router.post(
    "/:id/pay",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist"
    ),
    payRestaurantBill
);


// =====================================================
// BILL PDF
// GET /api/restaurant-bills/:id/pdf
// =====================================================

router.get(
    "/:id/pdf",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist",
        "waiter"
    ),
    generateRestaurantBillPDF
);


// =====================================================
// GET BILL BY ID
// GET /api/restaurant-bills/:id
// =====================================================

router.get(
    "/:id",
    protect,
    authorize(
        "admin",
        "reception",
        "receptionist",
        "waiter"
    ),
    getRestaurantBill
);


module.exports = router;