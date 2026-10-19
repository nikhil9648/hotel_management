
const express = require("express");
const router = express.Router();

const {
    sendRestaurantBillMessage,
} = require("../controllers/restaurantBillMessagingController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

router.post(
    "/:id/send-message",
    protect,
    authorize("admin", "reception", "receptionist"),
    sendRestaurantBillMessage
);

module.exports = router;
