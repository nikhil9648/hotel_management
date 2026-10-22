const mongoose = require("mongoose");
const crypto = require("crypto");

const RestaurantOrder = require("../models/RestaurantOrder");
const RestaurantTable = require("../models/RestaurantTable");
const FoodItem = require("../models/FoodItem");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const {
    isDeliveryAvailable,
} = require("../utils/deliveryLocation");

const transporter = require("../config/mailer");
const generateRestaurantInvoice = require("../utils/generateRestaurantInvoice");

const TAX_RATE = 0.18;
const OTP_EXPIRY_HOURS = 24;
const MAX_OTP_ATTEMPTS = 5;

const VALID_ORDER_TYPES = ["dine-in", "takeaway", "delivery"];
const VALID_PAYMENT_METHODS = [
    "cash", "card", "upi", "razorpay", "pending",
];

const VALID_ORDER_STATUSES = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "served",
    "cancelled",
    "out_for_delivery",
    "delivered",
];

const VALID_SERVING_TYPES = ["dine-in", "takeaway"];

const roundMoney = (amount) =>
    Math.round(Number(amount) * 100) / 100;

const sendError = (res, status, message) =>
    res.status(status).json({ success: false, message });

const isValidId = (id) =>
    mongoose.Types.ObjectId.isValid(id);

const getOtpEncryptionKey = () => {
    const key = process.env.DELIVERY_OTP_ENCRYPTION_KEY;

    if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
        throw new Error(
            "DELIVERY_OTP_ENCRYPTION_KEY must be a 32-byte hex key"
        );
    }

    return Buffer.from(key, "hex");
};

const encryptDeliveryOtp = (otp) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        getOtpEncryptionKey(),
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(otp, "utf8"),
        cipher.final(),
    ]);

    return [
        iv.toString("hex"),
        cipher.getAuthTag().toString("hex"),
        encrypted.toString("hex"),
    ].join(":");
};

const decryptDeliveryOtp = (value) => {
    const [ivHex, tagHex, dataHex] = value.split(":");

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        getOtpEncryptionKey(),
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    return Buffer.concat([
        decipher.update(Buffer.from(dataHex, "hex")),
        decipher.final(),
    ]).toString("utf8");
};

const generateDeliveryOtp = () =>
    crypto.randomInt(0, 10000).toString().padStart(4, "0");

const getFoodPrice = (food) => {
    const discount = Number(food.discountPrice);

    if (
        Number.isFinite(discount) &&
        discount > 0 &&
        discount < Number(food.price)
    ) {
        return discount;
    }

    return Number(food.price);
};

const populateOrder = (query) =>
    query
        .populate("customer", "name email phone")
        .populate("table", "tableNumber capacity status")
        .populate("waiter", "name email")
        .populate("deliveryBoy", "name email phone")
        .populate("items.food", "name price discountPrice foodType image");

const recalculateOrder = (order) => {
  const subtotal = roundMoney(
    order.items.reduce(
      (sum, item) =>
        sum + roundMoney(Number(item.price) * Number(item.quantity)),
      0
    )
  );

  order.items.forEach((item) => {
    item.total = roundMoney(
      Number(item.price) * Number(item.quantity)
    );
  });

  const discountAmount = roundMoney(
    Math.min(
      Math.max(0, Number(order.discountAmount || 0)),
      subtotal
    )
  );

  order.subtotal = subtotal;
  order.discountAmount = discountAmount;
  order.taxAmount = roundMoney(
    (subtotal - discountAmount) * TAX_RATE
  );
  order.totalAmount = roundMoney(
    subtotal - discountAmount + order.taxAmount
  );
};

const canManageOrder = (req, order) => {
    const role = req.user?.role;

    if (!req.user) return false;

    if (["admin", "manager"].includes(role)) return true;

    return (
        role === "waiter" &&
        order.waiter &&
        String(order.waiter) === String(req.user._id)
    );
};

