const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        // =========================================
        // Customer
        // =========================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
},

        // =========================================
        // Room
        // =========================================

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },

        // =========================================
        // Booking Number
        // =========================================

        bookingNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // =========================================
        // Stay Dates
        // =========================================

        checkInDate: {
            type: Date,
            required: true,
        },

        checkOutDate: {
            type: Date,
            required: true,
        },

        // =========================================
        // Guests
        // =========================================

        adults: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },

        children: {
            type: Number,
            default: 0,
            min: 0,
        },

        // =========================================
        // Guest Details
        // =========================================

        guestDetails: {
            name: {
                type: String,
                required: true,
                trim: true,
            },

            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
            },

            phone: {
                type: String,
                required: true,
                trim: true,
            },

            address: {
                type: String,
                default: "",
                trim: true,
            },

            idProofType: {
                type: String,
                enum: [
                    "Aadhar",
                    "Passport",
                    "Driving License",
                    "Voter ID",
                    "Other",
                ],
                default: "Aadhar",
            },

            idProofNumber: {
                type: String,
                default: "",
                trim: true,
            },
        },

        // =========================================
        // Pricing
        // =========================================

        pricePerNight: {
            type: Number,
            required: true,
            min: 0,
        },

        numberOfNights: {
            type: Number,
            required: true,
            min: 1,
        },

        roomCharges: {
            type: Number,
            required: true,
            min: 0,
        },

        taxAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        discountAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        // =========================================
        // Booking Status
        // =========================================

        bookingStatus: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "checked_in",
                "checked_out",
                "cancelled",
            ],
            default: "pending",
        },

        // =========================================
        // Payment
        // =========================================

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "paid",
                "partially_paid",
                "refunded",
                "failed",
            ],
            default: "pending",
        },

        paymentMethod: {
            type: String,
            enum: [
                "cash",
                "card",
                "upi",
                "razorpay",
                "other",
            ],
            default: "razorpay",
        },
         razorpayOrderId: {
    type: String,
    default: null,
},

razorpayPaymentId: {
    type: String,
    default: null,
},

razorpaySignature: {
    type: String,
    default: null,
},
        // =========================================
        // Special Request
        // =========================================

        specialRequests: {
            type: String,
            default: "",
            trim: true,
        },

        // =========================================
        // Cancellation
        // =========================================

        cancellationReason: {
            type: String,
            default: "",
            trim: true,
        },

        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// =========================================
// Indexes
// =========================================

bookingSchema.index({
    room: 1,
    checkInDate: 1,
    checkOutDate: 1,
});

bookingSchema.index({
    user: 1,
    createdAt: -1,
});

bookingSchema.index({
    bookingStatus: 1,
});

module.exports = mongoose.model(
    "Booking",
    bookingSchema
);