
 // =====================================================
 // LOAD ENVIRONMENT VARIABLES FIRST
 // =====================================================

require("dotenv").config();

console.log("ENV CHECK");
console.log(
    "RAZORPAY_KEY_ID:",
    process.env.RAZORPAY_KEY_ID ? "FOUND" : "MISSING"
);
console.log(
    "RAZORPAY_KEY_SECRET:",
    process.env.RAZORPAY_KEY_SECRET ? "FOUND" : "MISSING"
);

// =====================================================
// IMPORTS
// =====================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const http = require("http");
const path = require("path");

const restaurantBillMessagingRoutes =
    require("./routes/restaurantBillMessagingRoutes");


const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const menuRoutes = require("./routes/menuRoutes");
const tableRoutes = require("./routes/tableRoutes");
const couponRoutes = require("./routes/couponRoutes");
const restaurantPaymentRoutes = require("./routes/restaurantPaymentRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const deliveryBoyRoutes = require("./routes/deliveryBoyRoutes");



const restaurantOrderRoutes = require(
    "./routes/restaurantOrderRoutes"
);
const kotRoutes = require("./routes/kotRoutes");
const restaurantBillRoutes = require(
    "./routes/restaurantBillRoutes"
);

// ADMIN ROUTES
const adminRoutes = require("./routes/adminRoutes");
const customerAuthRoutes = require("./routes/customerAuthRoutes");



const connectDB = require("./config/db");

// =====================================================
// APP
// =====================================================

const app = express();
const server = http.createServer(app);

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",
        credentials: true,
    })
);

app.use(helmet());
app.use(morgan("dev"));
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);
app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(cookieParser());

// =====================================================
// ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/rooms", roomRoutes);

app.use("/api/coupons", couponRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/menu", menuRoutes);

app.use("/api/tables", tableRoutes);

app.use("/api/delivery-boys", deliveryBoyRoutes);

app.use(
    "/api/restaurant-orders",
    restaurantOrderRoutes
);
app.use("/api/customer-auth", customerAuthRoutes);
app.use("/api/kots", kotRoutes);

app.use(
    "/api/restaurant-bills",
    restaurantBillRoutes
);
app.use("/api/restaurant-payments", restaurantPaymentRoutes);
// ADMIN ROUTES
app.use("/api/admin", adminRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================
app.use(
    "/api/restaurant-bills",
    restaurantBillMessagingRoutes
);
app.use("/api/delivery", deliveryRoutes);
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message:
            "Hotel & Restaurant Management API is running",
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is healthy",
        timestamp: new Date().toISOString(),
    });
});


// =====================================================
// 404
// =====================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message:
            `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT}`
    );
});
