const crypto = require("crypto");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const razorpay = require("../config/razorpay");
const transporter = require("../config/mailer");

const encryptCheckInOtp = (otp) => {
    const key = Buffer.from(
        process.env.CHECKIN_OTP_ENCRYPTION_KEY,
        "hex"
    );

    if (key.length !== 32) {
        throw new Error(
            "CHECKIN_OTP_ENCRYPTION_KEY must be a 32-byte hex key"
        );
    }

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(otp, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex"),
    ].join(":");
};

// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

const createPaymentOrder = async (req, res) => {
    try {
        const { bookingId } = req.body || {};

        // ---------------------------------------------
        // Validate booking ID
        // ---------------------------------------------

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(bookingId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }

        // ---------------------------------------------
        // Find booking
        // ---------------------------------------------

        const booking = await Booking.findById(
            bookingId
        ).populate("room", "roomNumber");

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // ---------------------------------------------
        // Customer can pay only own booking
        // ---------------------------------------------

        if (
            req.user.role === "customer" &&
            booking.user.toString() !==
                req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot make payment for this booking",
            });
        }

        // ---------------------------------------------
        // Already paid
        // ---------------------------------------------

        if (booking.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Booking is already paid",
            });
        }

        // ---------------------------------------------
        // Cancelled booking
        // ---------------------------------------------

        if (
            booking.bookingStatus === "cancelled"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment cannot be made for a cancelled booking",
            });
        }

        // ---------------------------------------------
        // Amount from database
        // ---------------------------------------------

        const amountInPaise = Math.round(
            booking.totalAmount * 100
        );

        if (amountInPaise <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking amount",
            });
        }

        // ---------------------------------------------
        // Create Razorpay order
        // ---------------------------------------------

        const options = {
            amount: amountInPaise,

            currency: "INR",

            receipt: booking.bookingNumber,

            notes: {
                bookingId: booking._id.toString(),
                bookingNumber:
                    booking.bookingNumber,
                roomNumber:
                    booking.room?.roomNumber || "",
            },
        };

        const order =
            await razorpay.orders.create(options);

        // ---------------------------------------------
        // Save Razorpay order ID
        // ---------------------------------------------

        booking.razorpayOrderId = order.id;

        await booking.save();

        return res.status(201).json({
            success: true,

            message:
                "Razorpay order created successfully",

            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },

            booking: {
                id: booking._id,
                bookingNumber:
                    booking.bookingNumber,
                totalAmount:
                    booking.totalAmount,
            },

            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error(
            "Create Payment Order Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create payment order",
        });
    }
};


// =====================================================
// VERIFY RAZORPAY PAYMENT
// =====================================================

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingId,
        } = req.body || {};

        // ---------------------------------------------
        // Validate required fields
        // ---------------------------------------------

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !bookingId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment verification data is incomplete",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                bookingId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }

        // ---------------------------------------------
        // Find booking
        // ---------------------------------------------

        const booking = await Booking.findById(
            bookingId
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // ---------------------------------------------
        // Check booking ownership
        // ---------------------------------------------

        if (
            req.user.role === "customer" &&
            booking.user.toString() !==
                req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot verify payment for this booking",
            });
        }

        // ---------------------------------------------
        // Verify Razorpay order
        // ---------------------------------------------

        if (
            booking.razorpayOrderId &&
            booking.razorpayOrderId !==
                razorpay_order_id
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Razorpay order does not match booking",
            });
        }

        // ---------------------------------------------
        // Generate signature
        // ---------------------------------------------

        const body =
            razorpay_order_id +
            "|" +
            razorpay_payment_id;

        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(body)
                .digest("hex");

        // ---------------------------------------------
        // Compare signatures
        // ---------------------------------------------

        const isSignatureValid =
            crypto.timingSafeEqual(
                Buffer.from(
                    expectedSignature
                ),
                Buffer.from(
                    razorpay_signature
                )
            );

        if (!isSignatureValid) {
            booking.paymentStatus = "failed";

            await booking.save();

            return res.status(400).json({
                success: false,
                message:
                    "Payment signature verification failed",
            });
        }

        // ---------------------------------------------
        // Payment successful
        // ---------------------------------------------

        booking.paymentStatus = "paid";

        booking.bookingStatus = "confirmed";

        booking.paymentMethod = "razorpay";

        booking.razorpayPaymentId =
            razorpay_payment_id;

        booking.razorpaySignature =
            razorpay_signature;

        await booking.save();

        let emailSent = Boolean(booking.confirmationEmailSentAt);

if (!emailSent) {
    try {
        const guestEmail = booking.guestDetails?.email;
        const guestName = booking.guestDetails?.name || "Guest";

        if (!guestEmail) {
            throw new Error("Guest email is missing");
        }

        // Generate a new OTP for this email attempt.
        // Generate 4-digit check-in OTP
const otp = crypto.randomInt(1000, 10000).toString();

booking.checkInOtpHash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

booking.checkInOtpEncrypted = encryptCheckInOtp(otp);

booking.checkInOtpExpiresAt = new Date(
    booking.checkOutDate
);

booking.checkInOtpVerifiedAt = null;

await booking.save();

        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: guestEmail,
            subject: `Booking Confirmed - ${booking.bookingNumber}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
                    <h2 style="color:#198754">Booking Confirmed!</h2>
                    <p>Dear ${guestName},</p>
                    <p>Your payment has been received successfully.</p>

                    <p><strong>Booking Number:</strong>
                        ${booking.bookingNumber}</p>

                    <p><strong>Check-in:</strong>
                        ${new Date(booking.checkInDate).toLocaleDateString("en-IN", { timeZone: "UTC" })}</p>

                    <p><strong>Check-out:</strong>
                        ${new Date(booking.checkOutDate).toLocaleDateString("en-IN", { timeZone: "UTC" })}</p>

                    <p><strong>Amount Paid:</strong>
                        ₹${Number(booking.totalAmount).toFixed(2)}</p>

                    <h3>Your Check-in OTP</h3>
                    <p>Show this OTP to hotel staff when you arrive:</p>

                    <div style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:18px;background:#f5f7fa;text-align:center">
                        ${otp}
                    </div>

                    <p>This OTP Can't Share Anyone. Keep it private and share it only with hotel staff during check-in.</p>
                    <p>Thank you for choosing Maurya Kitchen &amp; Stays.</p>
                </div>
            `,
        });

        booking.confirmationEmailSentAt = new Date();
        await booking.save();

        emailSent = true;

        console.log("Booking confirmation email sent:", guestEmail);
    } catch (emailError) {
        console.error(
            "Booking email failed; payment remains successful:",
            emailError.message
        );
    }
}

return res.status(200).json({
    success: true,
    message: "Payment verified successfully",
    payment: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: "paid",
    },
    booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
    },
    emailSent,
});

        return res.status(200).json({
            success: true,

            message:
                "Payment verified successfully",

            payment: {
                orderId:
                    razorpay_order_id,

                paymentId:
                    razorpay_payment_id,

                status: "paid",
            },

            booking: {
                id: booking._id,

                bookingNumber:
                    booking.bookingNumber,

                bookingStatus:
                    booking.bookingStatus,

                paymentStatus:
                    booking.paymentStatus,

                totalAmount:
                    booking.totalAmount,
            },
        });
    } catch (error) {
        console.error(
            "Verify Payment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify payment",
        });
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    createPaymentOrder,
    verifyPayment,
};