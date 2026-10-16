
const mongoose = require("mongoose");

const generalBillSchema = new mongoose.Schema(
    {
        customerName: {
  type: String,
  trim: true,
  maxlength: 100,
  default: "Walk-in Customer",
},

customerPhone: {
  type: String,
  trim: true,
  default: "",
},
        billNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "GeneralProduct",
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                barcode: {
                    type: String,
                    default: null,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                unitPrice: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                lineTotal: {
                    type: Number,
                    required: true,
                    min: 0,
                },
            },
        ],

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        discount: {
            type: Number,
            default: 0,
            min: 0,
        },

        tax: {
            type: Number,
            default: 0,
            min: 0,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "card"],
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },

        amountReceived: {
            type: Number,
            default: 0,
            min: 0,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        paidAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("GeneralBill", generalBillSchema);
