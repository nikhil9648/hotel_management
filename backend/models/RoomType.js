const mongoose = require("mongoose");

const roomTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Room type name is required"],
            unique: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        basePrice: {
            type: Number,
            required: [true, "Base price is required"],
            min: 0,
        },

        capacity: {
            type: Number,
            required: [true, "Room capacity is required"],
            min: 1,
        },

        amenities: {
            type: [String],
            default: [],
        },

        images: {
            type: [String],
            default: [],
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

module.exports = mongoose.model("RoomType", roomTypeSchema);