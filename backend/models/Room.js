
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
    },

    floor: {
      type: Number,
      required: [true, "Floor is required"],
      min: 0,
    },

    // Category details embedded in the room document
    roomType: {
      name: {
        type: String,
        required: [true, "Room type name is required"],
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
        required: true,
        min: 0,
      },
      capacity: {
        type: Number,
        required: true,
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

    // Actual room price; defaults to the category price
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
