
const mongoose = require("mongoose");

const RestaurantBill = require("../models/RestaurantBill");
const {
    sendSMS,
    sendWhatsAppText,
} = require("../services/twilioService");

exports.sendRestaurantBillMessage = async (req, res) => {
    try {
        const { channel } = req.body;

        if (!["sms", "whatsapp"].includes(channel)) {
            return res.status(400).json({
                success: false,
                message: "Channel must be sms or whatsapp.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bill ID.",
            });
        }

        const bill = await RestaurantBill.findById(req.params.id)
            .populate("table", "tableNumber");

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found.",
            });
        }

        if (!bill.customerPhone) {
            return res.status(400).json({
                success: false,
                message: "Customer mobile number is missing from this bill.",
            });
        }

        const total = Number(bill.totalAmount || 0).toFixed(2);
        const discount = Number(bill.discountAmount || 0).toFixed(2);

        const message =
            `Restaurant Bill: ${bill.billNumber}\n` +
            `Customer: ${bill.customerName || "Customer"}\n` +
            `Table: ${bill.table?.tableNumber || "N/A"}\n` +
            `Subtotal: Rs. ${Number(bill.subtotal || 0).toFixed(2)}\n` +
            `GST: Rs. ${Number(bill.taxAmount || 0).toFixed(2)}\n` +
            `Discount: Rs. ${discount}\n` +
            `Total: Rs. ${total}\n` +
            `Payment status: ${bill.paymentStatus}\n` +
            `Thank you for visiting us!`;

        const result =
            channel === "sms"
                ? await sendSMS(bill.customerPhone, message)
                : await sendWhatsAppText(bill.customerPhone, message);

        return res.status(200).json({
            success: true,
            message: `${channel.toUpperCase()} request accepted by Twilio.`,
            channel,
            messageSid: result.sid,
            providerStatus: result.status,
        });
    } catch (error) {
        console.error("Send restaurant bill message:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to send the bill message.",
        });
    }
};