const getTableFromRequest = async ({ table, tableNumber }) => {
    if (table) {
        if (!isValidId(table)) {
            return { error: "Invalid table ID", status: 400 };
        }

        const tableData = await RestaurantTable.findById(table);

        if (!tableData) {
            return { error: "Restaurant table not found", status: 404 };
        }

        return { tableData };
    }

    if (tableNumber !== undefined && tableNumber !== "") {
        const tableData = await RestaurantTable.findOne({
            tableNumber: String(tableNumber).trim(),
        });

        if (!tableData) {
            return { error: "Restaurant table not found", status: 404 };
        }

        return { tableData };
    }

    return { tableData: null };
};

const processItems = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            error: "At least one food item is required",
            status: 400,
        };
    }

    const processed = [];

    for (const item of items) {
        const foodId = item.food || item.foodItem;

        if (!foodId || !isValidId(foodId)) {
            return {
                error: "Invalid or missing food item ID",
                status: 400,
            };
        }

        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            return {
                error: "Food quantity must be a positive integer",
                status: 400,
            };
        }

        const servingType = item.servingType || "dine-in";

        if (!VALID_SERVING_TYPES.includes(servingType)) {
            return {
                error: "Invalid serving type",
                status: 400,
            };
        }

        const food = await FoodItem.findById(foodId);

        if (!food) {
            return { error: "Food item not found", status: 404 };
        }

        if (food.isAvailable === false) {
            return {
                error: `${food.name} is currently unavailable`,
                status: 400,
            };
        }

        const price = getFoodPrice(food);

        processed.push({
            food: food._id,
            name: food.name,
            quantity,
            price,
            total: roundMoney(price * quantity),
            specialInstructions: String(
                item.specialInstructions || ""
            ).trim(),
            servingType,
        });
    }

    return { processed };
};

// Send invoice and delivery OTP in one email.
const sendDeliveryInvoiceEmail = async (order, customer, otp) => {
    if (!customer?.email) {
        throw new Error("Customer email is not available");
    }

    const invoiceBuffer = await generateRestaurantInvoice(
        order,
        customer
    );

    await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: `Order Confirmation and Delivery OTP`,
        text: [
            `Hello ${customer.name || order.customerName},`,
            "",
            "Your online delivery order has been placed successfully.",
            `Order ID: ${order._id}`,
            `Delivery OTP: ${otp}`,
            "",
            "Share this OTP with the delivery person when your order arrives.",
            "Please do not share it before receiving your order.",
            "",
            "Your invoice is attached to this email.",
        ].join("\n"),
        attachments: [
            {
                filename: `invoice-${order._id}.pdf`,
                content: invoiceBuffer,
                contentType: "application/pdf",
            },
        ],
    });
};

const sendDeliveryConfirmationEmail = async (order, customer) => {
    if (!customer?.email) {
        throw new Error("Customer email is not available");
    }

    await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: "Your order has been delivered",
        text: [
            `Hello ${customer.name || order.customerName},`,
            "",
            "Your restaurant delivery order has been delivered successfully.",
            `Order ID: ${order._id}`,
            `Total: Rs. ${Number(order.totalAmount || 0).toFixed(2)}`,
            `Delivered at: ${new Date(order.deliveredAt).toLocaleString("en-IN")}`,
            "",
            "Thank you for ordering with us!",
        ].join("\n"),
    });
};

// =====================================================
// CREATE ORDER
// POST /api/restaurant-orders
// =====================================================

