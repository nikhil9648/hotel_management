const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        roomNumber: {
            type: String,
            required: [true, "Room number is required"],
            unique: true,
            trim: true,
        },

        roomType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RoomType",
            required: [true, "Room type is required"],
        },

        floor: {
            type: Number,
            required: [true, "Floor is required"],
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "available",
                "occupied",
                "reserved",
                "maintenance",
                "cleaning",
            ],
            default: "available",
        },

        price: {
            type: Number,
            min: 0,
            default: null,
        },

        amenities: {
            type: [String],
            default: [],
        },

        notes: {
            type: String,
            default: "",
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

module.exports = mongoose.model("Room", roomSchema);