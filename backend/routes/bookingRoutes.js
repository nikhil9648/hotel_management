const express = require("express");

const {
    getAvailableRooms,
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    getAllBookings,
    updateBookingStatus,
    adminCreateBooking,
    downloadBookingInvoice,
} = require("../controllers/bookingController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// CUSTOMER ROUTES
// =====================================================

// Check available rooms
// GET /api/bookings/available-rooms
router.get(
    "/available-rooms",
    protect,
    getAvailableRooms
);


// Create new booking
// POST /api/bookings
router.post(
    "/",
    protect,
    createBooking
);
router.post(
    "/admin-create",
    protect,
    authorize("admin"),
    adminCreateBooking
);

// Get logged-in customer's bookings
// GET /api/bookings/my-bookings
router.get(
    "/my-bookings",
    protect,
    getMyBookings
);


// Get single booking
// GET /api/bookings/:id
router.get(
    "/:id",
    protect,
    getBookingById
);


// Cancel booking
// PATCH /api/bookings/:id/cancel
router.patch(
    "/:id/cancel",
    protect,
    cancelBooking
);


// =====================================================
// ADMIN ROUTES
// =====================================================

// Get all bookings
// GET /api/bookings
router.get(
    "/",
    protect,
    authorize("admin"),
    getAllBookings
);

// Download booking invoice PDF
router.get(
    "/:id/invoice",
    protect,
    authorize("admin"),
    downloadBookingInvoice
);
// Update booking status
// PATCH /api/bookings/:id/status
router.patch(
    "/:id/status",
    protect,
    authorize("admin"),
    updateBookingStatus
);


module.exports = router;