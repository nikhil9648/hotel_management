
const express = require("express");
const router = express.Router();

const { validateCoupon } = require("../controllers/couponController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post(
  "/validate",
  protect,
  authorize("customer", "user", "admin", "manager", "reception", "receptionist", "waiter"),
  validateCoupon
);

module.exports = router;
