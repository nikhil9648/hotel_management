const mongoose = require("mongoose");

const restaurantBillSchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            unique: true,
            required: true,
        },

        table: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RestaurantTable",
            required: true,
        },

        orders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RestaurantOrder",
            },
        ],

        customerName: {
            type: String,
            default: "Walk-in Customer",
            trim: true,
        },

        customerPhone: {
            type: String,
            default: "",
            trim: true,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        taxAmount: {
            type: Number,
            required: true,
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

        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        paymentStatus: {
            type: String,
            enum: [
                "unpaid",
                "partially_paid",
                "paid",
            ],
            default: "unpaid",
        },

        paymentMethod: {
            type: String,
            enum: [
                "cash",
                "card",
                "upi",
                "razorpay",
                "pending",
            ],
            default: "pending",
        },

        status: {
            type: String,
            enum: [
                "open",
                "paid",
                "cancelled",
            ],
            default: "open",
        },
    },
    {
        timestamps: true,
    }
);

restaurantBillSchema.index({
    table: 1,
    createdAt: -1,
});

module.exports = mongoose.model(
    "RestaurantBill",
    restaurantBillSchema
);