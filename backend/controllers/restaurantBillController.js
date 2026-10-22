
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const RestaurantBill = require("../models/RestaurantBill");
const RestaurantOrder = require("../models/RestaurantOrder");
const RestaurantTable = require("../models/RestaurantTable");
const Coupon = require("../models/Coupon");
const {
    sendSMS,
    sendWhatsAppText,
} = require("../services/twilioService");

const TAX_RATE = 0.18;

const roundMoney = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// ==========================================
// COUPON DISCOUNT CALCULATION
// ==========================================

const calculateCouponDiscount = (coupon, subtotal) => {
    if (!coupon || !coupon.isActive) {
        throw new Error("Invalid or inactive coupon.");
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        throw new Error("This coupon has expired.");
    }

    if (subtotal < Number(coupon.minOrderAmount || 0)) {
        throw new Error(
            `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}.`
        );
    }

    let discount = 0;

    if (coupon.discountType === "percentage") {
        discount = subtotal * Number(coupon.discountValue) / 100;

        if (coupon.maxDiscount != null) {
            discount = Math.min(
                discount,
                Number(coupon.maxDiscount)
            );
        }
    } else if (coupon.discountType === "fixed") {
        discount = Number(coupon.discountValue);
    } else {
        throw new Error("Invalid coupon discount type.");
    }

    return roundMoney(
        Math.min(Math.max(discount, 0), subtotal)
    );
};

// ==========================================
// CREATE RESTAURANT BILL
// POST /api/restaurant-bills
// POST /api/restaurant-bills/table/:tableId
// ==========================================


const createRestaurantBill = async (req, res) => {
    try {
        const {
            orderIds = [],
            couponCode,
            discountAmount = 0,
            customerName = "Walk-in Customer",
            customerPhone = "",
        } = req.body || {};

        const { tableId } = req.params;

        let orders = [];

        // Find only current, unbilled orders.
        const orderFilter = {
            billGenerated: { $ne: true },
            paymentStatus: { $ne: "paid" },
            orderStatus: { $nin: ["cancelled", "canceled"] },
        };

        if (Array.isArray(orderIds) && orderIds.length > 0) {
            for (const id of orderIds) {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid order ID: ${id}`,
                    });
                }
            }

            orders = await RestaurantOrder.find({
                ...orderFilter,
                _id: { $in: orderIds },
            });
        } else if (tableId) {
            if (!mongoose.Types.ObjectId.isValid(tableId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid table ID.",
                });
            }

            orders = await RestaurantOrder.find({
                ...orderFilter,
                table: tableId,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "orderIds or tableId is required.",
            });
        }

        if (orders.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No new unbilled restaurant orders found for this table.",
            });
        }

        // All orders must belong to the same table.
        const selectedTableId = orders[0].table;

        if (!selectedTableId) {
            return res.status(400).json({
                success: false,
                message: "An order is not linked with a table.",
            });
        }

        const differentTable = orders.some(
            (order) =>
                String(order.table) !== String(selectedTableId)
        );

        if (differentTable) {
            return res.status(400).json({
                success: false,
                message: "All selected orders must belong to the same table.",
            });
        }

        if (
            tableId &&
            String(selectedTableId) !== String(tableId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Orders do not belong to the requested table.",
            });
        }

        const table = await RestaurantTable.findById(selectedTableId);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Restaurant table not found.",
            });
        }

        const selectedOrderIds = orders.map((order) => order._id);

        // Calculate the subtotal from saved order data.
        const subtotal = roundMoney(
            orders.reduce(
                (sum, order) => sum + Number(order.subtotal || 0),
                0
            )
        );

        if (subtotal <= 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot generate a bill with a zero subtotal.",
            });
        }

        const customerOrder = orders.find(
            (order) =>
                order.customerName?.trim() ||
                order.customerMobile?.trim() ||
                order.customerPhone?.trim()
        );

        const finalCustomerName =
            customerOrder?.customerName?.trim() ||
            String(customerName || "").trim() ||
            "Walk-in Customer";

        const finalCustomerPhone =
            customerOrder?.customerMobile?.trim() ||
            customerOrder?.customerPhone?.trim() ||
            String(customerPhone || "").trim() ||
            "";

        const taxAmount = roundMoney(subtotal * TAX_RATE);

        // Always validate coupons on the server.
        let discount = 0;
        let savedCouponCode = "";

        if (couponCode && String(couponCode).trim()) {
            const normalizedCode = String(couponCode)
                .trim()
                .toUpperCase();

            const coupon = await Coupon.findOne({
                code: normalizedCode,
                isActive: true,
            });

            if (!coupon) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or inactive coupon.",
                });
            }

            try {
                discount = calculateCouponDiscount(coupon, subtotal);
            } catch (couponError) {
                return res.status(400).json({
                    success: false,
                    message: couponError.message,
                });
            }

            savedCouponCode = coupon.code;
        } else if (Number(discountAmount) > 0) {
            return res.status(400).json({
                success: false,
                message: "A valid coupon code is required for a discount.",
            });
        }

        const totalAmount = roundMoney(
            Math.max(0, subtotal + taxAmount - discount)
        );

        const billNumber =
            `RB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        // Do not block a new bill just because an older bill exists.
        // Previously billed orders are excluded by billGenerated above.
        const bill = await RestaurantBill.create({
            billNumber,
            table: selectedTableId,
            orders: selectedOrderIds,
            customerName: finalCustomerName,
            customerPhone: finalCustomerPhone,
            subtotal,
            taxAmount,
            discountAmount: discount,
            couponCode: savedCouponCode,
            totalAmount,
            paidAmount: 0,
            paymentStatus: "unpaid",
            paymentMethod: "pending",
            status: "open",
            paidAt: null,
        });

        // Mark only the orders included in this bill.
        await RestaurantOrder.updateMany(
            { _id: { $in: selectedOrderIds } },
            { $set: { billGenerated: true } }
        );

        const populatedBill = await RestaurantBill.findById(bill._id)
            .populate("table", "tableNumber capacity status")
            .populate("orders");

        return res.status(201).json({
            success: true,
            message: "Restaurant bill created successfully.",
            bill: populatedBill,
        });
    } catch (error) {
        console.error("Create Restaurant Bill Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create restaurant bill.",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};


// ==========================================
// GET BILL BY ID
// ==========================================

const getRestaurantBill = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bill ID.",
            });
        }

        const bill = await RestaurantBill.findById(req.params.id)
            .populate("table", "tableNumber capacity status")
            .populate("orders");

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Restaurant bill not found.",
            });
        }

        return res.status(200).json({
            success: true,
            bill,
        });
    } catch (error) {
        console.error("Get Restaurant Bill Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch restaurant bill.",
        });
    }
};