const createRestaurantOrder = async (req, res) => {
    try {
        const {
            customerName,
            customerMobile,
            table,
            tableNumber,
            items,
            orderType,
            deliveryAddress = "",
            deliveryLocation = null,
            paymentMethod = "cash",
            notes = "",
            parentOrder,
            couponCode,
        } = req.body || {};

        if (
            typeof customerName !== "string" ||
            !customerName.trim()
        ) {
            return sendError(res, 400, "Customer name is required");
        }

        if (
            typeof customerMobile !== "string" &&
            typeof customerMobile !== "number"
        ) {
            return sendError(res, 400, "Customer mobile is required");
        }

        const normalizedMobile = String(customerMobile).trim();

        if (!normalizedMobile || normalizedMobile.length > 20) {
            return sendError(res, 400, "Invalid customer mobile number");
        }

        if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
            return sendError(res, 400, "Invalid payment method");
        }

        if (orderType && !VALID_ORDER_TYPES.includes(orderType)) {
            return sendError(res, 400, "Invalid order type");
        }

        const itemResult = await processItems(items);

        if (itemResult.error) {
            return sendError(
                res,
                itemResult.status,
                itemResult.error
            );
        }

        const orderItems = itemResult.processed;
        let originalOrder = null;

        if (parentOrder) {
            if (!isValidId(parentOrder)) {
                return sendError(res, 400, "Invalid original order ID");
            }

            originalOrder = await RestaurantOrder.findById(parentOrder);

            if (!originalOrder) {
                return sendError(res, 404, "Original order not found");
            }

            if (!canManageOrder(req, originalOrder)) {
                return sendError(res, 403, "Not allowed to add items");
            }

            if (
                originalOrder.paymentStatus === "paid" ||
                !originalOrder.table
            ) {
                return sendError(
                    res,
                    400,
                    "Cannot add items to this original order"
                );
            }
        }

        const hasDineInItems = orderItems.some(
            (item) => item.servingType === "dine-in"
        );

        const resolvedOrderType =
            orderType ||
            (table || tableNumber || hasDineInItems
                ? "dine-in"
                : "takeaway");

        if (resolvedOrderType === "delivery") {
    if (!String(deliveryAddress || "").trim()) {
        return sendError(
            res,
            400,
            "Delivery address is required"
        );
    }

    const coordinates = deliveryLocation?.coordinates;

    if (
        deliveryLocation?.type !== "Point" ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        !coordinates.every(
            (value) =>
                typeof value === "number" &&
                Number.isFinite(value)
        ) ||
        Math.abs(coordinates[0]) > 180 ||
        Math.abs(coordinates[1]) > 90
    ) {
        return sendError(
            res,
            400,
            "Please select a valid delivery location"
        );
    }

    if (!isDeliveryAvailable(deliveryLocation)) {
        return sendError(
            res,
            400,
            "Online delivery facility is not available in your location"
        );
    }
}

        if (
            resolvedOrderType === "delivery" &&
            !String(deliveryAddress).trim()
        ) {
            return sendError(res, 400, "Delivery address is required");
        }

        if (
            resolvedOrderType === "delivery" &&
            hasDineInItems
        ) {
            return sendError(
                res,
                400,
                "Delivery orders cannot contain dine-in items"
            );
        }

        if (
            resolvedOrderType === "takeaway" &&
            hasDineInItems
        ) {
            return sendError(
                res,
                400,
                "Takeaway orders cannot contain dine-in items"
            );
        }

        let tableData = null;

        if (resolvedOrderType === "dine-in" || hasDineInItems) {
            const tableResult = await getTableFromRequest({
                table,
                tableNumber,
            });

            if (tableResult.error) {
                return sendError(
                    res,
                    tableResult.status,
                    tableResult.error
                );
            }

            tableData = tableResult.tableData;

            if (!tableData || tableData.isActive === false) {
                return sendError(
                    res,
                    400,
                    "An active table is required for dine-in"
                );
            }
        }

        if (
            originalOrder &&
            String(tableData?._id || "") !== String(originalOrder.table)
        ) {
            return sendError(
                res,
                400,
                "Additional items must use the original table"
            );
        }
        let appliedCoupon = null;
let discountAmount = 0;

if (couponCode && String(couponCode).trim()) {
  const normalizedCode = String(couponCode).trim().toUpperCase();

  appliedCoupon = await Coupon.findOne({
    code: normalizedCode,
    isActive: true,
  });

  if (!appliedCoupon) {
    return sendError(res, 400, "Invalid or inactive coupon");
  }

  if (
    appliedCoupon.expiresAt &&
    new Date(appliedCoupon.expiresAt).getTime() < Date.now()
  ) {
    return sendError(res, 400, "This coupon has expired");
  }

  const subtotalBeforeDiscount = roundMoney(
    orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
  );

  if (
    subtotalBeforeDiscount <
    Number(appliedCoupon.minOrderAmount || 0)
  ) {
    return sendError(
      res,
      400,
      `Minimum order amount is ₹${appliedCoupon.minOrderAmount}`
    );
  }

  if (appliedCoupon.discountType === "percentage") {
    discountAmount =
      subtotalBeforeDiscount *
      Number(appliedCoupon.discountValue) / 100;

    if (appliedCoupon.maxDiscount != null) {
      discountAmount = Math.min(
        discountAmount,
        Number(appliedCoupon.maxDiscount)
      );
    }
  } else {
    discountAmount = Number(appliedCoupon.discountValue);
  }

  discountAmount = roundMoney(
    Math.min(
      Math.max(0, discountAmount),
      subtotalBeforeDiscount
    )
  );
}
        const order = new RestaurantOrder({
            customerName: customerName.trim(),
            customerMobile: normalizedMobile,
            customer: req.user?._id || null,
            table: tableData?._id || null,
            waiter:
                req.user?.role === "waiter" ? req.user._id : null,
            parentOrder: originalOrder?._id || null,
            orderType: resolvedOrderType,
            couponCode: appliedCoupon?.code || null,
discountAmount,
            deliveryAddress:
                resolvedOrderType === "delivery"
                    ? String(deliveryAddress).trim()
                    : "",
            items: orderItems,
            orderStatus: "pending",
            paymentStatus: "unpaid",
            paymentMethod,
            notes: String(notes || "").trim(),
        });

        let deliveryOtp = null;

        if (resolvedOrderType === "delivery") {
            // Generate OTP at order placement.
            deliveryOtp = generateDeliveryOtp();
            order.deliveryOtpEncrypted = encryptDeliveryOtp(deliveryOtp);
            order.deliveryOtpExpiresAt = new Date(
                Date.now() + OTP_EXPIRY_HOURS * 60 * 60 * 1000
            );
            order.deliveryOtpAttempts = 0;
        }

        recalculateOrder(order);
        await order.save();

        if (tableData) {
            tableData.status = "occupied";
            await tableData.save();
        }

        // Do not fail order creation if email delivery fails.
        if (resolvedOrderType === "delivery") {
            try {
                const customer = req.user?._id
                    ? await User.findById(req.user._id)
                        .select("name email phone")
                    : null;

                if (!customer?.email) {
                    console.error(
                        `Order ${order._id} saved but customer email was not found`
                    );
                } else {
                    await sendDeliveryInvoiceEmail(
                        order,
                        customer,
                        deliveryOtp
                    );
                }
            } catch (emailError) {
                console.error(
                    "Order invoice/OTP email failed:",
                    emailError.message
                );
            }
        }

        const populatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(201).json({
            success: true,
            message: "Restaurant order created successfully",
            order: populatedOrder,
            emailNotice:
                resolvedOrderType === "delivery"
                    ? "Order saved. Check server logs if the invoice/OTP email did not arrive."
                    : undefined,
        });
    } catch (error) {
        console.error("Create Restaurant Order Error:", error);
        return sendError(res, 500, "Unable to create restaurant order");
    }
};

