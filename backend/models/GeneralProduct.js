
const mongoose = require("mongoose");

const generalProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        barcode: {
            type: String,
            trim: true,
            sparse: true,
            unique: true,
        },

        category: {
            type: String,
            required: true,
            trim: true,
            default: "General",
        },

        unit: {
            type: String,
            enum: ["piece", "bottle", "packet", "kg", "gram", "litre", "ml", "box"],
            default: "piece",
        },

        purchasePrice: {
            type: Number,
            required: true,
            min: 0,
        },

        sellingPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        lowStockAlert: {
            type: Number,
            default: 5,
            min: 0,
        },

        expiryDate: {
            type: Date,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

generalProductSchema.index({ name: "text", category: "text" });

module.exports = mongoose.model("GeneralProduct", generalProductSchema);
