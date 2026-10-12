const mongoose = require("mongoose");

const RestaurantBill = require("../models/RestaurantBill");
const RestaurantOrder = require("../models/RestaurantOrder");
const RestaurantTable = require("../models/RestaurantTable");
const PDFDocument = require("pdfkit");


// ==========================================
// TAX
// ==========================================

const TAX_RATE = 0.18;


// ==========================================
// CREATE RESTAURANT BILL
// ==========================================

const createRestaurantBill = async (req, res) => {
    try {
        const {
            orderIds = [],
            discountAmount = 0,
            customerName = "Walk-in Customer",
            customerPhone = "",
        } = req.body || {};

        const { tableId } = req.params;

        let orders = [];

        // ==========================================
        // CREATE BILL FROM ORDER IDS
        // ==========================================

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
                _id: {
                    $in: orderIds,
                },
                paymentStatus: {
                    $ne: "paid",
                },
                orderStatus: {
                    $ne: "cancelled",
                },
            });
        }

        // ==========================================
        // CREATE BILL FROM TABLE
        // ==========================================

        else if (tableId) {

            if (
                !mongoose.Types.ObjectId.isValid(tableId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid table ID",
                });
            }

            orders = await RestaurantOrder.find({
                table: tableId,
                paymentStatus: {
                    $ne: "paid",
                },
                orderStatus: {
                    $ne: "cancelled",
                },
            });
        }

        // ==========================================
        // NO ORDER
        // ==========================================

        else {
            return res.status(400).json({
                success: false,
                message: "orderIds or tableId is required",
            });
        }

        // ==========================================
        // CHECK ORDERS
        // ==========================================

        if (orders.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No unpaid restaurant orders found",
            });
        }

        // ==========================================
        // FIND TABLE
        // ==========================================

        const selectedTableId = orders[0].table;

        if (!selectedTableId) {
            return res.status(400).json({
                success: false,
                message: "Order is not linked with a table",
            });
        }

        // ==========================================
        // ALL ORDERS MUST HAVE SAME TABLE
        // ==========================================

        const differentTable = orders.some(
            (order) =>
                String(order.table) !==
                String(selectedTableId)
        );

        if (differentTable) {
            return res.status(400).json({
                success: false,
                message:
                    "All orders must belong to the same table",
            });
        }

        const table =
            await RestaurantTable.findById(
                selectedTableId
            );

        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Restaurant table not found",
            });
        }

        // ==========================================
        // CHECK EXISTING BILL
        // ==========================================

        const existingBill =
            await RestaurantBill.findOne({
                table: selectedTableId,
                status: "open",
            });

        if (existingBill) {
            return res.status(200).json({
                success: true,
                message:
                    "Open bill already exists for this table",
                bill: existingBill,
            });
        }

        // ==========================================
        // CALCULATE SUBTOTAL
        // ==========================================

        let subtotal = 0;

        const selectedOrderIds = [];

        for (const order of orders) {

            subtotal += Number(
                order.subtotal || 0
            );

            selectedOrderIds.push(order._id);
        }

        subtotal =
            Math.round(subtotal * 100) / 100;

        // ==========================================
        // TAX
        // ==========================================

        const taxAmount =
            Math.round(
                subtotal *
                TAX_RATE *
                100
            ) / 100;

        // ==========================================
        // DISCOUNT
        // ==========================================

        let discount =
            Number(discountAmount) || 0;

        if (discount < 0) {
            discount = 0;
        }

        const maxDiscount =
            subtotal + taxAmount;

        if (discount > maxDiscount) {
            discount = maxDiscount;
        }

        discount =
            Math.round(discount * 100) / 100;

        // ==========================================
        // TOTAL
        // ==========================================

        const totalAmount =
            Math.round(
                (
                    subtotal +
                    taxAmount -
                    discount
                ) * 100
            ) / 100;

        // ==========================================
        // BILL NUMBER
        // ==========================================

        const billNumber =
            `RB-${Date.now()}`;

        // ==========================================
        // CREATE BILL
        // ==========================================

        const bill =
            await RestaurantBill.create({
                billNumber,

                table: selectedTableId,

                orders: selectedOrderIds,

                customerName:
                    String(
                        customerName ||
                        "Walk-in Customer"
                    ).trim(),

                customerPhone:
                    String(
                        customerPhone || ""
                    ).trim(),

                subtotal,

                taxAmount,

                discountAmount:
                    discount,

                totalAmount,

                paidAmount: 0,

                paymentStatus: "unpaid",

                paymentMethod: "pending",

                status: "open",

                paidAt: null,
            });

        // ==========================================
        // POPULATE
        // ==========================================

        const populatedBill =
            await RestaurantBill.findById(
                bill._id
            )
                .populate(
                    "table",
                    "tableNumber capacity status"
                )
                .populate("orders");

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({
            success: true,

            message:
                "Restaurant bill created successfully",

            bill: populatedBill,
        });

    } catch (error) {

        console.error(
            "Create Restaurant Bill Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create restaurant bill",
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
const payRestaurantBill = async (req, res) => {
    try {
        const { paymentMethod } = req.body;

        const validMethods = [
            "cash",
            "card",
            "upi",
            "razorpay"
        ];

        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        const bill = await RestaurantBill.findById(req.params.id);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Restaurant bill not found"
            });
        }

        if (bill.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Bill is already paid"
            });
        }

        // ==========================================
        // UPDATE BILL
        // ==========================================