// =====================================================
// GET MY ORDERS
// Customer sees OTP only for their own delivery orders.
// =====================================================

// GET /api/restaurant-orders/history
const getRestaurantOrderHistory = async (req, res) => {
    try {
        if (
            !["admin", "manager", "accountant"].includes(
                req.user?.role
            )
        ) {
            return sendError(
                res,
                403,
                "Not allowed to view order history"
            );
        }

        const orders = await populateOrder(
            RestaurantOrder.find({}).sort({
                createdAt: -1,
            })
        );

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get Restaurant Order History Error:", error);

        return sendError(
            res,
            500,
            "Unable to fetch restaurant order history"
        );
    }
};

const getMyRestaurantOrders = async (req, res) => {
    try {
        const role = req.user?.role;
        let filter = {};

        if (["customer", "user"].includes(role)) {
            filter.customer = req.user._id;
        } else if (role === "waiter") {
            filter.waiter = req.user._id;
            filter.orderType = { $ne: "delivery" };
        } else if (
            !["admin", "manager", "kitchen", "accountant"].includes(role)
        ) {
            return sendError(res, 403, "Not allowed to view these orders");
        }

        if (req.query.status) {
            if (!VALID_ORDER_STATUSES.includes(req.query.status)) {
                return sendError(res, 400, "Invalid order status");
            }
            filter.orderStatus = req.query.status;
        }

        const query = RestaurantOrder.find(filter).sort({ createdAt: -1 });

        // OTP is returned only to the authenticated customer who owns it.
        if (["customer", "user"].includes(role)) {
            query.select("+deliveryOtpEncrypted");
        }

        const orders = await populateOrder(query);

        const responseOrders = orders.map((order) => {
            const data = order.toObject();

            if (["customer", "user"].includes(role)) {
                if (
                    data.orderType === "delivery" &&
                    data.deliveryOtpEncrypted &&
                    !data.deliveryOtpVerifiedAt &&
                    data.deliveryOtpExpiresAt &&
                    new Date(data.deliveryOtpExpiresAt) > new Date()
                ) {
                    data.deliveryOtp = decryptDeliveryOtp(
                        data.deliveryOtpEncrypted
                    );
                }
            }

            delete data.deliveryOtpEncrypted;
            return data;
        });

        return res.status(200).json({
            success: true,
            count: responseOrders.length,
            orders: responseOrders,
        });
    } catch (error) {
        console.error("Get My Restaurant Orders Error:", error);
        return sendError(res, 500, "Unable to fetch restaurant orders");
    }
};

