const mongoose = require("mongoose");
const transporter = require("../config/mailer");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const PDFDocument = require("pdfkit");
const crypto = require("crypto");


const decryptCheckInOtp = (encryptedValue) => {
    const key = Buffer.from(
        process.env.CHECKIN_OTP_ENCRYPTION_KEY,
        "hex"
    );

    if (key.length !== 32) {
        throw new Error(
            "CHECKIN_OTP_ENCRYPTION_KEY must be a 32-byte hex key"
        );
    }

    const [ivHex, authTagHex, encryptedHex] =
        encryptedValue.split(":");

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(
        Buffer.from(authTagHex, "hex")
    );

    return Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final(),
    ]).toString("utf8");
};

// =====================================================
// CONSTANTS
// =====================================================

const TAX_RATE = 0.18;

const ACTIVE_BOOKING_STATUSES = [
    "pending",
    "confirmed",
    "checked_in",
];

const VALID_BOOKING_STATUSES = [
    "pending",
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
];


// =====================================================
// HELPER: Generate Booking Number
// =====================================================

const generateBookingNumber = async () => {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    const prefix = `HTL-${year}${month}${day}`;

    const lastBooking =
        await Booking.findOne({
            bookingNumber: {
                $regex: `^${prefix}-`,
            },
        }).sort({
            createdAt: -1,
        });

    let sequence = 1;

    if (lastBooking) {
        const parts =
            lastBooking.bookingNumber.split("-");

        const lastSequence =
            parseInt(parts[2], 10);

        if (!Number.isNaN(lastSequence)) {
            sequence = lastSequence + 1;
        }
    }

    return `${prefix}-${String(sequence).padStart(
        4,
        "0"
    )}`;
};


// =====================================================
// HELPER: Normalize Date
// =====================================================

const normalizeDate = (dateValue) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
};


// =====================================================
// HELPER: Calculate Nights
// =====================================================

const calculateNights = (
    checkInDate,
    checkOutDate
) => {
    const millisecondsPerDay =
        1000 * 60 * 60 * 24;

    return Math.ceil(
        (checkOutDate.getTime() -
            checkInDate.getTime()) /
            millisecondsPerDay
    );
};


// =====================================================
// HELPER: Check Room Availability
// =====================================================

const checkRoomAvailability = async (
    roomId,
    checkInDate,
    checkOutDate,
    excludeBookingId = null
) => {
    const query = {
        room: roomId,

        bookingStatus: {
            $in: ACTIVE_BOOKING_STATUSES,
        },

        // Existing booking starts before
        // requested checkout
        checkInDate: {
            $lt: checkOutDate,
        },

        // Existing booking ends after
        // requested check-in
        checkOutDate: {
            $gt: checkInDate,
        },
    };

    // Useful while updating an existing booking
    if (excludeBookingId) {
        query._id = {
            $ne: excludeBookingId,
        };
    }

    const conflictingBooking =
        await Booking.findOne(query);

    return !conflictingBooking;
};


// =====================================================
// GET AVAILABLE ROOMS
// =====================================================


const getAvailableRooms = async (req, res) => {
    try {
        const {
            checkInDate,
            checkOutDate,
            roomType,
        } = req.query;

        // 1. Validate required dates
        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({
                success: false,
                message:
                    "Check-in and check-out dates are required",
            });
        }

        // 2. Normalize dates
        const checkIn = normalizeDate(checkInDate);
        const checkOut = normalizeDate(checkOutDate);

        if (!checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                message: "Invalid check-in or check-out date",
            });
        }

        // 3. Validate date range
        if (checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message:
                    "Check-out date must be after check-in date",
            });
        }

        // 4. Prevent past check-in dates
        const today = normalizeDate(new Date());

        if (checkIn < today) {
            return res.status(400).json({
                success: false,
                message: "Check-in date cannot be in the past",
            });
        }

        // 5. Build room filter
        // Do not require status === "available" here:
        // availability depends on the requested dates.
        const roomFilter = {
            isActive: true,
            status: {
                $nin: ["maintenance", "cleaning"],
            },
        };

        // 6. Validate optional room type
        if (roomType) {
            if (!mongoose.Types.ObjectId.isValid(roomType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid room type ID",
                });
            }

            roomFilter.roomType = roomType;
        }

        // 7. Fetch rooms and their room types
        const rooms = await Room.find(roomFilter)
            .populate(
                "roomType",
                "name basePrice capacity amenities isActive"
            )
            .sort({
                floor: 1,
                roomNumber: 1,
            });

        // 8. Exclude rooms with inactive or missing room types
        const activeTypeRooms = rooms.filter((room) => {
            return (
                room.roomType &&
                room.roomType.isActive !== false
            );
        });

        // 9. Check booking conflicts for requested dates
        const availableRooms = [];

        for (const room of activeTypeRooms) {
            const isAvailable = await checkRoomAvailability(
                room._id,
                checkIn,
                checkOut
            );

            if (isAvailable) {
                availableRooms.push(room);
            }
        }

        // 10. Return results
        return res.status(200).json({
            success: true,
            count: availableRooms.length,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfNights: calculateNights(
                checkIn,
                checkOut
            ),
            rooms: availableRooms,
        });

    } catch (error) {
        console.error(
            "Get Available Rooms Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to check room availability",
        });
    }
};


