const express = require("express");
const router = express.Router();

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const {
    getActiveDeliveryBoys,
} = require("../controllers/deliveryBoyController");

router.get(
    "/",
    protect,
    authorize("admin", "manager","reception","receptionist"),
    getActiveDeliveryBoys
);

module.exports = router;