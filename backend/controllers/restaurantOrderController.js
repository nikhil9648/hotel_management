
const mongoose = require("mongoose");
const RestaurantOrder = require("../models/RestaurantOrder");
const RestaurantTable = require("../models/RestaurantTable");
const FoodItem = require("../models/FoodItem");

const TAX_RATE = 0.18;

const VALID_ORDER_TYPES = ["dine-in", "takeaway", "delivery"];
const VALID_PAYMENT_METHODS = ["cash", "card", "upi", "razorpay", "pending"];
const VALID_ORDER_STATUSES = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "served",
    "cancelled",
];
const VALID_SERVING_TYPES = ["dine-in", "takeaway"];

const roundMoney = (amount) =>
    Math.round(Number(amount) * 100) / 100;

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
        .populate("items.food", "name price discountPrice foodType image");

const sendError = (res, status, message) =>
    res.status(status).json({
        success: false,
        message,
    });

const recalculateOrder = (order) => {
    const subtotal = roundMoney(
        order.items.reduce(
            (sum, item) =>
                sum + roundMoney(item.price * item.quantity),
            0
        )
    );

    order.items.forEach((item) => {
        item.total = roundMoney(item.price * item.quantity);
    });

    order.subtotal = subtotal;
    order.taxAmount = roundMoney(subtotal * TAX_RATE);
    order.totalAmount = roundMoney(subtotal + order.taxAmount);
};

const isValidId = (id) =>
    mongoose.Types.ObjectId.isValid(id);

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
            return {
                error: "Invalid table ID",
                status: 400,
            };
        }

        const tableData = await RestaurantTable.findById(table);

        if (!tableData) {
            return {
                error: "Restaurant table not found",
                status: 404,
            };
        }

        return { tableData };
    }

    if (tableNumber !== undefined && tableNumber !== "") {
        const tableData = await RestaurantTable.findOne({
            tableNumber: String(tableNumber).trim(),
        });

        if (!tableData) {
            return {
                error: "Restaurant table not found",
                status: 404,
            };
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
                error: "Invalid serving type for food item",
                status: 400,
            };
        }

        const food = await FoodItem.findById(foodId);

        if (!food) {
            return {
                error: "Food item not found",
                status: 404,
            };
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
            paymentMethod = "cash",
            notes = "",
            parentOrder,
        } = req.body || {};

        // Validate customer details
        if (
            typeof customerName !== "string" ||
            !customerName.trim()
        ) {
            return sendError(
                res,
                400,
                "Customer name is required"
            );
        }

        if (
            typeof customerMobile !== "string" &&
            typeof customerMobile !== "number"
        ) {
            return sendError(
                res,
                400,
                "Customer mobile number is required"
            );
        }

        const normalizedMobile = String(customerMobile).trim();

        if (!normalizedMobile) {
            return sendError(
                res,
                400,
                "Customer mobile number is required"
            );
        }

        if (normalizedMobile.length > 20) {
            return sendError(
                res,
                400,
                "Customer mobile number cannot exceed 20 characters"
            );
        }

        if (
            paymentMethod !== "pending" &&
            !VALID_PAYMENT_METHODS.includes(paymentMethod)
        ) {
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
                return sendError(
                    res,
                    400,
                    "Invalid original order ID"
                );
            }

            originalOrder = await RestaurantOrder.findById(parentOrder);

            if (!originalOrder) {
                return sendError(
                    res,
                    404,
                    "Original order not found"
                );
            }

            if (!canManageOrder(req, originalOrder)) {
                return sendError(
                    res,
                    403,
                    "You are not allowed to add items for this order"
                );
            }

            if (originalOrder.paymentStatus === "paid") {
                return sendError(
                    res,
                    400,
                    "Cannot add items because this order is already paid"
                );
            }

            if (!originalOrder.table) {
                return sendError(
                    res,
                    400,
                    "Original order has no table assigned"
                );
            }
        }

        const resolvedOrderType =
            orderType ||
            (
                table ||
                tableNumber ||
                orderItems.some(
                    (item) => item.servingType === "dine-in"
                )
                    ? "dine-in"
                    : "takeaway"
            );

        if (
            resolvedOrderType === "delivery" &&
            !String(deliveryAddress).trim()
        ) {
            return sendError(
                res,
                400,
                "Delivery address is required"
            );
        }

        let tableData = null;

        const hasDineInItems = orderItems.some(
            (item) => item.servingType === "dine-in"
        );

        if (
            resolvedOrderType === "dine-in" ||
            hasDineInItems
        ) {
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

            if (!tableData) {
                return sendError(
                    res,
                    400,
                    "A table is required for dine-in items"
                );
            }

            if (tableData.isActive === false) {
                return sendError(
                    res,
                    400,
                    "This table is inactive"
                );
            }
        }

        if (
            resolvedOrderType === "takeaway" &&
            hasDineInItems
        ) {
            return sendError(
                res,
                400,
                "A takeaway-only order cannot contain dine-in items"
            );
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
            originalOrder &&
            String(tableData?._id || "") !==
                String(originalOrder.table)
        ) {
            return sendError(
                res,
                400,
                "Additional items must use the original table"
            );
        }

        const order = new RestaurantOrder({
            // Customer details saved directly in MongoDB
            customerName: customerName.trim(),
            customerMobile: normalizedMobile,

            customer: req.user?._id || null,
            table: tableData?._id || null,
            waiter:
                req.user?.role === "waiter"
                    ? req.user._id
                    : null,
            parentOrder: originalOrder?._id || null,
            orderType: resolvedOrderType,
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

        recalculateOrder(order);

        // Mongoose timestamps automatically sets createdAt and updatedAt.
        await order.save();

        if (tableData) {
            tableData.status = "occupied";
            await tableData.save();
        }

        const populatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(201).json({
            success: true,
            message: "Restaurant order created successfully",
            order: populatedOrder,
        });
    } catch (error) {
        console.error("Create Restaurant Order Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create restaurant order",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

// =====================================================
// GET MY ORDERS
// =====================================================

const getMyRestaurantOrders = async (req, res) => {
    try {
        const role = req.user?.role;
        let filter = {};

        if (["customer", "user"].includes(role)) {
            filter.customer = req.user._id;
        } else if (role === "waiter") {
    filter.waiter = req.user._id;
    filter.orderType = { $ne: "delivery" };
}
        else if (
            !["admin", "manager", "kitchen", "accountant"].includes(role)
        ) {
            return sendError(
                res,
                403,
                "You are not allowed to view these orders"
            );
        }

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
        console.error("Get My Restaurant Orders Error:", error);

        return sendError(
            res,
            500,
            "Unable to fetch restaurant orders"
        );
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

        return sendError(
            res,
            500,
            "Unable to fetch table orders"
        );
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
            return sendError(
                res,
                403,
                "You are not allowed to view all orders"
            );
        }

        const filter = {};

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

        return sendError(
            res,
            500,
            "Unable to fetch restaurant orders"
        );
    }
};

// =====================================================
// GET SINGLE ORDER
// =====================================================

const getRestaurantOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return sendError(
                res,
                400,
                "Invalid restaurant order ID"
            );
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(
                res,
                404,
                "Restaurant order not found"
            );
        }

        if (
            !canManageOrder(req, order) &&
            String(order.customer || "") !== String(req.user?._id || "")
        ) {
            return sendError(
                res,
                403,
                "You are not allowed to view this order"
            );
        }

        const populatedOrder = await populateOrder(
            RestaurantOrder.findById(id)
        );

        return res.status(200).json({
            success: true,
            order: populatedOrder,
        });
    } catch (error) {
        console.error("Get Restaurant Order Error:", error);

        return sendError(
            res,
            500,
            "Unable to fetch restaurant order"
        );
    }
};