// =====================================================
// CREATE BOOKING
// =====================================================


const createBooking = async (req, res) => {
    try {
        const {
            room,
            checkInDate,
            checkOutDate,
            adults,
            children,
            guestDetails,
            specialRequests,
            paymentMethod,
        } = req.body || {};

        // 1. Validate required fields
        if (
            !room ||
            !checkInDate ||
            !checkOutDate ||
            !guestDetails
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Room, dates and guest details are required",
            });
        }

        // 2. Validate room ID
        if (!mongoose.Types.ObjectId.isValid(room)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID",
            });
        }

        // 3. Validate guest details
        if (
            typeof guestDetails.name !== "string" ||
            !guestDetails.name.trim() ||
            typeof guestDetails.email !== "string" ||
            !guestDetails.email.trim() ||
            typeof guestDetails.phone !== "string" ||
            !guestDetails.phone.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Guest name, email and phone are required",
            });
        }

        // 4. Validate guest counts
        const adultCount =
            adults === undefined ? 1 : Number(adults);

        const childCount =
            children === undefined ? 0 : Number(children);

        if (
            !Number.isInteger(adultCount) ||
            adultCount < 1 ||
            !Number.isInteger(childCount) ||
            childCount < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Adults must be at least 1 and children cannot be negative",
            });
        }

        // 5. Normalize and validate dates
       
const parseDateOnly = (value) => {
    if (typeof value !== "string") return null;

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
};

const checkIn = parseDateOnly(checkInDate);
const checkOut = parseDateOnly(checkOutDate);

if (!checkIn || !checkOut) {
    return res.status(400).json({
        success: false,
        message: "Invalid check-in or check-out date",
    });
}

if (checkOut <= checkIn) {
    return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date",
    });
}

// Today's date according to India (IST).
const now = new Date();
const indiaNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);

const today = new Date(Date.UTC(
    indiaNow.getFullYear(),
    indiaNow.getMonth(),
    indiaNow.getDate()
));

