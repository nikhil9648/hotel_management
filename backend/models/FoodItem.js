const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Food name is required"],
            trim: true,
            maxlength: 150,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Category is required"],
        },

        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },

        discountPrice: {
            type: Number,
            default: null,
            min: 0,
        },

        image: {
            type: String,
            default: null,
        },

        foodType: {
            type: String,
            enum: ["veg", "non-veg", "vegan"],
            default: "veg",
        },

        isAvailable: {
            type: Boolean,
            default: true,
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

        preparationTime: {
            type: Number,
            default: 15,
            min: 1,
        },

        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("FoodItem", foodItemSchema);