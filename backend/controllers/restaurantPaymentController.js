
const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const RestaurantOrder = require("../models/RestaurantOrder");
const User = require("../models/User");
const transporter = require("../config/mailer");
const generateRestaurantInvoice = require("../utils/generateRestaurantInvoice");

// Create Razorpay order for an existing restaurant order
const createRestaurantPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant order ID",
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

    const amount = Math.round(Number(order.totalAmount) * 100);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant order amount",
      });
    }

    // Reuse the existing Razorpay order if one was already created.
    if (order.razorpayOrderId) {
      return res.json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
        order: {
          id: order.razorpayOrderId,
          amount,
          currency: "INR",
        },
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
      key: process.env.RAZORPAY_KEY_ID,
      order: {
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
      },
    });
  } catch (error) {
    console.error("Create restaurant payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};

// Verify Razorpay payment and email invoice
const verifyRestaurantPayment = async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing",
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

    // Prevent a different Razorpay order from being used.
    console.log("Restaurant Order ID:", order._id.toString());
console.log("Saved Razorpay Order ID:", order.razorpayOrderId);
console.log("Received Razorpay Order ID:", razorpay_order_id);
console.log("Received Payment ID:", razorpay_payment_id);
    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID does not match",
      });
    }

    // Handle repeated verification without sending another invoice.
    if (order.paymentStatus === "paid") {
      return res.json({
        success: true,
        message: "Payment is already verified",
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
      });
    }

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

    // Verify payment directly with Razorpay.
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
        message: "Payment is not captured or amount does not match",
      });
    }

    order.paymentStatus = "paid";
    order.paymentMethod = "razorpay";
    order.razorpayPaymentId = razorpay_payment_id;
    order.paymentVerifiedAt = new Date();

    if (!order.invoiceNumber) {
      order.invoiceNumber =
        `INV-${Date.now()}-${order._id.toString().slice(-6).toUpperCase()}`;
    }

    // Change this field if your schema uses a different status field.
    if (order.orderStatus === "pending") {
      order.orderStatus = "confirmed";
    }

    await order.save();

    const customer = order.customer
      ? await User.findById(order.customer).select("name email phone")
      : null;

    if (!customer?.email) {
      return res.json({
        success: true,
        message: "Payment verified, but registered customer email was not found",
        orderId: order._id,
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

    return res.json({
      success: true,
      message: "Payment verified and invoice email sent",
      orderId: order._id,
      invoiceNumber: order.invoiceNumber,
    });
  } catch (error) {
    console.error("Verify restaurant payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification or invoice processing failed",
    });
  }
};

module.exports = {
  createRestaurantPaymentOrder,
  verifyRestaurantPayment,
};
