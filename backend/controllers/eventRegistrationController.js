
const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const transporter = require("../config/mailer");

const Event = require("../models/Event");
const EventRegistration = require("../models/EventRegistration");

const {
  generateEventQr,
} = require("../utils/eventQR");

// =====================================================
// SEND EVENT TICKET EMAIL
// =====================================================


const sendEventTicketEmail = async (registration) => {
  if (
    !registration ||
    registration.paymentStatus !== "paid" ||
    !registration.ticketToken
  ) {
    throw new Error("Paid registration or ticket token is missing");
  }

  // Avoid sending the same ticket email again.
  if (registration.ticketEmailSentAt) {
    return { sent: true, alreadySent: true };
  }

  const event =
    registration.event && registration.event.title
      ? registration.event
      : await Event.findById(registration.event);

  if (!event) {
    throw new Error("Event not found for ticket email");
  }

  // Generate the entry QR code.
  const { qrDataUrl } = await generateEventQr(
    registration.ticketToken
  );

  const base64Image = qrDataUrl.split(",")[1];

  if (!base64Image) {
    throw new Error("Unable to prepare event QR image");
  }

  // Download the event poster, if a valid public image URL exists.
  let eventPosterAttachment = null;

  if (event.poster) {
    try {
      const posterResponse = await fetch(event.poster);

      if (posterResponse.ok) {
        const contentType =
          posterResponse.headers.get("content-type") || "";

        const imageBuffer = Buffer.from(
          await posterResponse.arrayBuffer()
        );

        if (
          contentType.startsWith("image/") &&
          imageBuffer.length > 0 &&
          imageBuffer.length <= 5 * 1024 * 1024
        ) {
          const mimeExtension = contentType
            .split("/")[1]
            ?.split(";")[0]
            ?.toLowerCase();

          const extension =
            mimeExtension === "jpeg"
              ? "jpg"
              : ["png", "jpg", "gif", "webp"].includes(
                    mimeExtension
                  )
                ? mimeExtension
                : "jpg";

          eventPosterAttachment = {
            filename: `event-poster.${extension}`,
            content: imageBuffer,
            contentType,
            cid: "eventposter",
          };
        }
      }
    } catch (error) {
      // Poster failure should not prevent sending the ticket QR.
      console.error(
        "Event poster download failed:",
        error.message
      );
    }
  }

  const attendeeNames = registration.attendees
    .map(
      (attendee, index) =>
        `<li>${index + 1}. ${escapeHtml(attendee.name)}</li>`
    )
    .join("");

  const eventDate = new Date(event.startDate).toLocaleString(
    "en-IN",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }
  );

  const safeEventTitle = escapeHtml(event.title);
  const safeVenue = escapeHtml(event.venue);
  const safeCustomerName = escapeHtml(registration.customerName);
  const safeEventDate = escapeHtml(eventDate);

  // Put the poster markup inside the email HTML template.
  const posterHtml = eventPosterAttachment
    ? `
        <h3>Event Poster</h3>
        <img
          src="cid:eventposter"
          alt="Event Poster"
          width="500"
          style="display:block;max-width:100%;height:auto;border-radius:10px;"
        />
      `
    : "";

  const attachments = [
    {
      filename: "event-ticket-qr.png",
      content: base64Image,
      encoding: "base64",
      contentType: "image/png",
      cid: "eventticketqr",
    },
  ];

  if (eventPosterAttachment) {
    attachments.push(eventPosterAttachment);
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: registration.customerEmail,
    subject: `Your Event Ticket - ${event.title}`,

    text: [
      `Hello ${registration.customerName},`,
      "",
      `Your payment for ${event.title} has been verified.`,
      `Booking ID: ${registration._id}`,
      `Event date: ${eventDate}`,
      `Venue: ${event.venue}`,
      `Number of attendees: ${registration.quantity}`,
      `Total paid: INR ${registration.totalAmount}`,
      "",
      event.poster
        ? "The event poster is included in your email."
        : "",
      "Your entry QR code is included in this email.",
      "Please show the QR code to event staff at entry.",
    ].join("\n"),

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;padding:16px">
        <h2>Event Ticket Confirmed!</h2>

        <p>Hello ${safeCustomerName},</p>

        <p>
          Your payment has been verified successfully.
          Your event ticket is ready.
        </p>

        <h3>${safeEventTitle}</h3>

        ${posterHtml}

        <p><strong>Date:</strong> ${safeEventDate}</p>
        <p><strong>Venue:</strong> ${safeVenue}</p>
        <p><strong>Booking ID:</strong> ${registration._id}</p>
        <p><strong>Attendees:</strong> ${registration.quantity}</p>
        <p>
          <strong>Total paid:</strong>
          ₹${Number(registration.totalAmount).toFixed(2)}
        </p>

        <h3>Attendee Names</h3>
        <ol>${attendeeNames}</ol>

        <h3>Your Entry QR Code</h3>
        <p>Show this QR code to event staff when you arrive.</p>

        <img
          src="cid:eventticketqr"
          alt="Event entry QR code"
          width="280"
          height="280"
          style="display:block;max-width:100%;height:auto"
        />

        <p>Keep this email until the event has ended.</p>
      </div>
    `,

    attachments,
  });

  // Record successful email delivery through the mail transport.
//   await EventRegistration.updateOne(
//     {
//       _id: registration._id,
//       paymentStatus: "paid",
//       ticketEmailSentAt: null,
//     },
//     {
//       $set: { ticketEmailSentAt: new Date() },
//     }
//   );

//   return { sent: true, alreadySent: false };
// };

  // Record the successful send only after Nodemailer succeeds.
  await EventRegistration.updateOne(
    {
      _id: registration._id,
      paymentStatus: "paid",
      ticketEmailSentAt: null,
    },
    {
      $set: { ticketEmailSentAt: new Date() },
    }
  );

  return { sent: true, alreadySent: false };
};

// Escape dynamic text before inserting it into HTML.
const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
};

// =====================================================
// CREATE GUEST EVENT REGISTRATION + RAZORPAY ORDER
// =====================================================

const createEventRegistration = async (req, res) => {
  let reservedEventId = null;
  let reservedQuantity = 0;
  let registrationId = null;

  try {
    const {
      eventId,
      customerName,
      customerEmail,
      customerPhone,
      attendees,
    } = req.body || {};

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: "Razorpay configuration is missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      customerName.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid booking contact name",
      });
    }

    const email =
      typeof customerEmail === "string"
        ? customerEmail.trim().toLowerCase()
        : "";

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (
      customerPhone !== undefined &&
      (typeof customerPhone !== "string" ||
        customerPhone.trim().length > 20)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (
      !Array.isArray(attendees) ||
      attendees.length < 1 ||
      attendees.length > 20
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide names for 1 to 20 attendees",
      });
    }

    const names = attendees.map((person) =>
      typeof person?.name === "string" ? person.name.trim() : ""
    );

    if (names.some((name) => !name || name.length > 100)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name for every attendee",
      });
    }

    const quantity = names.length;
    const now = new Date();

    // Atomically reserve event capacity.
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: "published",
        registrationDeadline: { $gte: now },
        startDate: { $gt: now },
        $expr: {
          $lte: [
            { $add: ["$bookedTickets", quantity] },
            "$capacity",
          ],
        },
      },
      {
        $inc: { bookedTickets: quantity },
      },
      {
        returnDocument: "after",
      }
    );

    if (!event) {
      return res.status(400).json({
        success: false,
        message:
          "Event unavailable, registration closed, or tickets sold out",
      });
    }

    reservedEventId = event._id;
    reservedQuantity = quantity;

    const totalAmount = Number(
      (Number(event.ticketPrice) * quantity).toFixed(2)
    );

    const amountInPaise = Math.round(totalAmount * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      throw new Error("Invalid event payment amount");
    }

    const registration = await EventRegistration.create({
      event: event._id,
      customer: null,
      customerName: customerName.trim(),
      customerEmail: email,
      customerPhone: customerPhone?.trim() || "",
      attendees: names.map((name) => ({ name })),
      quantity,
      totalAmount,
      paymentStatus: "pending",
    });

    registrationId = registration._id;

    const paymentOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `evt_${registration._id.toString().slice(-20)}`,
      notes: {
        registrationId: registration._id.toString(),
        eventId: event._id.toString(),
      },
    });

    registration.razorpayOrderId = paymentOrder.id;
    await registration.save();

    return res.status(201).json({
      success: true,
      message: "Registration created. Complete payment to confirm tickets.",
      registrationId: registration._id,
      eventTitle: event.title,
      attendees: registration.attendees,
      quantity,
      ticketPrice: event.ticketPrice,
      totalAmount,
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
    });
  } catch (error) {
    console.error("Create Event Registration Error:", error);

    if (reservedEventId && reservedQuantity > 0) {
      try {
        await Event.updateOne(
          {
            _id: reservedEventId,
            bookedTickets: { $gte: reservedQuantity },
          },
          {
            $inc: { bookedTickets: -reservedQuantity },
          }
        );
      } catch (releaseError) {
        console.error(
          "Capacity release failed:",
          releaseError.message
        );
      }
    }

    if (registrationId) {
      try {
        await EventRegistration.deleteOne({
          _id: registrationId,
          paymentStatus: "pending",
        });
      } catch (cleanupError) {
        console.error(
          "Registration cleanup failed:",
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create event registration",
    });
  }
};

// =====================================================
// VERIFY GUEST RAZORPAY PAYMENT + EMAIL QR TICKET
// =====================================================

const verifyEventPayment = async (req, res) => {
  try {
    const {
      registrationId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      !mongoose.Types.ObjectId.isValid(registrationId) ||
      typeof razorpay_order_id !== "string" ||
      !razorpay_order_id ||
      typeof razorpay_payment_id !== "string" ||
      !razorpay_payment_id ||
      typeof razorpay_signature !== "string" ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing or invalid",
      });
    }

    const registration = await EventRegistration.findById(
      registrationId
    ).select("+razorpaySignature +ticketToken");

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Event registration not found",
      });
    }

    // If already paid, retry the email only if it was not sent.
    if (registration.paymentStatus === "paid") {
      if (registration.razorpayPaymentId !== razorpay_payment_id) {
        return res.status(409).json({
          success: false,
          message:
            "A different payment is already associated with this registration",
        });
      }

      let ticketEmailSent = Boolean(registration.ticketEmailSentAt);

      if (!ticketEmailSent) {
        try {
          await sendEventTicketEmail(registration);
          ticketEmailSent = true;
        } catch (emailError) {
          console.error(
            "Event ticket email retry failed:",
            emailError.message
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        registrationId: registration._id,
        quantity: registration.quantity,
        ticketEmailSent,
        ticketEmailMessage: ticketEmailSent
          ? "Ticket email sent"
          : "Payment is confirmed, but ticket email could not be sent",
      });
    }

    if (registration.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID does not match",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay secret is not configured",
      });
    }

    // Verify Razorpay signature.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature format",
      });
    }

    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(razorpay_signature, "hex");

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
      });
    }

    // Verify the payment directly with Razorpay.
    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    const expectedAmount = Math.round(
      registration.totalAmount * 100
    );

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or amount does not match",
      });
    }

    // One booking gets one secure token for all attendees.
    const ticketToken = crypto.randomBytes(32).toString("hex");

    const updated = await EventRegistration.findOneAndUpdate(
      {
        _id: registration._id,
        paymentStatus: "pending",
        razorpayOrderId: razorpay_order_id,
      },
      {
        $set: {
          paymentStatus: "paid",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          ticketToken,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select("+ticketToken");

    if (!updated) {
      const current = await EventRegistration.findById(
        registration._id
      );

      if (
        current?.paymentStatus === "paid" &&
        current.razorpayPaymentId === razorpay_payment_id
      ) {
        return res.status(200).json({
          success: true,
          message: "Payment already verified",
          registrationId: current._id,
          quantity: current.quantity,
          ticketEmailSent: Boolean(current.ticketEmailSentAt),
        });
      }

      return res.status(409).json({
        success: false,
        message: "Registration changed. Please check payment status.",
      });
    }

    let ticketEmailSent = false;

    // Email failure must not undo a successfully captured payment.
    try {
      await sendEventTicketEmail(updated);
      ticketEmailSent = true;
    } catch (emailError) {
      console.error(
        "Event ticket email failed:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message: ticketEmailSent
        ? "Payment verified and event ticket emailed"
        : "Payment verified, but ticket email could not be sent",
      registrationId: updated._id,
      quantity: updated.quantity,
      ticketEmailSent,
    });
  } catch (error) {
    console.error("Verify Event Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify event payment",
    });
  }
};

// =====================================================
// GET REGISTRATIONS FOR A LOGGED-IN CUSTOMER
// Guest bookings are not listed here.
// =====================================================

const getMyEventRegistrations = async (req, res) => {
  try {
    const registrations = await EventRegistration.find({
      customer: req.user._id,
    })
      .select("-ticketToken -razorpaySignature")
      .populate(
        "event",
        "title poster venue startDate endDate status"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    console.error("Get Event Registrations Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch event registrations",
    });
  }
};

// Verify ticket QR and return attendee entry status
const verifyEventTicket = async (req, res) => {
  try {
    const { token } = req.params;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket QR",
      });
    }

    const registration = await EventRegistration.findOne({
      ticketToken: token,
      paymentStatus: "paid",
    })
      .select("+ticketToken")
      .populate("event", "title venue startDate endDate status");

    if (!registration || !registration.event) {
      return res.status(404).json({
        success: false,
        message: "Valid paid ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      registrationId: registration._id,
      customerName: registration.customerName,
      event: registration.event,
      quantity: registration.quantity,
      attendees: registration.attendees.map((attendee, index) => ({
        index,
        name: attendee.name,
        checkedIn: registration.entryHistory.some(
          (entry) => entry.attendeeIndex === index
        ),
      })),
      checkedInCount: registration.checkedInCount,
    });
  } catch (error) {
    console.error("Verify Event Ticket Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify event ticket",
    });
  }
};

// Check in one attendee
const checkInEventAttendee = async (req, res) => {
  try {
    const { token } = req.params;
    const { attendeeIndex } = req.body || {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      !Number.isInteger(attendeeIndex) ||
      attendeeIndex < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket token or attendee index",
      });
    }

    // The employee identity comes from authenticated middleware.
    const employeeId = req.user?._id;

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required",
      });
    }

    const registration = await EventRegistration.findOne({
      ticketToken: token,
      paymentStatus: "paid",
    }).select("+ticketToken");

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Valid paid ticket not found",
      });
    }

    if (attendeeIndex >= registration.quantity) {
      return res.status(400).json({
        success: false,
        message: "Attendee does not exist",
      });
    }

    // Atomic update prevents two employees checking in the same
    // attendee simultaneously.
    const updated = await EventRegistration.findOneAndUpdate(
      {
        _id: registration._id,
        paymentStatus: "paid",
        "attendees": { $exists: true },
        entryHistory: {
          $not: {
            $elemMatch: { attendeeIndex },
          },
        },
      },
      {
        $push: {
          entryHistory: {
            attendeeIndex,
            enteredAt: new Date(),
            checkedInBy: employeeId,
          },
        },
        $inc: { checkedInCount: 1 },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "This attendee has already checked in",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendee checked in successfully",
      checkedInCount: updated.checkedInCount,
      quantity: updated.quantity,
      attendee: updated.attendees[attendeeIndex],
    });
  } catch (error) {
    console.error("Event Check-in Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check in attendee",
    });
  }
};





module.exports = {
  createEventRegistration,
  verifyEventPayment,
  getMyEventRegistrations,
  verifyEventTicket,
  checkInEventAttendee,
};
