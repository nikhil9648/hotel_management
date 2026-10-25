
const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventRegistration = require("../models/EventRegistration");

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      poster,
      venue,
      startDate,
      endDate,
      registrationDeadline,
      ticketPrice,
      capacity,
      status,
    } = req.body;

    if (
      !title ||
      !description ||
      !venue ||
      !startDate ||
      !endDate ||
      !registrationDeadline ||
      ticketPrice === undefined ||
      capacity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required event details",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const deadline = new Date(registrationDeadline);
    const price = Number(ticketPrice);
    const totalCapacity = Number(capacity);

    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      !Number.isFinite(deadline.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event date or registration deadline",
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    if (deadline > start) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline must be on or before event start",
      });
    }

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(totalCapacity) ||
      !Number.isInteger(totalCapacity) ||
      totalCapacity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid ticket price and whole-number capacity",
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      poster: poster || "",
      venue: venue.trim(),
      startDate: start,
      endDate: end,
      registrationDeadline: deadline,
      ticketPrice: price,
      capacity: totalCapacity,
      status: status === "published" ? "published" : "draft",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create Event Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create event",
    });
  }
};




const getAdminEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();

    const eventIds = events.map((event) => event._id);

    const paidCounts = await EventRegistration.aggregate([
      {
        $match: {
          event: { $in: eventIds },
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$event",
          paidTickets: { $sum: "$quantity" },
          paidBookings: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      paidCounts.map((item) => [
        String(item._id),
        {
          paidTickets: item.paidTickets,
          paidBookings: item.paidBookings,
        },
      ])
    );

    const result = events.map((event) => {
      const counts = countMap.get(String(event._id)) || {
        paidTickets: 0,
        paidBookings: 0,
      };

      return {
        ...event,
        paidTickets: counts.paidTickets,
        paidBookings: counts.paidBookings,
      };
    });

    return res.status(200).json({
      success: true,
      events: result,
    });
  } catch (error) {
    console.error("Get Admin Events Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load admin events",
    });
  }
};


const getPublishedEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: "published",
      registrationDeadline: { $gte: new Date() },
      startDate: { $gt: new Date() },
    }).sort({ startDate: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Get Published Events Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch published events",
    });
  }
};


const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "poster",
      "venue",
      "startDate",
      "endDate",
      "registrationDeadline",
      "ticketPrice",
      "capacity",
      "status",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    }

    if (Number(event.capacity) < event.bookedTickets) {
      return res.status(400).json({
        success: false,
        message: "Capacity cannot be lower than already booked tickets",
      });
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Update Event Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to update event",
    });
  }
};

const getEventGuestList = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id).select(
      "title venue startDate capacity"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Only fully paid registrations are included.
    const registrations = await EventRegistration.find({
      event: event._id,
      paymentStatus: "paid",
    })
      .select(
        "customerName customerEmail customerPhone attendees quantity totalAmount paymentStatus createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const guests = registrations.map((registration) => ({
      registrationId: String(registration._id),
      customerName: registration.customerName,
      customerEmail: registration.customerEmail,
      customerPhone: registration.customerPhone || "",
      attendees: (registration.attendees || []).map(
        (attendee) => attendee.name
      ),
      quantity: registration.quantity,
      totalAmount: registration.totalAmount,
      paymentStatus: registration.paymentStatus,
      registeredAt: registration.createdAt,
    }));

    return res.status(200).json({
      success: true,
      event,
      totalBookings: guests.length,
      totalPaidAttendees: guests.reduce(
        (sum, guest) => sum + Number(guest.quantity || 0),
        0
      ),
      guests,
    });
  } catch (error) {
    console.error("Get Event Guest List Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch event guest list",
    });
  }
};

module.exports = {
  createEvent,
  getAdminEvents,
  getPublishedEvents,
  updateEvent,
  getEventGuestList,
};
