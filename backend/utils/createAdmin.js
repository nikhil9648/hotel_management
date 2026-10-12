const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();

// ========================================
// Create Admin
// ========================================

const createAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = "admin@hotel.com";

        // Check existing admin
        const existingAdmin = await User.findOne({
            email: adminEmail,
        });

        if (existingAdmin) {
            console.log("Admin already exists.");

            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            "Admin@123456",
            12
        );

        // Create admin
        const admin = await User.create({
            name: "Hotel Administrator",
            email: adminEmail,
            phone: "9999999999",
            password: hashedPassword,
            role: "admin",
            isActive: true,
            isVerified: true,
        });

        console.log("========================================");
        console.log("ADMIN CREATED SUCCESSFULLY");
        console.log("========================================");
        console.log("Email:", admin.email);
        console.log("Password:", "Admin@123456");
        console.log("Role:", admin.role);
        console.log("========================================");

        process.exit(0);

    } catch (error) {
        console.error("Create Admin Error:", error);

        process.exit(1);
    }
};

createAdmin();