// ==========================================
// PAY RESTAURANT BILL
// ==========================================


const payRestaurantBill = async (req, res) => {
    try {
        const { paymentMethod } = req.body || {};
        const validMethods = ["cash", "card", "upi", "razorpay"];

        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bill ID.",
            });
        }

        const bill = await RestaurantBill.findById(req.params.id);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Restaurant bill not found.",
            });
        }

        if (bill.paymentStatus === "paid" || bill.status === "paid") {
            return res.status(400).json({
                success: false,
                message: "Bill is already paid.",
            });
        }

        // Save payment.
        bill.paymentStatus = "paid";
        bill.paymentMethod = paymentMethod;
        bill.paidAmount = bill.totalAmount;
        bill.status = "paid";
        bill.paidAt = new Date();
        // Update restaurant orders.
        await RestaurantOrder.updateMany(
            { _id: { $in: bill.orders } },
            {
                $set: {
                    paymentStatus: "paid",
                    paymentMethod,
                    orderStatus: "completed",
                },
            }
        );

        // Release the table.
        await RestaurantTable.findByIdAndUpdate(
            bill.table,
            { $set: { status: "available" } }
        );

        const updatedBill = await RestaurantBill.findById(bill._id)
            .populate("table", "tableNumber capacity status")
            .populate("orders");

        // Automatically send receipt after payment is saved.
        const notifications = {
            sms: "skipped",
            whatsapp: "skipped",
        };

        if (updatedBill.customerPhone) {
            const message =
                `Payment Successful - Restaurant Bill\n` +
                `Bill No: ${updatedBill.billNumber}\n` +
                `Customer: ${updatedBill.customerName || "Customer"}\n` +
                `Table: ${updatedBill.table?.tableNumber || "N/A"}\n` +
                `Subtotal: Rs. ${Number(updatedBill.subtotal || 0).toFixed(2)}\n` +
                `GST: Rs. ${Number(updatedBill.taxAmount || 0).toFixed(2)}\n` +
                `Discount: Rs. ${Number(updatedBill.discountAmount || 0).toFixed(2)}\n` +
                `Total Paid: Rs. ${Number(updatedBill.paidAmount || 0).toFixed(2)}\n` +
                `Payment Method: ${updatedBill.paymentMethod}\n` +
                `Thank you for visiting us!`;

            const [smsResult, whatsappResult] = await Promise.allSettled([
                sendSMS(updatedBill.customerPhone, message),
                sendWhatsAppText(updatedBill.customerPhone, message),
            ]);

            notifications.sms =
                smsResult.status === "fulfilled" ? "accepted" : "failed";

            notifications.whatsapp =
                whatsappResult.status === "fulfilled" ? "accepted" : "failed";

            if (smsResult.status === "fulfilled") {
                console.log("SMS accepted:", smsResult.value.sid);
            } else {
                console.error("SMS failed:", smsResult.reason.message);
            }

            if (whatsappResult.status === "fulfilled") {
                console.log("WhatsApp accepted:", whatsappResult.value.sid);
            } else {
                console.error(
                    "WhatsApp failed:",
                    whatsappResult.reason.message
                );
            }
        } else {
            console.warn(
                "Customer phone missing for bill:",
                updatedBill.billNumber
            );
        }

        return res.status(200).json({
            success: true,
            message: "Restaurant bill paid successfully.",
            bill: updatedBill,
            notifications,
        });
    } catch (error) {
        console.error("Pay Restaurant Bill Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to process restaurant bill payment.",
        });
    }
};

