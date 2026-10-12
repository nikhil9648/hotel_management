const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        let token;

        // ========================================
        // Get Token From Authorization Header
        // ========================================

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // ========================================
        // Token Not Found
        // ========================================

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please login.",
            });
        }

        // ========================================
        // Verify Token
        // ========================================

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // ========================================
        // Find User
        // ========================================

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists.",
            });
        }

        // ========================================
        // Check Active Account
        // ========================================

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive.",
            });
        }

        // ========================================
        // Attach User To Request
        // ========================================

        req.user = user;

        next();

    } catch (error) {

        console.error("Authentication Error:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please login again.",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Authentication failed.",
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource.",
            });
        }

        next();
    };
};

module.exports = {
    protect,
    authorize,
};