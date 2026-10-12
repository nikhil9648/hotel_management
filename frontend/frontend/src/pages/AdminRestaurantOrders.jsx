
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const ORDER_STATUSES = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "served",
    "cancelled",
];

const PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid"];

export default function AdminRestaurantOrders() {
    const [orders, setOrders] = useState([]);
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cart, setCart] = useState([]);
    const [foodSearch, setFoodSearch] = useState("");

    const token = localStorage.getItem("token");

    const authConfig = useMemo(
        () => ({
            headers: { Authorization: `Bearer ${token}` },
        }),
        [token]
    );

    const showError = (error, fallback) => {
        setErrorMessage(error.response?.data?.message || fallback);
        setMessage("");
    };

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await axios.get(
                `${API}/restaurant-orders/all`,
                authConfig
            );

            const data = response.data;
            const list = Array.isArray(data)
                ? data
                : data.orders ||
                  data.restaurantOrders ||
                  data.data ||
                  [];

            setOrders(Array.isArray(list) ? list : []);
        } catch (error) {
            showError(error, "Unable to load restaurant orders.");
        } finally {
            setLoading(false);
        }
    }, [authConfig]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const loadFoods = async () => {
        try {
            const response = await axios.get(
                `${API}/menu/foods?isAvailable=true`,
                authConfig
            );

            const data = response.data;
            const list = Array.isArray(data)
                ? data
                : data.foodItems || data.foods || data.data || [];

            setFoods(Array.isArray(list) ? list : []);
        } catch (error) {
            showError(error, "Unable to load food items.");
        }
    };

    const orderId = (order) => order._id || order.id;

    const getOrderNumber = (order) =>
        order.orderNumber || orderId(order);

    const getCustomerName = (order) =>
        order.customer?.name ||
        order.customerName ||
        "Walk-in customer";

    const getTableName = (order) =>
        order.table?.tableNumber ||
        order.table?.name ||
        order.tableNumber ||
        (order.orderType === "takeaway" ? "Takeaway" : "—");

    const filteredOrders = orders.filter((order) => {
        const query = search.toLowerCase();

        const matchesSearch =
            String(getOrderNumber(order)).toLowerCase().includes(query) ||
            getCustomerName(order).toLowerCase().includes(query) ||
            String(getTableName(order)).toLowerCase().includes(query);

        const matchesStatus =
            statusFilter === "all" ||
            order.orderStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const formatMoney = (amount) =>
        `₹${Number(amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const openAddItems = async (order) => {
        setSelectedOrder(order);
        setCart([]);
        setFoodSearch("");
        setMessage("");
        setErrorMessage("");
        await loadFoods();
    };

    const addFoodToCart = (food) => {
        setCart((current) => {
            const existing = current.find(
                (item) => item.food === food._id
            );

            if (existing) {
                return current.map((item) =>
                    item.food === food._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...current,
                {
                    food: food._id,
                    name: food.name,
                    price: Number(food.discountPrice || food.price || 0),
                    quantity: 1,
                    servingType: "dine-in",
                    specialInstructions: "",
                },
            ];
        });
    };

    const updateCartItem = (foodId, field, value) => {
        setCart((current) =>
            current.map((item) =>
                item.food === foodId
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    const removeCartItem = (foodId) => {
        setCart((current) =>
            current.filter((item) => item.food !== foodId)
        );
    };

    const submitAdditionalItems = async () => {
        if (!selectedOrder || cart.length === 0) {
            setErrorMessage("Please add at least one food item.");
            return;
        }

        try {
            setSaving(true);
            setMessage("");
            setErrorMessage("");

            await axios.put(
                `${API}/restaurant-orders/${orderId(selectedOrder)}/items`,
                {
                    items: cart.map((item) => ({
                        food: item.food,
                        quantity: Number(item.quantity),
                        servingType: item.servingType,
                        specialInstructions: item.specialInstructions,
                    })),
                },
                authConfig
            );

            setMessage("Items added to the order successfully.");
            setSelectedOrder(null);
            setCart([]);
            await loadOrders();
        } catch (error) {
            showError(error, "Unable to add items to this order.");
        } finally {
            setSaving(false);
        }
    };

    const removeOrderItem = async (order, item) => {
        if (!item._id) {
            setErrorMessage("This item has no ID, so it cannot be removed.");
            return;
        }

        if (
            !window.confirm(
                `Remove "${item.name || "this item"}" from order ${getOrderNumber(order)}?`
            )
        ) {
            return;
        }

        try {
            setErrorMessage("");
            setMessage("");

            await axios.delete(
                `${API}/restaurant-orders/${orderId(order)}/items/${item._id}`,
                authConfig
            );

            setMessage("Order item removed successfully.");
            await loadOrders();
        } catch (error) {
            showError(error, "Unable to remove this item.");
        }
    };

    const updateOrderField = async (order, endpoint, payload, successText) => {
        try {
            setErrorMessage("");
            setMessage("");

            await axios.put(
                `${API}/restaurant-orders/${orderId(order)}/${endpoint}`,
                payload,
                authConfig
            );

            setMessage(successText);
            await loadOrders();
        } catch (error) {
            showError(error, "Unable to update the order.");
        }
    };

    const filteredFoods = foods.filter((food) =>
        food.name?.toLowerCase().includes(foodSearch.toLowerCase())
    );

    const cartTotal = cart.reduce(
        (sum, item) => sum + item.price * Number(item.quantity || 0),
        0
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-xl bg-slate-900 p-6 text-white">
                <h1 className="text-2xl font-bold md:text-3xl">
                    Restaurant Orders Management
                </h1>
                <p className="mt-2 text-slate-300">
                    View orders, add food items, manage order status and payments.
                </p>
                <button
                    onClick={loadOrders}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700"
                >
                    ↻ Refresh Orders
                </button>
            </div>

            {message && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800">
                    {message}
                </div>
            )}

            {errorMessage && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">
                    {errorMessage}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="mt-2 text-3xl font-bold">{orders.length}</p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Active Orders</p>
                    <p className="mt-2 text-3xl font-bold">
                        {orders.filter((o) =>
                            ["pending", "confirmed", "preparing", "ready"].includes(
                                o.orderStatus
                            )
                        ).length}
                    </p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Paid Orders</p>
                    <p className="mt-2 text-3xl font-bold">
                        {orders.filter((o) => o.paymentStatus === "paid").length}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow md:flex-row">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order number, customer or table..."
                    className="min-w-0 flex-1 rounded-lg border p-3"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border p-3"
                >
                    <option value="all">All statuses</option>
                    {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {status.replace("_", " ").toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="rounded-xl bg-white p-8 text-center">
                    Loading restaurant orders...
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-gray-500">
                    No restaurant orders found.
                </div>
            ) : (
                <div className="space-y-5">
                    {filteredOrders.map((order) => (
                        <div
                            key={orderId(order)}
                            className="overflow-hidden rounded-xl border bg-white shadow-sm"
                        >
                            <div className="flex flex-col justify-between gap-4 border-b bg-gray-50 p-5 md:flex-row">
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Order #{getOrderNumber(order)}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Customer: {getCustomerName(order)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Table: {getTableName(order)} · Type:{" "}
                                        {order.orderType || "dine-in"}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {order.createdAt
                                            ? new Date(order.createdAt).toLocaleString()
                                            : ""}
                                    </p>
                                </div>

                                <div className="md:text-right">
                                    <p className="text-2xl font-bold">
                                        {formatMoney(order.totalAmount)}
                                    </p>
                                    <p className="text-sm">
                                        Payment: {order.paymentStatus || "unpaid"}
                                    </p>
                                    <p className="text-sm">
                                        Status: {order.orderStatus || "pending"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 p-5">
                                <h3 className="font-semibold">Order Items</h3>

                                {(order.items || []).map((item) => (
                                    <div
                                        key={item._id || `${item.food}-${item.name}`}
                                        className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {item.name || item.food?.name || "Food item"}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Qty: {item.quantity} ×{" "}
                                                {formatMoney(item.price)} ={" "}
                                                {formatMoney(
                                                    item.total ??
                                                        Number(item.price || 0) *
                                                            Number(item.quantity || 0)
                                                )}
                                            </p>
                                            {item.servingType && (
                                                <p className="text-xs text-gray-500">
                                                    {item.servingType}
                                                </p>
                                            )}
                                            {item.specialInstructions && (
                                                <p className="text-sm text-gray-500">
                                                    Note: {item.specialInstructions}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => removeOrderItem(order, item)}
                                            disabled={
                                                !["pending", "confirmed"].includes(
                                                    order.orderStatus
                                                ) || (order.items || []).length <= 1
                                            }
                                            title={
                                                (order.items || []).length <= 1
                                                    ? "The last item cannot be removed"
                                                    : "Remove item"
                                            }
                                            className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Remove Item
                                        </button>
                                    </div>
                                ))}

                                <div className="grid gap-3 border-t pt-4 md:grid-cols-2">
                                    <label className="text-sm font-medium">
                                        Order Status
                                        <select
                                            value={order.orderStatus || "pending"}
                                            onChange={(e) =>
                                                updateOrderField(
                                                    order,
                                                    "status",
                                                    { orderStatus: e.target.value },
                                                    "Order status updated."
                                                )
                                            }
                                            className="mt-1 block w-full rounded-lg border p-2"
                                        >
                                            {ORDER_STATUSES.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="text-sm font-medium">
                                        Payment Status
                                        <select
                                            value={order.paymentStatus || "unpaid"}
                                            onChange={(e) =>
                                                updateOrderField(
                                                    order,
                                                    "payment",
                                                    { paymentStatus: e.target.value },
                                                    "Payment status updated."
                                                )
                                            }
                                            className="mt-1 block w-full rounded-lg border p-2"
                                        >
                                            {PAYMENT_STATUSES.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.replace("_", " ").toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <button
                                    onClick={() => openAddItems(order)}
                                    disabled={["served", "cancelled"].includes(order.orderStatus)}
                                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    + Add More Items
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold">
                                    Add Items to Order #{getOrderNumber(selectedOrder)}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Select food, set quantity and add any special instructions.
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="rounded-lg bg-gray-100 px-3 py-2 hover:bg-gray-200"
                            >
                                ✕ Close
                            </button>
                        </div>

                        <input
                            value={foodSearch}
                            onChange={(e) => setFoodSearch(e.target.value)}
                            placeholder="Search food..."
                            className="mt-4 w-full rounded-lg border p-3"
                        />

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredFoods.map((food) => (
                                <div key={food._id} className="rounded-lg border p-3">
                                    {food.image && (
                                        <img
                                            src={food.image}
                                            alt={food.name}
                                            className="mb-3 h-32 w-full rounded-lg object-cover"
                                        />
                                    )}
                                    <h3 className="font-semibold">{food.name}</h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {formatMoney(food.discountPrice || food.price)}
                                    </p>
                                    <button
                                        onClick={() => addFoodToCart(food)}
                                        className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                                    >
                                        + Add to Selection
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 border-t pt-4">
                            <h3 className="text-lg font-bold">
                                Selected Items ({cart.length})
                            </h3>

                            {cart.length === 0 ? (
                                <p className="mt-2 text-sm text-gray-500">
                                    No additional items selected.
                                </p>
                            ) : (
                                <div className="mt-3 space-y-4">
                                    {cart.map((item) => (
                                        <div
                                            key={item.food}
                                            className="grid gap-3 rounded-lg border p-3 md:grid-cols-4"
                                        >
                                            <div>
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatMoney(item.price)} each
                                                </p>
                                            </div>

                                            <label className="text-sm">
                                                Quantity
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        updateCartItem(
                                                            item.food,
                                                            "quantity",
                                                            Math.max(1, Number(e.target.value) || 1)
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded border p-2"
                                                />
                                            </label>

                                            <label className="text-sm">
                                                Serving Type
                                                <select
                                                    value={item.servingType}
                                                    onChange={(e) =>
                                                        updateCartItem(
                                                            item.food,
                                                            "servingType",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded border p-2"
                                                >
                                                    <option value="dine-in">Dine-in</option>
                                                    <option value="takeaway">Packed / Takeaway</option>
                                                </select>
                                            </label>

                                            <div>
                                                <label className="text-sm">
                                                    Special Instructions
                                                    <input
                                                        value={item.specialInstructions}
                                                        onChange={(e) =>
                                                            updateCartItem(
                                                                item.food,
                                                                "specialInstructions",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Less spicy, etc."
                                                        className="mt-1 w-full rounded border p-2"
                                                    />
                                                </label>
                                                <button
                                                    onClick={() => removeCartItem(item.food)}
                                                    className="mt-2 text-sm font-medium text-red-600 hover:underline"
                                                >
                                                    Remove from selection
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
                                <p className="text-xl font-bold">
                                    Additional subtotal: {formatMoney(cartTotal)}
                                </p>
                                <button
                                    onClick={submitAdditionalItems}
                                    disabled={saving || cart.length === 0}
                                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Add Items to Order"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
