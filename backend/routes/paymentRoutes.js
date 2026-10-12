const express = require("express");

const {
    createPaymentOrder,
    verifyPayment,
} = require("../controllers/paymentController");

const {
    protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// CREATE RAZORPAY ORDER
// POST /api/payments/create-order
// =====================================================

router.post(
    "/create-order",
    protect,
    createPaymentOrder
);


// =====================================================
// VERIFY RAZORPAY PAYMENT
// POST /api/payments/verify
// =====================================================

router.post(
    "/verify",
    protect,
    verifyPayment
);


module.exports = router;