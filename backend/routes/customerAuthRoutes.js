
const express = require("express");
const router = express.Router();

const {
    registerCustomer,
} = require("../controllers/customerAuthController");

router.post("/register", registerCustomer);

module.exports = router;
