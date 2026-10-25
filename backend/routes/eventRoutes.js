
const express = require("express");
const router = express.Router();

const {
  createEvent,
  getAdminEvents,
  getPublishedEvents,
  updateEvent,
  getEventGuestList,
} = require("../controllers/eventController");

const { protect } = require("../middleware/authMiddleware");

// Allow only admin and manager for admin event APIs.
const allowEventAdmin = (req, res, next) => {
  if (!["admin", "manager"].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin or manager access required",
    });
  }

  next();
};

// Public: list published events
router.get("/", getPublishedEvents);

// Protected: create event
router.post(
  "/",
  protect,
  allowEventAdmin,
  createEvent
);

// Protected: admin event list
router.get(
  "/admin",
  protect,
  allowEventAdmin,
  getAdminEvents
);

router.get(
  "/:id/guests",
  protect,
  allowEventAdmin,
  getEventGuestList
);

router.put("/:id", protect, allowEventAdmin, updateEvent);

module.exports = router;
