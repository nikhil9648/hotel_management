const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ========================================
// Generate JWT Token
// ========================================

const generateToken = (userId) => {
    return jwt.sign(
        {
            id: userId,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

// ========================================
// Register User
// ========================================

const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password,
        } = req.body || {};

        // ========================================
        // Validation
        // ========================================

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        // ========================================
        // Validate Password Length
        // ========================================

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        // ========================================
        // Normalize Email
        // ========================================

        const normalizedEmail = email.trim().toLowerCase();

        // ========================================
        // Check Existing User
        // ========================================

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        // ========================================
        // Hash Password
        // ========================================

        const hashedPassword = await bcrypt.hash(password, 12);

        // ========================================
        // Create User
        // ========================================

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            password: hashedPassword,
            role: "customer",
        });

        // ========================================
        // Generate JWT
        // ========================================

        const token = generateToken(user._id);

        // ========================================
        // Response
        // ========================================

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("Register Error:", error);

        // Duplicate email protection
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during registration",
        });
    }
};

// ========================================
// Login User
// ========================================

const loginUser = async (req, res) => {
    try {
        const {
            email,
            password,
        } = req.body || {};

        // ========================================
        // Validation
        // ========================================

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // ========================================
        // Normalize Email
        // ========================================

        const normalizedEmail = email.trim().toLowerCase();

        // ========================================
        // Find User
        // ========================================

        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+password");

        // ========================================
        // User Not Found
        // ========================================

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // ========================================
        // Check Active Account
        // ========================================

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive",
            });
        }

        // ========================================
        // Compare Password
        // ========================================

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // ========================================
        // Update Last Login
        // ========================================

        user.lastLogin = new Date();

        await user.save();

        // ========================================
        // Generate JWT
        // ========================================

        const token = generateToken(user._id);

        // ========================================
        // Response
        // ========================================

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
            },
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during login",
        });
    }
};

// ========================================
// Get Current Logged-in User
// ========================================

const getMe = async (req, res) => {
    try {
        // req.user is added by protect middleware
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profileImage: user.profileImage,
                address: user.address,
                isActive: user.isActive,
                isVerified: user.isVerified,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });

    } catch (error) {
        console.error("Get Me Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch user profile",
        });
    }
};



const updateMyAddress = async (req, res) => {
  try {
    const { street, city, state, pincode, country } = req.body || {};

    if (
      typeof street !== "string" ||
      typeof city !== "string" ||
      typeof state !== "string" ||
      typeof pincode !== "string" ||
      !street.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Street, city, state and pincode are required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.set("address", {
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country:
        typeof country === "string" && country.trim()
          ? country.trim()
          : "India",
    });

    // Update only address to avoid validating unrelated legacy fields.
    await User.updateOne(
      { _id: user._id },
      { $set: { address: user.address } },
      { runValidators: false }
    );

    return res.status(200).json({
      success: true,
      message: "Delivery address saved successfully.",
      address: user.address,
    });
  } catch (error) {
    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save delivery address.",
    });
  }
};

// ========================================
// Logout User
// ========================================

const logoutUser = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });

    } catch (error) {
        console.error("Logout Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during logout",
        });
    }
};

// ========================================
// Export Controllers
// ========================================

module.exports = {
    registerUser,
    loginUser,
    getMe,
    logoutUser,
    updateMyAddress,
};