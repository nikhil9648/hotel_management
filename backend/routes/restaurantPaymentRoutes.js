const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createRestaurantPaymentOrder,
  verifyRestaurantPayment,
} = require("../controllers/restaurantPaymentController");

router.post("/create-order", protect, createRestaurantPaymentOrder);
router.post("/verify", protect, verifyRestaurantPayment);

module.exports = router;