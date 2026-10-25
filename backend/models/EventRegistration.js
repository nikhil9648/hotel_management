
const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Attendee name is required"],
      trim: true,
      maxlength: [100, "Attendee name cannot exceed 100 characters"],
    },
  },
  { _id: false }
);

const entrySchema = new mongoose.Schema(
  {
    attendeeIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    // Optional: guest checkout does not require a user account.
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    customerName: {
      type: String,
      required: [true, "Booking contact name is required"],
      trim: true,
      maxlength: [100, "Customer name cannot exceed 100 characters"],
    },

    customerEmail: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
      index: true,
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    attendees: {
      type: [attendeeSchema],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) && value.length > 0,
        message: "At least one attendee is required",
      },
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
      select: false,
    },

    // A single secure token represents the whole booking.
    ticketToken: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
      select: false,
    },

    ticketEmailSentAt: {
      type: Date,
      default: null,
    },

    entryHistory: {
      type: [entrySchema],
      default: [],
    },

    checkedInCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Quantity must equal the number of attendee names.
eventRegistrationSchema.pre("validate", function () {
  if (
    this.quantity !== undefined &&
    Array.isArray(this.attendees) &&
    this.quantity !== this.attendees.length
  ) {
    this.invalidate(
      "quantity",
      "Quantity must match the number of attendees"
    );
  }

  if (this.checkedInCount > this.quantity) {
    this.invalidate(
      "checkedInCount",
      "Checked-in count cannot exceed ticket quantity"
    );
  }

  if (
    Array.isArray(this.entryHistory) &&
    this.entryHistory.length > this.quantity
  ) {
    this.invalidate(
      "entryHistory",
      "Entry history cannot exceed ticket quantity"
    );
  }

  const indexes = (this.entryHistory || []).map(
    (entry) => entry.attendeeIndex
  );

  if (new Set(indexes).size !== indexes.length) {
    this.invalidate(
      "entryHistory",
      "An attendee cannot be checked in more than once"
    );
  }

  if (indexes.some(
    (index) =>
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.quantity
  )) {
    this.invalidate(
      "entryHistory",
      "Invalid attendee index in entry history"
    );
  }
});

module.exports = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);