bill.paymentStatus = "paid";
bill.paymentMethod = paymentMethod;
bill.paidAmount = bill.totalAmount;
bill.status = "paid";

await bill.save();

        // ==========================================
        // UPDATE ALL ORDERS
        // ==========================================

        await RestaurantOrder.updateMany(
            {
                _id: { $in: bill.orders }
            },
            {
                $set: {
                    paymentStatus: "paid",
                    paymentMethod: paymentMethod
                }
            }
        );

        // ==========================================
        // FREE TABLE
        // ==========================================

        await RestaurantTable.findByIdAndUpdate(
            bill.table,
            {
                status: "available"
            }
        );

        // ==========================================
        // RESPONSE
        // ==========================================

        const updatedBill =
            await RestaurantBill.findById(bill._id)
                .populate(
                    "table",
                    "tableNumber capacity status"
                );

        return res.status(200).json({
            success: true,
            message: "Restaurant bill paid successfully",
            bill: updatedBill
        });

    } catch (error) {

        console.error(
            "Pay Restaurant Bill Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process restaurant bill payment"
        });
    }
};
const getRestaurantBill = async (req, res) => {

    try {

        const bill =
            await RestaurantBill.findById(
                req.params.id
            )
            .populate(
                "table",
                "tableNumber capacity status"
            )
            .populate(
                "orders"
            );


        if (!bill) {

            return res.status(404).json({

                success: false,

                message: "Restaurant bill not found",

            });

        }


        return res.status(200).json({

            success: true,

            bill,

        });


    } catch (error) {

        console.error(
            "Get Restaurant Bill Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to fetch restaurant bill",

        });

    }
};
const generateRestaurantBillPDF = async (req, res) => {
    try {
        const bill = await RestaurantBill.findById(req.params.id)
            .populate(
                "table",
                "tableNumber capacity status"
            )
            .populate("orders");

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Restaurant bill not found",
            });
        }

        const doc = new PDFDocument({
            margin: 50,
        });

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${bill.billNumber}.pdf`
        );

        doc.pipe(res);

        // ==============================
        // HEADER
        // ==============================

        doc
            .fontSize(22)
            .text("HOTEL & RESTAURANT", {
                align: "center",
            });

        doc
            .fontSize(16)
            .text("Restaurant Invoice", {
                align: "center",
            });

        doc.moveDown();

        doc
            .fontSize(10)
            .text(`Bill Number: ${bill.billNumber}`);

        doc.text(
            `Date: ${new Date(
                bill.createdAt
            ).toLocaleString()}`
        );

        doc.text(
            `Table: ${
                bill.table?.tableNumber || "N/A"
            }`
        );

        doc.text(
            `Customer: ${
                bill.customerName || "Walk-in Customer"
            }`
        );

        if (bill.customerPhone) {
            doc.text(
                `Phone: ${bill.customerPhone}`
            );
        }

        doc.moveDown();

        // ==============================
        // LINE
        // ==============================

        doc
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();

        doc.moveDown();

        // ==============================
        // ITEMS
        // ==============================

        doc.fontSize(11).text(
            "Restaurant Orders"
        );

        doc.moveDown(0.5);

        for (const order of bill.orders || []) {
            doc
                .fontSize(10)
                .text(
                    `Order ID: ${order._id}`
                );

            for (const item of order.items || []) {
                doc.text(
                    `${item.name}  x${item.quantity}  ₹${item.price}  =  ₹${item.total}`
                );
            }

            doc.moveDown(0.5);
        }

        // ==============================
        // TOTALS
        // ==============================

        doc.moveDown();

        doc
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();

        doc.moveDown();

        doc.fontSize(11).text(
            `Subtotal: ₹${bill.subtotal.toFixed(2)}`,
            {
                align: "right",
            }
        );

        doc.text(
            `Tax: ₹${bill.taxAmount.toFixed(2)}`,
            {
                align: "right",
            }
        );

        doc.text(
            `Discount: ₹${bill.discountAmount.toFixed(2)}`,
            {
                align: "right",
            }
        );

        doc
            .fontSize(14)
            .text(
                `TOTAL: ₹${bill.totalAmount.toFixed(2)}`,
                {
                    align: "right",
                }
            );

        doc.moveDown();

        doc.text(
            `Payment Status: ${bill.paymentStatus}`
        );

        doc.text(
            `Payment Method: ${bill.paymentMethod}`
        );

        doc.moveDown(2);

        doc
            .fontSize(10)
            .text(
                "Thank you for visiting us!",
                {
                    align: "center",
                }
            );

        doc.end();

    } catch (error) {

        console.error(
            "Generate Restaurant Bill PDF Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to generate restaurant bill PDF",
        });
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

        // Payment filter
        if (paymentStatus) {
            filter.paymentStatus = paymentStatus;
        }

        // Bill status filter
        if (status) {
            filter.status = status;
        }

        // Search bill number / customer
        if (search) {
            filter.$or = [
                {
                    billNumber: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    customerName: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    customerPhone: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        // Date filter
        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                filter.createdAt.$gte =
                    new Date(`${startDate}T00:00:00`);
            }

            if (endDate) {
                filter.createdAt.$lte =
                    new Date(`${endDate}T23:59:59.999`);
            }
        }

        const bills = await RestaurantBill.find(filter)
            .populate(
                "table",
                "tableNumber capacity status"
            )
            .populate(
                "orders",
                "items subtotal taxAmount totalAmount orderStatus paymentStatus"
            )
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            count: bills.length,
            bills,
        });

    } catch (error) {

        console.error(
            "Get All Restaurant Bills Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch restaurant bills",
        });
    }
};
// ==========================================
// RESTAURANT DASHBOARD
// ==========================================

const getRestaurantDashboard = async (req, res) => {
    try {
        const now = new Date();

        const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
        );

        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
        );

        // ==========================================
        // TODAY'S BILLS
        // ==========================================

        const todayBills = await RestaurantBill.find({
            createdAt: {
                $gte: startOfToday,
                $lte: endOfToday,
            },
        });

        // ==========================================
        // BASIC COUNTS
        // ==========================================

        const totalBills = todayBills.length;

        const paidBills = todayBills.filter(
            (bill) =>
                bill.paymentStatus === "paid"
        ).length;

        const unpaidBills = todayBills.filter(
            (bill) =>
                bill.paymentStatus === "unpaid"
        ).length;

        const partiallyPaidBills =
            todayBills.filter(
                (bill) =>
                    bill.paymentStatus ===
                    "partially_paid"
            ).length;

        // ==========================================
        // SALES
        // ==========================================

        let totalSales = 0;
        let subtotal = 0;
        let taxAmount = 0;
        let discountAmount = 0;
        let paidAmount = 0;

        let cashCollection = 0;
        let upiCollection = 0;
        let cardCollection = 0;
        let razorpayCollection = 0;

        todayBills.forEach((bill) => {
            subtotal += Number(
                bill.subtotal || 0
            );

            taxAmount += Number(
                bill.taxAmount || 0
            );

            discountAmount += Number(
                bill.discountAmount || 0
            );

            totalSales += Number(
                bill.totalAmount || 0
            );

            paidAmount += Number(
                bill.paidAmount || 0
            );

            const amount = Number(
                bill.paidAmount || 0
            );

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
        });

        // ==========================================
        // ROUND VALUES
        // ==========================================

        const round = (value) =>
            Math.round(value * 100) / 100;

        // ==========================================
        // RECENT BILLS
        // ==========================================

        const recentBills =
            await RestaurantBill.find({})
                .populate(
                    "table",
                    "tableNumber"
                )
                .sort({
                    createdAt: -1,
                })
                .limit(10);

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            date: startOfToday,

            summary: {
                totalSales: round(totalSales),

                subtotal: round(subtotal),

                taxAmount: round(taxAmount),

                discountAmount:
                    round(discountAmount),

                paidAmount: round(paidAmount),

                totalBills,

                paidBills,

                unpaidBills,

                partiallyPaidBills,
            },

            collections: {
                cash: round(
                    cashCollection
                ),

                upi: round(
                    upiCollection
                ),

                card: round(
                    cardCollection
                ),

                razorpay: round(
                    razorpayCollection
                ),
            },

            recentBills,
        });

    } catch (error) {

        console.error(
            "Restaurant Dashboard Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load restaurant dashboard",
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