if (checkIn < today) {
    return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past",
    });
}


        // 6. Calculate number of nights
        const numberOfNights = calculateNights(
            checkIn,
            checkOut
        );

        if (
            !Number.isInteger(numberOfNights) ||
            numberOfNights < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking must be at least one night",
            });
        }

        // 7. Fetch room and populate its type
        const roomData = await Room.findById(room)
            .populate(
                "roomType",
                "name basePrice capacity amenities isActive"
            );

        if (!roomData) {
            return res.status(404).json({
                success: false,
                message: "Room not found",
            });
        }

        // 8. Check room active status
        if (!roomData.isActive) {
            return res.status(400).json({
                success: false,
                message: "This room is currently inactive",
            });
        }

        // 9. Check room type
        if (!roomData.roomType) {
            return res.status(400).json({
                success: false,
                message: "Room type not found",
            });
        }

        if (roomData.roomType.isActive === false) {
            return res.status(400).json({
                success: false,
                message:
                    "This room type is currently inactive",
            });
        }

        // 10. Block rooms under maintenance or cleaning
        if (
            roomData.status === "maintenance" ||
            roomData.status === "cleaning"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This room is currently unavailable",
            });
        }

        // 11. Validate guest capacity
        const totalGuests = adultCount + childCount;
        const roomCapacity = Number(
            roomData.roomType.capacity
        );

        if (
            !Number.isFinite(roomCapacity) ||
            roomCapacity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Room capacity is not configured correctly",
            });
        }

        if (totalGuests > roomCapacity) {
            return res.status(400).json({
                success: false,
                message:
                    `Room capacity is ${roomCapacity} guests`,
            });
        }

        // 12. Check availability for requested dates
        const isAvailable = await checkRoomAvailability(
            roomData._id,
            checkIn,
            checkOut
        );

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message:
                    "Room is already booked for the selected dates",
            });
        }

        // 13. Calculate price on the server
        const pricePerNight = Number(
            roomData.price || roomData.roomType.basePrice
        );

        if (
            !Number.isFinite(pricePerNight) ||
            pricePerNight <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Room price is not configured correctly",
            });
        }

        const roomCharges =
            pricePerNight * numberOfNights;

        const taxAmount =
            Math.round(
                roomCharges * TAX_RATE * 100
            ) / 100;

        const discountAmount = 0;

        const totalAmount =
            roomCharges +
            taxAmount -
            discountAmount;

        if (!Number.isFinite(totalAmount)) {
            return res.status(400).json({
                success: false,
                message: "Unable to calculate booking amount",
            });
        }

        // 14. Generate booking number
        const bookingNumber = await generateBookingNumber();

        // 15. Create booking
        const booking = await Booking.create({
            user: req.user._id,
            room: roomData._id,
            bookingNumber,

            checkInDate: checkIn,
            checkOutDate: checkOut,

            adults: adultCount,
            children: childCount,

            guestDetails: {
                name: guestDetails.name.trim(),
                email: guestDetails.email
                    .trim()
                    .toLowerCase(),
                phone: guestDetails.phone.trim(),
                address: guestDetails.address || "",
                idProofType:
                    guestDetails.idProofType || "Aadhar",
                idProofNumber:
                    guestDetails.idProofNumber || "",
            },

            pricePerNight,
            numberOfNights,
            roomCharges,
            taxAmount,
            discountAmount,
            totalAmount,

            bookingStatus: "pending",
            paymentStatus: "pending",

            paymentMethod:
                paymentMethod || "razorpay",

            specialRequests:
                typeof specialRequests === "string"
                    ? specialRequests.trim()
                    : "",
        });

        // 16. Return populated booking
        const populatedBooking = await Booking.findById(
            booking._id
        )
            .populate(
                "room",
                "roomNumber floor price status"
            )
            .populate(
                "user",
                "name email phone"
            );


        // 17. Send booking confirmation email with feedback QR code
        try {
            const guestEmail = populatedBooking.guestDetails?.email;
            const guestName = populatedBooking.guestDetails?.name || "Guest";

            // Set FRONTEND_URL in backend .env for your actual website
            const frontendUrl = (
                process.env.CLIENT_URL || "http://localhost:5173"
            ).replace(/\/$/, "");

            const feedbackUrl =
                `${frontendUrl}/feedback?booking=${encodeURIComponent(
                    populatedBooking._id.toString()
                )}`;

            // Generate QR code as a PNG buffer
            const feedbackQrBuffer = await QRCode.toBuffer(
                feedbackUrl,
                {
                    type: "png",
                    width: 250,
                    margin: 2,
                }
            );

            if (guestEmail) {
                await transporter.sendMail({
                    to: guestEmail,
                    subject: `Booking Confirmation - ${populatedBooking.bookingNumber}`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;">
                            <h2 style="color:#198754;">Booking Confirmation</h2>

                            <p>Dear ${guestName},</p>

                            <p>Thank you for choosing our hotel.
                            Your room booking has been created successfully.</p>

                            <div style="background:#f5f7fa;padding:18px;border-radius:8px;">
                                <h3>Booking Details</h3>
                                <p><strong>Booking Number:</strong>
                                    ${populatedBooking.bookingNumber}</p>
                                <p><strong>Room:</strong>
                                    ${populatedBooking.room?.roomNumber || "Assigned room"}</p>
                                <p><strong>Check-in:</strong>
                                    ${new Date(populatedBooking.checkInDate).toLocaleDateString("en-IN")}</p>
                                <p><strong>Check-out:</strong>
                                    ${new Date(populatedBooking.checkOutDate).toLocaleDateString("en-IN")}</p>
                                <p><strong>Number of nights:</strong>
                                    ${populatedBooking.numberOfNights}</p>
                                <p><strong>Guests:</strong>
                                    ${populatedBooking.adults} adults,
                                    ${populatedBooking.children} children</p>
                                <p><strong>Total Amount:</strong>
                                    ₹${Number(populatedBooking.totalAmount).toFixed(2)}</p>
                                <p><strong>Booking Status:</strong>
                                    ${populatedBooking.bookingStatus}</p>
                                <p><strong>Payment Status:</strong>
                                    ${populatedBooking.paymentStatus}</p>
                            </div>

                            
<h3 style="margin-top:25px;">We'd love your feedback!</h3>

<p>
    Thank you for choosing our hotel. Your feedback helps us
    improve our service. Please take a moment to share your
    experience on Google.
</p>

<div style="text-align:center;margin:20px 0;">

    <img
        src="cid:feedback-qrcode"
        alt="Scan to give feedback"
        width="200"
        height="200"
        style="display:block;margin:auto;"
    />

    <p>
        <a
            href="https://g.page/r/CX_ejWvskV-3EBM/review"
            style="display:inline-block;background:#198754;color:#ffffff;padding:12px 22px;text-decoration:none;border-radius:5px;font-weight:bold;"
        >
            ⭐ Share Your Feedback on Google
        </a>
    </p>

    <p style="font-size:13px;color:#666;">
        You can also scan the QR code to open the feedback form.
    </p>

</div>

                    `,
                    attachments: [
                        {
                            filename: "feedback-qr.png",
                            content: feedbackQrBuffer,
                            contentType: "image/png",
                            cid: "feedback-qrcode",
                        },
                    ],
                });

                console.log(
                    "Booking confirmation and feedback QR email sent to:",
                    guestEmail
                );
            } else {
                console.warn(
                    "Booking created, but guest email is missing:",
                    populatedBooking._id
                );
            }
        } catch (emailError) {
            // Email failure must not undo a successful booking
            console.error(
                "Booking confirmation email failed:",
                emailError.message
            );
        }

        // Keep your existing success response below this code
        return res.status(201).json({
            success: true,
            message: "Room booking created successfully",
            booking: populatedBooking,
        });

    } catch (error) {
        console.error(
            "Create Booking Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to create booking",
        });
    }
};


const adminCreateBooking = async (req, res) => {
    try {
        const {
            room,
            checkInDate,
            checkOutDate,
            adults,
            children,
            guestDetails,
            paymentMethod,
            paymentReceived,
            specialRequests,
        } = req.body || {};

        // Only Cash and UPI are allowed here.
        if (!["cash", "upi"].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be cash or upi",
            });
        }

        if (
            !room ||
            !checkInDate ||
            !checkOutDate ||
            !guestDetails
        ) {
            return res.status(400).json({
                success: false,
                message: "Room, dates and guest details are required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(room)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID",
            });
        }

        if (
            typeof guestDetails.name !== "string" ||
            !guestDetails.name.trim() ||
            typeof guestDetails.email !== "string" ||
            !guestDetails.email.trim() ||
            typeof guestDetails.phone !== "string" ||
            !guestDetails.phone.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Guest name, email and phone are required",
            });
        }

        const adultCount = Number(adults ?? 1);
        const childCount = Number(children ?? 0);

        if (
            !Number.isInteger(adultCount) ||
            adultCount < 1 ||
            !Number.isInteger(childCount) ||
            childCount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid number of adults or children",
            });
        }

        const parseDateOnly = (value) => {
    if (typeof value !== "string") return null;

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day))
    );

    if (
        date.getUTCFullYear() !== Number(year) ||
        date.getUTCMonth() !== Number(month) - 1 ||
        date.getUTCDate() !== Number(day)
    ) {
        return null;
    }

    return date;
};

const checkIn = parseDateOnly(checkInDate);
const checkOut = parseDateOnly(checkOutDate);

const now = new Date();
const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
);

        if (!checkIn || !checkOut || checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid check-in and check-out dates",
            });
        }

        if (checkIn < today) {
            return res.status(400).json({
                success: false,
                message: "Check-in date cannot be in the past",
            });
        }

        const numberOfNights = calculateNights(checkIn, checkOut);

        if (numberOfNights < 1) {
            return res.status(400).json({
                success: false,
                message: "Booking must be at least one night",
            });
        }

        const roomData = await Room.findById(room).populate(
            "roomType",
            "name basePrice capacity isActive"
        );

        if (!roomData || !roomData.isActive) {
            return res.status(404).json({
                success: false,
                message: "Active room not found",
            });
        }

        if (
            !roomData.roomType ||
            roomData.roomType.isActive === false
        ) {
            return res.status(400).json({
                success: false,
                message: "Room type is inactive or unavailable",
            });
        }

        if (["maintenance", "cleaning"].includes(roomData.status)) {
            return res.status(400).json({
                success: false,
                message: "Room is under maintenance or cleaning",
            });
        }

        if (adultCount + childCount > Number(roomData.roomType.capacity)) {
            return res.status(400).json({
                success: false,
                message: `Room capacity is ${roomData.roomType.capacity} guests`,
            });
        }

        const available = await checkRoomAvailability(
            roomData._id,
            checkIn,
            checkOut
        );

        if (!available) {
            return res.status(409).json({
                success: false,
                message: "Room is already booked for these dates",
            });
        }

        const pricePerNight = Number(
            roomData.price || roomData.roomType.basePrice
        );

        if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
            return res.status(400).json({
                success: false,
                message: "Room price is not configured correctly",
            });
        }

        const roomCharges = pricePerNight * numberOfNights;
        const taxAmount = Math.round(roomCharges * TAX_RATE * 100) / 100;
        const discountAmount = 0;
        const totalAmount = roomCharges + taxAmount - discountAmount;

        const booking = await Booking.create({
            // Walk-in booking: no customer account is required.
            user: undefined,
            createdBy: req.user._id,

            room: roomData._id,
            bookingNumber: await generateBookingNumber(),
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults: adultCount,
            children: childCount,

            guestDetails: {
                name: guestDetails.name.trim(),
                email: guestDetails.email.trim().toLowerCase(),
                phone: guestDetails.phone.trim(),
                address: guestDetails.address || "",
                idProofType: guestDetails.idProofType || "Aadhar",
                idProofNumber: guestDetails.idProofNumber || "",
            },

            pricePerNight,
            numberOfNights,
            roomCharges,
            taxAmount,
            discountAmount,
            totalAmount,

            bookingStatus: "confirmed",
            paymentMethod,
            paymentStatus: paymentReceived ? "paid" : "pending",

            specialRequests:
                typeof specialRequests === "string"
                    ? specialRequests.trim()
                    : "",
        });

        const populatedBooking = await Booking.findById(booking._id)
            .populate("room", "roomNumber floor price status")
            .populate("createdBy", "name email");

        return res.status(201).json({
            success: true,
            message: "Admin room booking created successfully",
            booking: populatedBooking,
        });
    } catch (error) {
        console.error("Admin Create Booking Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create admin booking",
        });
    }
};

// =====================================================
// GET MY BOOKINGS
// =====================================================

const getMyBookings = async (
    req,
    res
) => {
    try {
        const {
            status,
        } = req.query;

        const filter = {
            user: req.user._id,
        };

        if (status) {
            if (
                !VALID_BOOKING_STATUSES.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid booking status",
                });
            }

            filter.bookingStatus = status;
        }

        const bookings = await Booking.find(filter)
  .select("+checkInOtpEncrypted")
  .populate("room", "roomNumber floor price status")
  .sort({ createdAt: -1 });

  const now = new Date();

const bookingsWithOtp = bookings.map((booking) => {
    const data = booking.toObject();

    const canShowOtp =
        data.paymentStatus === "paid" &&
        !["checked_out", "cancelled"].includes(
            data.bookingStatus
        ) &&
        data.checkInOtpEncrypted &&
        data.checkInOtpExpiresAt &&
        now < new Date(data.checkInOtpExpiresAt);

    if (canShowOtp) {
        try {
            data.checkInOtp = decryptCheckInOtp(
                data.checkInOtpEncrypted
            );
        } catch (error) {
            console.error(
                "Check-in OTP decryption failed:",
                error.message
            );

            data.checkInOtp = null;
        }
    } else {
        data.checkInOtp = null;
    }

    delete data.checkInOtpEncrypted;
    delete data.checkInOtpHash;

    return data;
});
        return res.status(200).json({
    success: true,
    count: bookingsWithOtp.length,
    bookings: bookingsWithOtp,
});

    } catch (error) {
        console.error(
            "Get My Bookings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch bookings",
        });
    }
};


// =====================================================
// GET SINGLE BOOKING
// =====================================================

const getBookingById = async (
    req,
    res
) => {
    try {
        const bookingId =
            req.params.id;

        if (
            !mongoose.Types.ObjectId.isValid(
                bookingId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking ID",
            });
        }

        const booking =
            await Booking.findById(
                bookingId
            )
                .populate(
                    "room",
                    "roomNumber floor price status"
                )
                .populate(
                    "user",
                    "name email phone"
                );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found",
            });
        }

        // Customer can only access own booking
        if (
            req.user.role === "customer" &&
            booking.user._id.toString() !==
                req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to access this booking",
            });
        }

        return res.status(200).json({
            success: true,
            booking,
        });

    } catch (error) {
        console.error(
            "Get Booking Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch booking",
        });
    }
};


// =====================================================
// VERIFY CHECK-IN OTP + CHECK IN GUEST
// PATCH /api/bookings/:id/check-in
// =====================================================

const checkInBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;

        // ---------------------------------------------
        // Validate booking ID
        // ---------------------------------------------
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }

        // ---------------------------------------------
        // Validate OTP
        // ---------------------------------------------
        if (!otp || !/^\d{4}$/.test(String(otp))) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 4-digit OTP",
            });
        }

        // checkInOtpHash may have select:false in schema
        const booking = await Booking.findById(id)
            .select("+checkInOtpHash +checkInOtpEncrypted")
            .populate("room", "roomNumber floor price status");

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // ---------------------------------------------
        // Check booking status
        // ---------------------------------------------
        if (booking.bookingStatus === "checked_in") {
            return res.status(400).json({
                success: false,
                message: "Guest is already checked in",
            });
        }

        if (booking.bookingStatus === "checked_out") {
            return res.status(400).json({
                success: false,
                message: "This booking is already checked out",
            });
        }

        if (booking.bookingStatus === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cancelled booking cannot be checked in",
            });
        }

        if (booking.bookingStatus !== "confirmed") {
            return res.status(400).json({
                success: false,
                message: "Only confirmed bookings can be checked in",
            });
        }

        // ---------------------------------------------
        // Payment must be completed
        // ---------------------------------------------
        if (booking.paymentStatus !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment must be completed before check-in",
            });
        }

        // ---------------------------------------------
        // OTP must exist
        // ---------------------------------------------
        if (!booking.checkInOtpHash) {
            return res.status(400).json({
                success: false,
                message: "Check-in OTP is not available for this booking",
            });
        }

        // ---------------------------------------------
        // Check OTP expiry
        // ---------------------------------------------
        if (
            !booking.checkInOtpExpiresAt ||
            new Date() > new Date(booking.checkInOtpExpiresAt)
        ) {
            return res.status(400).json({
                success: false,
                message: "Check-in OTP has expired",
            });
        }

        // ---------------------------------------------
        // Hash entered OTP
        // ---------------------------------------------
        const enteredOtpHash = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        // ---------------------------------------------
        // Verify OTP securely
        // ---------------------------------------------
        const storedHash = Buffer.from(
            booking.checkInOtpHash,
            "hex"
        );

        const enteredHash = Buffer.from(
            enteredOtpHash,
            "hex"
        );

        const otpValid =
            storedHash.length === enteredHash.length &&
            crypto.timingSafeEqual(storedHash, enteredHash);

        if (!otpValid) {
            return res.status(400).json({
                success: false,
                message: "Incorrect check-in OTP",
            });
        }

        // ---------------------------------------------
        // OTP correct -> Check in guest
        // ---------------------------------------------
        booking.bookingStatus = "checked_in";
        booking.checkInOtpVerifiedAt = new Date();

        await booking.save();

        // ---------------------------------------------
        // Send check-in confirmation email
        // ---------------------------------------------
        let emailSent = false;

        try {
            const guestEmail = booking.guestDetails?.email;
            const guestName =
                booking.guestDetails?.name || "Guest";

            if (guestEmail) {
                await transporter.sendMail({
                    from: process.env.MAIL_FROM,
                    to: guestEmail,
                    subject: `Check-in Successful - ${booking.bookingNumber}`,
                    html: `
                        <div style="
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: auto;
                            color: #333;
                        ">

                            <h2 style="color:#198754;">
                                Check-in Successful!
                            </h2>

                            <p>Dear ${guestName},</p>

                            <p>
                                Your check-in has been completed successfully.
                            </p>

                            <p>
                                <strong>Booking Number:</strong>
                                ${booking.bookingNumber}
                            </p>

                            <p>
                                <strong>Room:</strong>
                                ${booking.room?.roomNumber || "Assigned Room"}
                            </p>

                            <p>
                                <strong>Check-in:</strong>
                                ${new Date(
                                    booking.checkInDate
                                ).toLocaleDateString("en-IN", {
                                    timeZone: "UTC",
                                })}
                            </p>

                            <p>
                                <strong>Check-out:</strong>
                                ${new Date(
                                    booking.checkOutDate
                                ).toLocaleDateString("en-IN", {
                                    timeZone: "UTC",
                                })}
                            </p>

                            <p>
                                <strong>Status:</strong>
                                Checked In
                            </p>

                            <p>
                                We hope you have a comfortable stay.
                            </p>

                            <p>
                                Thank you for choosing
                                Maurya Kitchen & Stays.
                            </p>

                        </div>
                    `,
                });

                emailSent = true;

                console.log(
                    "Check-in confirmation email sent:",
                    guestEmail
                );
            }
        } catch (emailError) {
            // IMPORTANT:
            // Email failure should NOT undo successful check-in.
            console.error(
                "Check-in email failed:",
                emailError.message
            );
        }

        return res.status(200).json({
            success: true,
            message: emailSent
                ? "Guest checked in successfully. Confirmation email sent."
                : "Guest checked in successfully.",

            booking: {
                id: booking._id,
                bookingNumber: booking.bookingNumber,
                bookingStatus: booking.bookingStatus,
                checkInOtpVerifiedAt:
                    booking.checkInOtpVerifiedAt,
            },

            emailSent,
        });

    } catch (error) {
        console.error(
            "Check In Booking Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to check in guest",
        });
    }
};

// =====================================================
// CANCEL BOOKING
// =====================================================

const cancelBooking = async (
    req,
    res
) => {
    try {
        const {
            cancellationReason,
        } = req.body || {};

        const bookingId =
            req.params.id;

        if (
            !mongoose.Types.ObjectId.isValid(
                bookingId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking ID",
            });
        }

        const booking =
            await Booking.findById(
                bookingId
            );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found",
            });
        }

        // Customer can cancel only own booking
        if (
            req.user.role === "customer" &&
            booking.user.toString() !==
                req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot cancel this booking",
            });
        }

        // Already cancelled
        if (
            booking.bookingStatus ===
            "cancelled"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking is already cancelled",
            });
        }

        // Already checked out
        if (
            booking.bookingStatus ===
            "checked_out"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Completed bookings cannot be cancelled",
            });
        }

        // Checked in cannot be cancelled
        if (
            booking.bookingStatus ===
            "checked_in"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Checked-in booking cannot be cancelled",
            });
        }

        booking.bookingStatus =
            "cancelled";

        booking.cancellationReason =
            cancellationReason || "";

        booking.cancelledAt =
            new Date();

        // If payment was made
        // mark it as refundable
        if (
            booking.paymentStatus ===
            "paid"
        ) {
            booking.paymentStatus =
                "refunded";
        }

        await booking.save();

        return res.status(200).json({
            success: true,

            message:
                "Booking cancelled successfully",

            booking,
        });

    } catch (error) {
        console.error(
            "Cancel Booking Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to cancel booking",
        });
    }
};


// =====================================================
// ADMIN: GET ALL BOOKINGS
// =====================================================

const getAllBookings = async (req, res) => {
    try {
        const {
            status,
            paymentStatus,
            date,
            startDate,
            endDate,
            search,
        } = req.query;

        const filter = {};

        if (status) {
            if (!VALID_BOOKING_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking status",
                });
            }

            filter.bookingStatus = status;
        }

        const validPaymentStatuses = [
            "pending",
            "paid",
            "partially_paid",
            "refunded",
            "failed",
        ];

        if (paymentStatus) {
            if (!validPaymentStatuses.includes(paymentStatus)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment status",
                });
            }

            filter.paymentStatus = paymentStatus;
        }

        // Legacy single check-in date filter
        if (date) {
            const selectedDate = normalizeDate(date);

            if (!selectedDate) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date",
                });
            }

            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);

            filter.checkInDate = {
                $gte: selectedDate,
                $lt: nextDate,
            };
        } else if (startDate || endDate) {
            const range = {};

            if (startDate) {
                const start = normalizeDate(startDate);

                if (!start) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid start date",
                    });
                }

                range.$gte = start;
            }

            if (endDate) {
                const end = normalizeDate(endDate);

                if (!end) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid end date",
                    });
                }

                end.setDate(end.getDate() + 1);
                range.$lt = end;
            }

            if (
                range.$gte &&
                range.$lt &&
                range.$gte >= range.$lt
            ) {
                return res.status(400).json({
                    success: false,
                    message: "End date must be on or after start date",
                });
            }

            filter.checkInDate = range;
        }

        // Escape regex special characters before searching
        if (typeof search === "string" && search.trim()) {
            const safeSearch = search.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const regex = new RegExp(safeSearch, "i");

            filter.$or = [
                { bookingNumber: regex },
                { "guestDetails.name": regex },
                { "guestDetails.email": regex },
                { "guestDetails.phone": regex },
            ];
        }

        const bookings = await Booking.find(filter)
            .populate("user", "name email phone")
            .populate("createdBy", "name email")
            .populate("room", "roomNumber floor price status")
            .sort({ createdAt: -1 })
            .limit(500);

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings,
        });
    } catch (error) {
        console.error("Get All Bookings Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch bookings",
        });
    }
};


const downloadBookingInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }

        const booking = await Booking.findById(id)
            .populate("room", "roomNumber floor price")
            .populate("user", "name email phone");

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // This endpoint is for admins only, but retain a defensive check.
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }

        const money = (amount) =>
            `INR ${Number(amount || 0).toFixed(2)}`;

        const formatDate = (value) =>
            value
                ? new Date(value).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                  })
                : "-";

        const guest = booking.guestDetails || {};

        const doc = new PDFDocument({
            size: "A4",
            margin: 50,
            info: {
                Title: `Invoice ${booking.bookingNumber}`,
                Author: "Hotel Management",
            },
        });

        const filename = `Invoice-${String(
            booking.bookingNumber || booking._id
        ).replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        doc.on("error", (error) => {
            console.error("Invoice PDF Error:", error);

            if (!res.headersSent) {
                res.status(500).end();
            } else {
                res.destroy(error);
            }
        });

        doc.pipe(res);

        doc.fontSize(22).text("HOTEL INVOICE", {
            align: "center",
        });

        doc.moveDown();
        doc.fontSize(11).text("Hotel & Restaurant Management");
        doc.text(`Invoice / Booking No: ${booking.bookingNumber}`);
        doc.text(`Invoice Date: ${formatDate(new Date())}`);
        doc.moveDown();

        doc.fontSize(14).text("Guest Details");
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Name: ${guest.name || booking.user?.name || "-"}`);
        doc.text(`Email: ${guest.email || booking.user?.email || "-"}`);
        doc.text(`Phone: ${guest.phone || booking.user?.phone || "-"}`);
        doc.text(`Address: ${guest.address || "-"}`);
        doc.text(`ID Proof Type: ${guest.idProofType || "-"}`);
        // Do not print the full ID number on a general invoice.
        doc.moveDown();

        doc.fontSize(14).text("Stay Details");
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Room: ${booking.room?.roomNumber || "-"}`);
        doc.text(`Floor: ${booking.room?.floor ?? "-"}`);
        doc.text(`Check-in: ${formatDate(booking.checkInDate)}`);
        doc.text(`Check-out: ${formatDate(booking.checkOutDate)}`);
        doc.text(`Guests: ${booking.adults} adult(s), ${booking.children} child(ren)`);
        doc.text(`Number of nights: ${booking.numberOfNights}`);
        doc.moveDown();

        doc.fontSize(14).text("Charges");
        doc.moveDown(0.5);

        const left = 50;
        const right = 500;
        const line = (label, amount, bold = false) => {
            if (bold) doc.font("Helvetica-Bold");
            else doc.font("Helvetica");

            doc.text(label, left, doc.y, {
                continued: false,
                width: 300,
            });

            const currentY = doc.y;
            doc.text(money(amount), right - 100, currentY - 12, {
                width: 100,
                align: "right",
            });

            doc.moveDown(0.4);
        };

        line(
            `Room charges (${booking.numberOfNights} night(s))`,
            booking.roomCharges
        );
        line("Tax", booking.taxAmount);
        line("Discount", -Number(booking.discountAmount || 0));
        doc.moveDown(0.3);
        line("Total Amount", booking.totalAmount, true);

        doc.moveDown();
        doc.font("Helvetica").fontSize(10);
        doc.text(`Booking Status: ${booking.bookingStatus}`);
        doc.text(`Payment Method: ${booking.paymentMethod || "-"}`);
        doc.text(`Payment Status: ${booking.paymentStatus}`);
        doc.moveDown(2);

        doc.fontSize(10).text(
            "Thank you for choosing our hotel.",
            { align: "center" }
        );

        doc.end();
    } catch (error) {
        console.error("Download Booking Invoice Error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Unable to generate invoice",
            });
        }

        res.end();
    }
};

