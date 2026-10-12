const mongoose = require("mongoose");

const kotSchema = new mongoose.Schema(
    {
        // ==============================
        // TABLE
        // ==============================
        table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RestaurantTable",
    required: true,
},

        // ==============================
        // ORIGINAL ORDER
        // ==============================
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },

        // ==============================
        // WAITER
        // ==============================
        waiter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // ==============================
        // KOT NUMBER
        // ==============================
        kotNumber: {
            type: String,
            required: true,
            unique: true,
        },

        // ==============================
        // FOOD ITEMS
        // ==============================
        items: [
            {
                foodItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "FoodItem",
                    required: true,
                },

                name: {
                    type: String,
                    required: true,
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },

                specialInstructions: {
                    type: String,
                    default: "",
                },
            },
        ],

        // ==============================
        // KITCHEN STATUS
        // ==============================
        status: {
            type: String,
            enum: [
                "pending",
                "preparing",
                "ready",
                "served",
                "cancelled",
            ],
            default: "pending",
        },

        // ==============================
        // KITCHEN NOTE
        // ==============================
        kitchenNote: {
            type: String,
            default: "",
        },

        // ==============================
        // IMPORTANT TIMES
        // ==============================
        acceptedAt: {
            type: Date,
            default: null,
        },

        readyAt: {
            type: Date,
            default: null,
        },

        servedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("KOT", kotSchema);