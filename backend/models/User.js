const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
            select: false,
        },

        role: {
            type: String,
            enum: [
                "customer",
                "admin",
                "manager",
                "receptionist",
                "waiter",
                "kitchen",
                "accountant",
                "hr",
            ],
            default: "customer",
        },

        profileImage: {
            type: String,
            default: null,
        },

        address: {
            street: {
                type: String,
                default: "",
            },
            city: {
                type: String,
                default: "",
            },
            state: {
                type: String,
                default: "",
            },
            pincode: {
                type: String,
                default: "",
            },
            country: {
                type: String,
                default: "India",
            },
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        lastLogin: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);