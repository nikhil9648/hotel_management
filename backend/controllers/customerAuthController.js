
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// CUSTOMER SELF-REGISTRATION
const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, mobile number and password are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    // Validate Indian mobile number
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit Indian mobile number.",
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check whether email OR phone already exists
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
      ],
    }).select("email phone");

    if (existingUser) {
      const emailExists = existingUser.email === normalizedEmail;
      const phoneExists = existingUser.phone === normalizedPhone;

      let message;

      if (emailExists && phoneExists) {
        message = "This email and mobile number are already registered.";
      } else if (emailExists) {
        message = "An account with this email already exists.";
      } else {
        message = "This mobile number is already registered.";
      }

      return res.status(409).json({
        success: false,
        message,
        field:
          emailExists && phoneExists
            ? "email,phone"
            : emailExists
              ? "email"
              : "phone",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Always create a customer.
    // Never accept a role from public signup input.
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: "customer",
    });

    // Generate token using the same JWT format as authController
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Customer account created successfully.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Customer registration error:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message:
          duplicateField === "phone"
            ? "This mobile number is already registered."
            : "An account with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register customer.",
    });
  }
};

module.exports = { registerCustomer };
