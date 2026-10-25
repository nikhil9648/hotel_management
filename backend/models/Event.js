
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },

    poster: {
      type: String,
      default: "",
    },

    venue: {
      type: String,
      required: [true, "Event venue is required"],
      trim: true,
    },

    startDate: {
      type: Date,
      required: [true, "Event start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "Event end date is required"],
      validate: {
        validator: function (value) {
          return !this.startDate || value >= this.startDate;
        },
        message: "Event end date must be after start date",
      },
    },

    registrationDeadline: {
      type: Date,
      required: [true, "Registration deadline is required"],
    },

    ticketPrice: {
      type: Number,
      required: true,
      min: [0, "Ticket price cannot be negative"],
    },

    capacity: {
      type: Number,
      required: true,
      min: [1, "Capacity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole number",
      },
    },

    bookedTickets: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Quickly find published events by date.
eventSchema.index({ status: 1, startDate: 1 });

// Prevent invalid ticket counts.
eventSchema.pre("validate", function () {
  if (this.bookedTickets > this.capacity) {
    this.invalidate(
      "bookedTickets",
      "Booked tickets cannot exceed event capacity"
    );
  }
});

module.exports = mongoose.model("Event", eventSchema);