// =====================================================
// GET ORDERS FOR A TABLE
// =====================================================

const getTableOrders = async (req, res) => {
    try {
        const { tableId } = req.params;

        if (!isValidId(tableId)) {
            return sendError(res, 400, "Invalid table ID");
        }

        const orders = await populateOrder(
            RestaurantOrder.find({
                table: tableId,
                orderStatus: { $ne: "cancelled" },
            }).sort({ createdAt: -1 })
        );

        const unpaidOrders = orders.filter(
            (order) => order.paymentStatus !== "paid"
        );

        const subtotal = roundMoney(
            unpaidOrders.reduce(
                (sum, order) => sum + Number(order.subtotal || 0),
                0
            )
        );

        const taxAmount = roundMoney(subtotal * TAX_RATE);

        return res.status(200).json({
            success: true,
            tableId,
            count: orders.length,
            orders,
            account: {
                subtotal,
                taxAmount,
                totalAmount: roundMoney(subtotal + taxAmount),
            },
        });
    } catch (error) {
        console.error("Get Table Orders Error:", error);
        return sendError(res, 500, "Unable to fetch table orders");
    }
};

// =====================================================
// GET ALL ORDERS
// =====================================================

const getAllRestaurantOrders = async (req, res) => {
    try {
        if (
            !["admin", "manager", "kitchen", "accountant"].includes(
                req.user?.role
            )
        ) {
            return sendError(res, 403, "Not allowed to view all orders");
        }

        const filter = { billGenerated: { $ne: true } };

        if (req.query.status) {
            if (!VALID_ORDER_STATUSES.includes(req.query.status)) {
                return sendError(res, 400, "Invalid order status");
            }
            filter.orderStatus = req.query.status;
        }

        const orders = await populateOrder(
            RestaurantOrder.find(filter).sort({ createdAt: -1 })
        );

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get All Restaurant Orders Error:", error);
        return sendError(res, 500, "Unable to fetch restaurant orders");
    }
};

// =====================================================
// GET SINGLE ORDER
// =====================================================

const getRestaurantOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid restaurant order ID");
        }

        const role = req.user?.role;
        const isCustomer = ["customer", "user"].includes(role);

        const query = RestaurantOrder.findById(id);

        if (isCustomer) query.select("+deliveryOtpEncrypted");

        const order = await query;

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        const isOwner =
            String(order.customer || "") === String(req.user?._id || "");

        const isAssignedDeliveryBoy =
            role === "delivery_boy" &&
            String(order.deliveryBoy || "") === String(req.user?._id || "");

        if (
            !canManageOrder(req, order) &&
            !isOwner &&
            !isAssignedDeliveryBoy
        ) {
            return sendError(res, 403, "Not allowed to view this order");
        }

        const populatedOrder = await populateOrder(
            RestaurantOrder.findById(id)
        );

        const data = populatedOrder.toObject();

        // Never expose OTP to staff or delivery boy through this endpoint.
        if (isCustomer && isOwner && order.deliveryOtpEncrypted) {
            if (
                !order.deliveryOtpVerifiedAt &&
                order.deliveryOtpExpiresAt > new Date()
            ) {
                data.deliveryOtp = decryptDeliveryOtp(
                    order.deliveryOtpEncrypted
                );
            }
        }

        delete data.deliveryOtpEncrypted;

        return res.status(200).json({ success: true, order: data });
    } catch (error) {
        console.error("Get Restaurant Order Error:", error);
        return sendError(res, 500, "Unable to fetch restaurant order");
    }
};

// =====================================================
// ADD ITEMS
// =====================================================

const addItemsToRestaurantOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid restaurant order ID");
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        if (!canManageOrder(req, order)) {
            return sendError(res, 403, "Not allowed to update this order");
        }

        if (
            ["served", "delivered", "cancelled"].includes(order.orderStatus)
        ) {
            return sendError(res, 400, "This order is already closed");
        }

        const itemResult = await processItems(req.body?.items);

        if (itemResult.error) {
            return sendError(res, itemResult.status, itemResult.error);
        }

        const combinedItems = [
            ...order.items,
            ...itemResult.processed,
        ];

        if (
            combinedItems.some((item) => item.servingType === "dine-in") &&
            !order.table
        ) {
            return sendError(
                res,
                400,
                "A table is required for dine-in items"
            );
        }

        if (
            order.orderType === "delivery" &&
            itemResult.processed.some(
                (item) => item.servingType === "dine-in"
            )
        ) {
            return sendError(
                res,
                400,
                "Dine-in items cannot be added to delivery orders"
            );
        }

        order.items.push(...itemResult.processed);

        if (order.table) {
            order.orderType = "dine-in";
        } else if (order.orderType !== "delivery") {
            order.orderType = "takeaway";
        }

        recalculateOrder(order);
        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Items added successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Add Items Error:", error);
        return sendError(res, 500, "Unable to add items to order");
    }
};

// =====================================================
// UPDATE ORDER
// =====================================================

const updateRestaurantOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid restaurant order ID");
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        if (!canManageOrder(req, order)) {
            return sendError(res, 403, "Not allowed to update this order");
        }

        if (
            ["served", "delivered", "cancelled"].includes(order.orderStatus)
        ) {
            return sendError(res, 400, "Closed orders cannot be edited");
        }

        if (req.body?.items !== undefined) {
            if (req.user?.role !== "admin") {
                return sendError(
                    res,
                    403,
                    "Only admin can replace order items"
                );
            }

            if (!["pending", "confirmed"].includes(order.orderStatus)) {
                return sendError(
                    res,
                    400,
                    "Items can only be edited while pending or confirmed"
                );
            }

            const itemResult = await processItems(req.body.items);

            if (itemResult.error) {
                return sendError(res, itemResult.status, itemResult.error);
            }

            if (
                itemResult.processed.some(
                    (item) => item.servingType === "dine-in"
                ) &&
                !order.table
            ) {
                return sendError(res, 400, "A table is required for dine-in");
            }

            order.items = itemResult.processed;
        }

        if (req.body?.notes !== undefined) {
            order.notes = String(req.body.notes || "").trim();
        }

        recalculateOrder(order);
        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Restaurant order updated",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Restaurant Order Error:", error);
        return sendError(res, 500, "Unable to update restaurant order");
    }
};

// =====================================================
// UPDATE ORDER STATUS
// =====================================================

const updateRestaurantOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const orderStatus = req.body?.orderStatus || req.body?.status;

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid restaurant order ID");
        }

        if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
            return sendError(res, 400, "Invalid order status");
        }

        // Delivered status must only be set by OTP verification.
        if (orderStatus === "delivered") {
            return sendError(
                res,
                403,
                "Delivery must be completed using OTP verification"
            );
        }

        if (orderStatus === "out_for_delivery") {
            return sendError(
                res,
                403,
                "Use delivery assignment/start-delivery flow"
            );
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        const role = req.user?.role;

        if (role === "waiter") {
            if (!canManageOrder(req, order)) {
                return sendError(res, 403, "Not assigned to this order");
            }

            if (
                order.orderStatus !== "ready" ||
                orderStatus !== "served"
            ) {
                return sendError(
                    res,
                    403,
                    "Waiters can only mark ready orders as served"
                );
            }
        } else if (!["admin", "manager", "kitchen"].includes(role)) {
            return sendError(res, 403, "Not allowed to change order status");
        }

        if (
            ["cancelled", "served", "delivered"].includes(order.orderStatus)
        ) {
            return sendError(res, 400, "This order is already closed");
        }

        order.orderStatus = orderStatus;
        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Order status updated",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Order Status Error:", error);
        return sendError(res, 500, "Unable to update order status");
    }
};

// =====================================================
// REMOVE ORDER ITEM
// =====================================================

const removeRestaurantOrderItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        if (req.user?.role !== "admin") {
            return sendError(res, 403, "Only admin can remove order items");
        }

        if (!isValidId(id) || !isValidId(itemId)) {
            return sendError(res, 400, "Invalid order or item ID");
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        if (!["pending", "confirmed"].includes(order.orderStatus)) {
            return sendError(
                res,
                400,
                "Items can only be removed from pending or confirmed orders"
            );
        }

        const index = order.items.findIndex(
            (item) => String(item._id) === String(itemId)
        );

        if (index === -1) {
            return sendError(res, 404, "Order item not found");
        }

        if (order.items.length === 1) {
            return sendError(
                res,
                400,
                "Cannot remove the last item; cancel the order instead"
            );
        }

        order.items.splice(index, 1);
        recalculateOrder(order);
        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Order item removed",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Remove Order Item Error:", error);
        return sendError(res, 500, "Unable to remove order item");
    }
};

// =====================================================
// UPDATE PAYMENT
// =====================================================

const updateRestaurantOrderPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, paymentMethod } = req.body || {};

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid restaurant order ID");
        }

        if (!["unpaid", "partially_paid", "paid"].includes(paymentStatus)) {
            return sendError(res, 400, "Invalid payment status");
        }

        if (
            paymentMethod !== undefined &&
            !VALID_PAYMENT_METHODS.includes(paymentMethod)
        ) {
            return sendError(res, 400, "Invalid payment method");
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        if (!["admin", "manager", "accountant"].includes(req.user?.role)) {
            return sendError(res, 403, "Not allowed to update payment");
        }

        order.paymentStatus = paymentStatus;

        if (paymentMethod) {
            order.paymentMethod = paymentMethod;
        }

        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Payment updated",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Payment Error:", error);
        return sendError(res, 500, "Unable to update payment");
    }
};

// =====================================================
// ASSIGN DELIVERY BOY
// PATCH /api/restaurant-orders/:id/assign-delivery
// =====================================================

const assignDeliveryBoy = async (req, res) => {
    try {
        if (!["admin", "manager"].includes(req.user?.role)) {
            return sendError(res, 403, "Only admin or manager can assign delivery");
        }

        const { id } = req.params;
        const { deliveryBoyId } = req.body || {};

        if (!isValidId(id) || !isValidId(deliveryBoyId)) {
            return sendError(res, 400, "Invalid order ID or delivery boy ID");
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(res, 404, "Restaurant order not found");
        }

        if (order.orderType !== "delivery") {
            return sendError(res, 400, "Only delivery orders can be assigned");
        }

        if (
            ["cancelled", "delivered"].includes(order.orderStatus)
        ) {
            return sendError(res, 400, "This order cannot be assigned");
        }

        const deliveryBoy = await User.findOne({
            _id: deliveryBoyId,
            role: "delivery_boy",
            isActive: true,
        }).select("name email phone");

        if (!deliveryBoy) {
            return sendError(res, 404, "Active delivery boy not found");
        }

        order.deliveryBoy = deliveryBoy._id;
        order.deliveryAssignedAt = new Date();

        if (order.orderStatus === "ready") {
            order.orderStatus = "out_for_delivery";
        }

        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Delivery boy assigned successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Assign Delivery Boy Error:", error);
        return sendError(res, 500, "Unable to assign delivery boy");
    }
};

