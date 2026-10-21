
const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const RestaurantOrder = require("../models/RestaurantOrder");
const User = require("../models/User");
const transporter = require("../config/mailer");
const generateRestaurantInvoice = require("../utils/generateRestaurantInvoice");

// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

const createRestaurantPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body || {};

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant order ID",
      });
    }

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: "Razorpay configuration is missing",
      });
    }

    const order = await RestaurantOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Restaurant order not found",
      });
    }

    const isOwner =
      order.customer &&
      order.customer.toString() === req.user._id.toString();

    const isStaff = ["admin", "manager"].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to pay for this order",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "This order is already paid",
      });
    }

    if (["cancelled", "canceled"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be made for a cancelled order",
      });
    }

    const amount = Math.round(Number(order.totalAmount) * 100);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant order amount",
      });
    }

    // Reuse the saved Razorpay order when available.
    if (order.razorpayOrderId) {
      return res.status(200).json({
        success: true,
        message: "Existing Razorpay order retrieved",
        key: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: order.razorpayOrderId,
        amount,
        currency: "INR",
      });
    }

    const paymentOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rest_${order._id.toString().slice(-20)}`,
      notes: {
        restaurantOrderId: order._id.toString(),
      },
    });

    order.razorpayOrderId = paymentOrder.id;
    order.paymentMethod = "razorpay";

    await order.save();

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
    });
  } catch (error) {
    console.error("Create restaurant payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};

// =====================================================
// VERIFY RAZORPAY PAYMENT
// =====================================================

const verifyRestaurantPayment = async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      !orderId ||
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing or invalid",
      });
    }

    const order = await RestaurantOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Restaurant order not found",
      });
    }

    const isOwner =
      order.customer &&
      order.customer.toString() === req.user._id.toString();

    const isStaff = ["admin", "manager"].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "You cannot verify payment for this order",
      });
    }

    // Make sure the payment belongs to this order.
    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID does not match",
      });
    }

    // Idempotent response for a previously verified payment.
    if (order.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment is already verified",
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
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

    // Verify payment status and amount directly with Razorpay.
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const expectedAmount = Math.round(Number(order.totalAmount) * 100);

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or the amount does not match",
      });
    }

    // Save successful payment.
    order.paymentStatus = "paid";
    order.paymentMethod = "razorpay";
    order.razorpayPaymentId = razorpay_payment_id;
    order.paymentVerifiedAt = new Date();

    if (!order.invoiceNumber) {
      order.invoiceNumber =
        `INV-${Date.now()}-${order._id.toString().slice(-6).toUpperCase()}`;
    }

    if (order.orderStatus === "pending") {
      order.orderStatus = "confirmed";
    }

    await order.save();

    // Payment is already saved. Email errors must not mark it as unpaid.
    try {
      const customer = order.customer
        ? await User.findById(order.customer).select("name email phone")
        : null;

      if (!customer?.email) {
        return res.status(200).json({
          success: true,
          message: "Payment verified successfully; customer email not found",
          orderId: order._id,
          invoiceNumber: order.invoiceNumber,
          invoiceEmailSent: false,
        });
      }

      if (!order.invoiceEmailSentAt) {
        const pdfBuffer = await generateRestaurantInvoice(order, customer);

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: customer.email,
          subject: `Restaurant Invoice ${order.invoiceNumber}`,
          text:
            `Hello ${customer.name || "Customer"},\n\n` +
            "Your payment was verified successfully. Your invoice is attached.\n\n" +
            "Thank you for ordering with us.",
          attachments: [
            {
              filename: `${order.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        order.invoiceEmailSentAt = new Date();
        await order.save();
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        invoiceEmailSent: true,
      });
    } catch (emailError) {
      console.error(
        "Payment succeeded, but invoice email failed:",
        emailError
      );

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully, but invoice email could not be sent",
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        invoiceEmailSent: false,
      });
    }
  } catch (error) {
    console.error("Verify restaurant payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment. Check the order status before retrying.",
    });
  }
};

module.exports = {
  createRestaurantPaymentOrder,
  verifyRestaurantPayment,
};