// ==========================================
// GENERATE RESTAURANT BILL PDF
// ==========================================

const generateRestaurantBillPDF = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bill ID.",
            });
        }

        const bill = await RestaurantBill.findById(req.params.id)
            .populate("table", "tableNumber capacity status")
            .populate("orders");

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Restaurant bill not found.",
            });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${bill.billNumber}.pdf"`
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc.fontSize(22).text("HOTEL & RESTAURANT", {
            align: "center",
        });

        doc.fontSize(16).text("Restaurant Invoice", {
            align: "center",
        });

        doc.moveDown();

        doc.fontSize(10).text(`Bill Number: ${bill.billNumber}`);
        doc.text(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
        doc.text(`Table: ${bill.table?.tableNumber || "N/A"}`);
        doc.text(`Customer: ${bill.customerName || "Walk-in Customer"}`);

        if (bill.customerPhone) {
            doc.text(`Phone: ${bill.customerPhone}`);
        }

        if (bill.couponCode) {
            doc.text(`Coupon: ${bill.couponCode}`);
        }

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();

        doc.fontSize(11).text("Restaurant Orders");
        doc.moveDown(0.5);

        for (const order of bill.orders || []) {
            doc.fontSize(10).text(
                `Order ID: ${order._id}`
            );

            for (const item of order.items || []) {
                doc.text(
                    `${item.name} x${item.quantity}  ` +
                    `₹${Number(item.price || 0).toFixed(2)}  =  ` +
                    `₹${Number(item.total || 0).toFixed(2)}`
                );
            }

            doc.moveDown(0.5);
        }

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();

        doc.fontSize(11).text(
            `Subtotal: ₹${Number(bill.subtotal || 0).toFixed(2)}`,
            { align: "right" }
        );

        doc.text(
            `Tax: ₹${Number(bill.taxAmount || 0).toFixed(2)}`,
            { align: "right" }
        );

        doc.text(
            `Discount: ₹${Number(bill.discountAmount || 0).toFixed(2)}`,
            { align: "right" }
        );

        doc.fontSize(14).text(
            `TOTAL: ₹${Number(bill.totalAmount || 0).toFixed(2)}`,
            { align: "right" }
        );

        doc.moveDown();
        doc.fontSize(10).text(
            `Payment Status: ${bill.paymentStatus}`
        );
        doc.text(`Payment Method: ${bill.paymentMethod}`);

        doc.moveDown(2);
        doc.text("Thank you for visiting us!", {
            align: "center",
        });

        doc.end();
    } catch (error) {
        console.error("Generate Restaurant Bill PDF Error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Unable to generate restaurant bill PDF.",
            });
        }
    }
};