// =====================================================
// GET ASSIGNED ORDERS FOR DELIVERY BOY
// GET /api/delivery/my-orders
// =====================================================

const getMyDeliveryOrders = async (req, res) => {
    try {
        if (req.user?.role !== "delivery_boy") {
            return sendError(res, 403, "Delivery boy access required");
        }

        const orders = await RestaurantOrder.find({
  deliveryBoy: req.user._id,
  orderType: "delivery",
  orderStatus: { $in: ["ready", "out_for_delivery"] },
})
  .populate("customer", "name phone")
  .populate("deliveryBoy", "name phone")
  .populate("items.food", "name price")
  .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get Delivery Orders Error:", error);
        return sendError(res, 500, "Unable to fetch assigned orders");
    }
};

// =====================================================
// VERIFY DELIVERY OTP
// POST /api/delivery/:id/verify-otp
// =====================================================

const verifyDeliveryOtp = async (req, res) => {
    try {
        if (req.user?.role !== "delivery_boy") {
            return sendError(res, 403, "Delivery boy access required");
        }

        const { id } = req.params;
        const otp = String(req.body?.otp || "").trim();

        if (!isValidId(id)) {
            return sendError(res, 400, "Invalid order ID");
        }

        if (!/^\d{4}$/.test(otp)) {
            return sendError(res, 400, "Enter a valid 4-digit OTP");
        }

        // Atomically increment attempts to reduce concurrent brute-force attempts.
        const order = await RestaurantOrder.findOneAndUpdate(
            {
                _id: id,
                deliveryBoy: req.user._id,
                orderType: "delivery",
                orderStatus: { $in: ["ready", "out_for_delivery"] },
                deliveryOtpVerifiedAt: null,
                deliveryOtpExpiresAt: { $gt: new Date() },
                deliveryOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
            },
            { $inc: { deliveryOtpAttempts: 1 } },
            { new: true }
        ).select("+deliveryOtpEncrypted");

        if (!order) {
            return sendError(
                res,
                400,
                "Order is not assigned to you, OTP expired, or attempts exceeded"
            );
        }

        if (!order.deliveryOtpEncrypted) {
            return sendError(res, 400, "Delivery OTP is unavailable");
        }

        const correctOtp = decryptDeliveryOtp(
            order.deliveryOtpEncrypted
        );

        const otpMatches = crypto.timingSafeEqual(
            Buffer.from(otp),
            Buffer.from(correctOtp)
        );

        if (!otpMatches) {
            return sendError(res, 400, "Incorrect OTP");
        }

        order.deliveryOtpVerifiedAt = new Date();
        order.orderStatus = "delivered";
        order.deliveredAt = new Date();

        // Remove the encrypted OTP after successful verification.
        order.deliveryOtpEncrypted = null;
        await order.save();

        const customer = order.customer
            ? await User.findById(order.customer).select("name email phone")
            : null;

        let emailSent = false;

        if (customer?.email) {
            try {
                await sendDeliveryConfirmationEmail(order, customer);
                emailSent = true;
            } catch (emailError) {
                console.error(
                    "Delivery confirmation email failed:",
                    emailError.message
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified. Order marked as delivered.",
            emailSent,
            orderId: order._id,
            orderStatus: order.orderStatus,
            deliveredAt: order.deliveredAt,
        });
    } catch (error) {
        console.error("Verify Delivery OTP Error:", error);
        return sendError(res, 500, "Unable to verify delivery OTP");
    }
};

module.exports = {
    createRestaurantOrder,
    getMyRestaurantOrders,
    getTableOrders,
    getAllRestaurantOrders,
    getRestaurantOrderById,
    addItemsToRestaurantOrder,
    updateRestaurantOrder,
    updateRestaurantOrderStatus,
    updateRestaurantOrderPayment,
    removeRestaurantOrderItem,
    getRestaurantOrderHistory,

    assignDeliveryBoy,
    getMyDeliveryOrders,
    verifyDeliveryOtp,
};