// =====================================================
// ADD ITEMS TO AN EXISTING ORDER
// PUT /api/restaurant-orders/:id/items
// =====================================================

const addItemsToRestaurantOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return sendError(
                res,
                400,
                "Invalid restaurant order ID"
            );
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(
                res,
                404,
                "Restaurant order not found"
            );
        }

        if (!canManageOrder(req, order)) {
            return sendError(
                res,
                403,
                "You are not allowed to update this order"
            );
        }

        if (["served", "cancelled"].includes(order.orderStatus)) {
            return sendError(
                res,
                400,
                "Items cannot be added to a served or cancelled order"
            );
        }

        const itemResult = await processItems(req.body?.items);

        if (itemResult.error) {
            return sendError(
                res,
                itemResult.status,
                itemResult.error
            );
        }

        const addedItems = itemResult.processed;
        const combinedItems = [...order.items, ...addedItems];

        const hasDineInItems = combinedItems.some(
            (item) => item.servingType === "dine-in"
        );

        if (hasDineInItems && !order.table) {
            return sendError(
                res,
                400,
                "This order needs a table before adding dine-in items"
            );
        }

        if (
            order.orderType === "delivery" &&
            addedItems.some(
                (item) => item.servingType === "dine-in"
            )
        ) {
            return sendError(
                res,
                400,
                "Dine-in items cannot be added to a delivery order"
            );
        }

        order.items.push(...addedItems);

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
            message: "Items added to order successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Add Items Error:", error);

        return sendError(
            res,
            500,
            "Unable to add items to order"
        );
    }
};

// =====================================================
// UPDATE EXISTING ORDER
// PUT /api/restaurant-orders/:id
// =====================================================

const updateRestaurantOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return sendError(
                res,
                400,
                "Invalid restaurant order ID"
            );
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(
                res,
                404,
                "Restaurant order not found"
            );
        }

        if (!canManageOrder(req, order)) {
            return sendError(
                res,
                403,
                "You are not allowed to update this order"
            );
        }

        if (["served", "cancelled"].includes(order.orderStatus)) {
            return sendError(
                res,
                400,
                "Served or cancelled orders cannot be edited"
            );
        }

        if (req.body?.items !== undefined) {
            if (req.user?.role !== "admin") {
                return sendError(
                    res,
                    403,
                    "Only admin can replace or remove order items. Use Add More Items to add items."
                );
            }

            if (!["pending", "confirmed"].includes(order.orderStatus)) {
                return sendError(
                    res,
                    400,
                    "Order items can only be edited while pending or confirmed"
                );
            }

            const itemResult = await processItems(req.body.items);

            if (itemResult.error) {
                return sendError(
                    res,
                    itemResult.status,
                    itemResult.error
                );
            }

            if (
                itemResult.processed.some(
                    (item) => item.servingType === "dine-in"
                ) &&
                !order.table
            ) {
                return sendError(
                    res,
                    400,
                    "A table is required for dine-in items"
                );
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
            message: "Restaurant order updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Restaurant Order Error:", error);

        return sendError(
            res,
            500,
            "Unable to update restaurant order"
        );
    }
};

// =====================================================
// UPDATE ORDER STATUS
// =====================================================

const updateRestaurantOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body || {};

        if (!isValidId(id)) {
            return sendError(
                res,
                400,
                "Invalid restaurant order ID"
            );
        }

        if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
            return sendError(res, 400, "Invalid order status");
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(
                res,
                404,
                "Restaurant order not found"
            );
        }

        const role = req.user?.role;

        if (role === "waiter") {
            if (!canManageOrder(req, order)) {
                return sendError(
                    res,
                    403,
                    "You are not assigned to this order"
                );
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
            return sendError(
                res,
                403,
                "You are not allowed to change order status"
            );
        }

        if (["cancelled", "served"].includes(order.orderStatus)) {
            return sendError(
                res,
                400,
                "This order is already closed"
            );
        }

        order.orderStatus = orderStatus;
        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: "Restaurant order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Order Status Error:", error);

        return sendError(
            res,
            500,
            "Unable to update restaurant order status"
        );
    }
};

// =====================================================
// REMOVE ORDER ITEM
// =====================================================

const removeRestaurantOrderItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        if (req.user?.role !== "admin") {
            return sendError(
                res,
                403,
                "Only admin can remove order items"
            );
        }

        if (!isValidId(id) || !isValidId(itemId)) {
            return sendError(
                res,
                400,
                "Invalid order ID or item ID"
            );
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(
                res,
                404,
                "Restaurant order not found"
            );
        }

        if (!["pending", "confirmed"].includes(order.orderStatus)) {
            return sendError(
                res,
                400,
                "Items can only be removed from pending or confirmed orders"
            );
        }

        const itemIndex = order.items.findIndex(
            (item) => String(item._id) === String(itemId)
        );

        if (itemIndex === -1) {
            return sendError(
                res,
                404,
                "Order item not found"
            );
        }

        if (order.items.length === 1) {
            return sendError(
                res,
                400,
                "Cannot remove the last item. Cancel the order if necessary."
            );
        }

        const removedItem = order.items[itemIndex];

        order.items.splice(itemIndex, 1);

        recalculateOrder(order);
        await order.save();

        const updatedOrder = await populateOrder(
            RestaurantOrder.findById(order._id)
        );

        return res.status(200).json({
            success: true,
            message: `${removedItem.name || "Item"} removed successfully`,
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Remove Restaurant Order Item Error:", error);

        return sendError(
            res,
            500,
            "Unable to remove order item"
        );
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
            return sendError(
                res,
                400,
                "Invalid restaurant order ID"
            );
        }

        if (!["unpaid", "partially_paid", "paid"].includes(paymentStatus)) {
            return sendError(
                res,
                400,
                "Invalid payment status"
            );
        }

        if (
            paymentMethod !== undefined &&
            !VALID_PAYMENT_METHODS.includes(paymentMethod)
        ) {
            return sendError(
                res,
                400,
                "Invalid payment method"
            );
        }

        const order = await RestaurantOrder.findById(id);

        if (!order) {
            return sendError(
                res,
                404,
                "Restaurant order not found"
            );
        }

        if (!["admin", "manager", "accountant"].includes(req.user?.role)) {
            return sendError(
                res,
                403,
                "You are not allowed to update payment"
            );
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
            message: "Restaurant order payment updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Restaurant Order Payment Error:", error);

        return sendError(
            res,
            500,
            "Unable to update restaurant order payment"
        );
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
};