// ==========================================
// GET ALL RESTAURANT BILLS
// ==========================================

const getAllRestaurantBills = async (req, res) => {
    try {
        const {
            paymentStatus,
            status,
            search,
            startDate,
            endDate,
        } = req.query;

        const filter = {};

        if (paymentStatus) {
            filter.paymentStatus = paymentStatus;
        }

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { billNumber: { $regex: search, $options: "i" } },
                { customerName: { $regex: search, $options: "i" } },
                { customerPhone: { $regex: search, $options: "i" } },
            ];
        }

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                filter.createdAt.$gte = new Date(`${startDate}T00:00:00`);
            }

            if (endDate) {
                filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
            }
        }

        const bills = await RestaurantBill.find(filter)
            .populate("table", "tableNumber capacity status")
            .populate(
                "orders",
                "items subtotal taxAmount totalAmount orderStatus paymentStatus"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: bills.length,
            bills,
        });
    } catch (error) {
        console.error("Get All Restaurant Bills Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch restaurant bills.",
        });
    }
};

// ==========================================
// RESTAURANT BILL DASHBOARD
// ==========================================

const getRestaurantDashboard = async (req, res) => {
    try {
        const now = new Date();

        const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 59, 999
        );

        const todayBills = await RestaurantBill.find({
            createdAt: {
                $gte: startOfToday,
                $lte: endOfToday,
            },
        });

        const totalBills = todayBills.length;

        const paidBills = todayBills.filter(
            (bill) => bill.paymentStatus === "paid"
        ).length;

        const unpaidBills = todayBills.filter(
            (bill) => bill.paymentStatus === "unpaid"
        ).length;

        const partiallyPaidBills = todayBills.filter(
            (bill) => bill.paymentStatus === "partially_paid"
        ).length;

        let subtotal = 0;
        let taxAmount = 0;
        let discountAmount = 0;
        let totalSales = 0;
        let paidAmount = 0;

        let cashCollection = 0;
        let upiCollection = 0;
        let cardCollection = 0;
        let razorpayCollection = 0;

        for (const bill of todayBills) {
            subtotal += Number(bill.subtotal || 0);
            taxAmount += Number(bill.taxAmount || 0);
            discountAmount += Number(bill.discountAmount || 0);
            totalSales += Number(bill.totalAmount || 0);
            paidAmount += Number(bill.paidAmount || 0);

            const amount = Number(bill.paidAmount || 0);

            switch (bill.paymentMethod) {
                case "cash":
                    cashCollection += amount;
                    break;
                case "upi":
                    upiCollection += amount;
                    break;
                case "card":
                    cardCollection += amount;
                    break;
                case "razorpay":
                    razorpayCollection += amount;
                    break;
                default:
                    break;
            }
        }

        const recentBills = await RestaurantBill.find({})
            .populate("table", "tableNumber")
            .sort({ createdAt: -1 })
            .limit(10);

        return res.status(200).json({
            success: true,
            date: startOfToday,
            summary: {
                totalSales: roundMoney(totalSales),
                subtotal: roundMoney(subtotal),
                taxAmount: roundMoney(taxAmount),
                discountAmount: roundMoney(discountAmount),
                paidAmount: roundMoney(paidAmount),
                totalBills,
                paidBills,
                unpaidBills,
                partiallyPaidBills,
            },
            collections: {
                cash: roundMoney(cashCollection),
                upi: roundMoney(upiCollection),
                card: roundMoney(cardCollection),
                razorpay: roundMoney(razorpayCollection),
            },
            recentBills,
        });
    } catch (error) {
        console.error("Restaurant Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load restaurant dashboard.",
        });
    }
};

module.exports = {
    createRestaurantBill,
    getRestaurantBill,
    payRestaurantBill,
    generateRestaurantBillPDF,
    getAllRestaurantBills,
    getRestaurantDashboard,
};
