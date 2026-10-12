const mongoose = require("mongoose");

const restaurantTableSchema = new mongoose.Schema(
    {
        tableNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        capacity: {
            type: Number,
            required: true,
            min: 1,
        },

        status: {
            type: String,
            enum: [
                "available",
                "occupied",
                "reserved",
                "billing",
            ],
            default: "available",
        },

        location: {
            type: String,
            default: "Restaurant",
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "RestaurantTable",
    restaurantTableSchema
);