
const express = require("express");
const router = express.Router();

const {
  createEventRegistration,
  verifyEventPayment,
  getMyEventRegistrations,
  verifyEventTicket,
  checkInEventAttendee,
} = require("../controllers/eventRegistrationController");

const { protect } = require("../middleware/authMiddleware");

// Allow only authorized hotel staff to scan/check in event attendees.
const allowEventStaff = (req, res, next) => {
  const allowedRoles = ["admin", "manager", "employee", "staff", "waiter"];

  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "Authorized hotel staff access required",
    });
  }

  next();
};

// Guest registration and payment
router.post("/register", createEventRegistration);
router.post("/verify-payment", verifyEventPayment);

// Logged-in customer's tickets
router.get("/my-tickets", protect, getMyEventRegistrations);

// Employee QR scanner and entry management
router.get(
  "/ticket/:token",
  protect,
  allowEventStaff,
  verifyEventTicket
);

router.post(
  "/ticket/:token/check-in",
  protect,
  allowEventStaff,
  checkInEventAttendee
);

module.exports = router;
