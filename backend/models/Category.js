const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Category name is required"],
            unique: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        image: {
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Category", categorySchema);