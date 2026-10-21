const express = require("express");
const router = express.Router();

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const {
    getMyDeliveryOrders,
    verifyDeliveryOtp,
} = require("../controllers/restaurantOrderController");

// Delivery boy ke assigned active orders
router.get(
    "/my-orders",
    protect,
    authorize("delivery_boy"),
    getMyDeliveryOrders
);

// Customer ka OTP verify karke order delivered karna
router.post(
    "/:id/verify-otp",
    protect,
    authorize("delivery_boy"),
    verifyDeliveryOtp
);

module.exports = router;