// =====================================================
// ADMIN: UPDATE BOOKING STATUS
// =====================================================

const updateBookingStatus = async (
    req,
    res
) => {
    try {
        const {
            status,
        } = req.body || {};

        const bookingId =
            req.params.id;

        if (
            !mongoose.Types.ObjectId.isValid(
                bookingId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking ID",
            });
        }

        if (
            !VALID_BOOKING_STATUSES.includes(
                status
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking status",
            });
        }

        const booking =
            await Booking.findById(
                bookingId
            );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found",
            });
        }

        // ---------------------------------------------
        // Prevent changing cancelled booking
        // ---------------------------------------------

        if (
            booking.bookingStatus ===
                "cancelled" &&
            status !== "cancelled"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cancelled booking cannot be changed",
            });
        }

        // ---------------------------------------------
        // Prevent changing completed booking
        // ---------------------------------------------

        if (
            booking.bookingStatus ===
                "checked_out" &&
            status !== "checked_out"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Completed booking cannot be changed",
            });
        }

        // ---------------------------------------------
        // Update status
        // ---------------------------------------------

        booking.bookingStatus =
            status;

        await booking.save();

        // ---------------------------------------------
        // Update room status
        // ---------------------------------------------

        const room =
            await Room.findById(
                booking.room
            );

        if (room) {
            if (
                status ===
                "checked_in"
            ) {
                room.status =
                    "occupied";
            }

            if (
                status ===
                "checked_out"
            ) {
                room.status =
                    "cleaning";
            }

            if (
                status ===
                "cancelled"
            ) {
                room.status =
                    "available";
            }

            if (
                status ===
                "confirmed"
            ) {
                room.status =
                    "reserved";
            }

            await room.save();
        }

        const updatedBooking =
            await Booking.findById(
                booking._id
            )
                .populate(
                    "user",
                    "name email phone"
                )
                .populate(
                    "room",
                    "roomNumber floor price status"
                );

        return res.status(200).json({
            success: true,

            message:
                "Booking status updated successfully",

            booking:
                updatedBooking,
        });

    } catch (error) {
        console.error(
            "Update Booking Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update booking status",
        });
    }
};


const updateBookingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }

        if (!["cash", "upi"].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be cash or upi",
            });
        }

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (booking.bookingStatus === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cancelled booking cannot be paid",
            });
        }

        if (booking.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Booking is already paid",
            });
        }

        // Save payment first.
        booking.paymentStatus = "paid";
        booking.paymentMethod = paymentMethod;
        await booking.save();

        const guest = booking.guestDetails || {};
        const room = await Room.findById(booking.room);

        let emailSent = false;

        if (guest.email) {
            try {
                await transporter.sendMail({
                    to: guest.email,
                    subject: `Payment Receipt - ${booking.bookingNumber}`,
                    text: [
                        `Dear ${guest.name || "Guest"},`,
                        "",
                        "Your room booking payment has been recorded successfully.",
                        "",
                        `Booking Number: ${booking.bookingNumber}`,
                        `Room: ${room?.roomNumber || "—"}`,
                        `Check-in: ${new Date(booking.checkInDate).toLocaleDateString("en-IN")}`,
                        `Check-out: ${new Date(booking.checkOutDate).toLocaleDateString("en-IN")}`,
                        `Total Amount: INR ${Number(booking.totalAmount || 0).toFixed(2)}`,
                        `Payment Method: ${paymentMethod.toUpperCase()}`,
                        "Payment Status: PAID",
                        "",
                        "Thank you for choosing our hotel.",
                    ].join("\n"),
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222">
                            <h2 style="color:#15803d">Payment Successful</h2>
                            <p>Dear ${String(guest.name || "Guest").replace(/[&<>"']/g, "")},</p>
                            <p>Your room booking payment has been recorded successfully.</p>
                            <hr/>
                            <p><b>Booking Number:</b> ${String(booking.bookingNumber || "").replace(/[&<>"']/g, "")}</p>
                            <p><b>Room:</b> ${String(room?.roomNumber || "—").replace(/[&<>"']/g, "")}</p>
                            <p><b>Check-in:</b> ${new Date(booking.checkInDate).toLocaleDateString("en-IN")}</p>
                            <p><b>Check-out:</b> ${new Date(booking.checkOutDate).toLocaleDateString("en-IN")}</p>
                            <p><b>Total Amount:</b> ₹${Number(booking.totalAmount || 0).toFixed(2)}</p>
                            <p><b>Payment Method:</b> ${paymentMethod.toUpperCase()}</p>
                            <p><b>Payment Status:</b> PAID</p>
                            <hr/>
                            <p>Thank you for choosing our hotel.</p>
                        </div>
                    `,
                });

                emailSent = true;
            } catch (mailError) {
                // Payment is already saved; don't undo it if email fails.
                console.error("Booking payment email error:", mailError);
            }
        }

        const updatedBooking = await Booking.findById(id)
            .populate("user", "name email phone")
            .populate("createdBy", "name email")
            .populate("room", "roomNumber floor price status");

        return res.status(200).json({
            success: true,
            message: emailSent
                ? "Payment updated and confirmation email sent"
                : "Payment updated, but confirmation email could not be sent",
            emailSent,
            booking: updatedBooking,
        });
    } catch (error) {
        console.error("Update Booking Payment Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update payment",
        });
    }
};



// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    getAvailableRooms,
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    getAllBookings,
    updateBookingStatus,
    adminCreateBooking,
    downloadBookingInvoice,
    updateBookingPayment,
    checkInBooking,
};