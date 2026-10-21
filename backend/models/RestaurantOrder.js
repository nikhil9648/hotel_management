const mongoose = require("mongoose");

// =====================================================
// RESTAURANT ORDER SCHEMA
// =====================================================

const restaurantOrderSchema = new mongoose.Schema(
  {
    // ORDER NUMBER

    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: 100,
    },

    customerMobile: {
      type: String,
      required: [true, "Customer mobile number is required"],
      trim: true,
      maxlength: 20,
    },

    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    parentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantOrder",
      default: null,
      index: true,
    },

    // CUSTOMER
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // TABLE
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantTable",
      default: null,
    },

    // WAITER
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ORDER TYPE
    orderType: {
      type: String,
      enum: ["dine-in", "takeaway", "delivery"],
      default: "dine-in",
    },

    // DELIVERY ADDRESS
    deliveryAddress: {
      type: String,
      default: "",
      trim: true,
    },

    // ORDER ITEMS
    items: [
      {
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodItem",
          required: true,
        },

        name: {
          type: String,
          required: true,
          trim: true,
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

        total: {
          type: Number,
          required: true,
          min: 0,
        },

        specialInstructions: {
          type: String,
          default: "",
          trim: true,
        },

        // NEW: Individual item serving preference
        servingType: {
          type: String,
          enum: ["dine-in", "takeaway"],
          default: "dine-in",
          required: true,
        },
      },
    ],

    // AMOUNTS
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
  type: String,
  default: null,
  trim: true,
  uppercase: true,
},
discountAmount: {
  type: Number,
  default: 0,
  min: 0,
},
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ORDER STATUS
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "cancelled",
        "out_for_delivery",
        "delivered",
      ],
      default: "pending",
    },

    // PAYMENT STATUS
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid"],
      default: "unpaid",
    },

    // PAYMENT METHOD
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "razorpay", "pending"],
      default: "pending",
    },

    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    paymentVerifiedAt: {
      type: Date,
      default: null,
    },

    invoiceNumber: {
      type: String,
      default: null,
    },

    invoiceEmailSentAt: {
      type: Date,
      default: null,
    },
    billGenerated: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Delivery assignment
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    deliveryAssignedAt: {
      type: Date,
      default: null,
    },

    // Delivery OTP security
    deliveryOtpEncrypted: {
      type: String,
      default: null,
      select: false,
    },

    deliveryOtpExpiresAt: {
      type: Date,
      default: null,
    },

    deliveryOtpVerifiedAt: {
      type: Date,
      default: null,
    },

    deliveryOtpAttempts: {
      type: Number,
      default: 0,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    // NOTES
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================================
// PRE SAVE - ORDER NUMBER
// =====================================================

restaurantOrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
});

// =====================================================
// INDEXES
// =====================================================

restaurantOrderSchema.index({
  table: 1,
  createdAt: -1,
});

restaurantOrderSchema.index({
  orderStatus: 1,
});

restaurantOrderSchema.index({
  paymentStatus: 1,
});

restaurantOrderSchema.index({
  waiter: 1,
  createdAt: -1,
});

restaurantOrderSchema.index({
  customer: 1,
  createdAt: -1,
});

// =====================================================
// MODEL
// =====================================================

module.exports = mongoose.model("RestaurantOrder", restaurantOrderSchema);
