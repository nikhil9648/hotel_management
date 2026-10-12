import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-orange-100 text-orange-800",
    ready: "bg-green-100 text-green-800",
    served: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
};

const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

const getFoodPrice = (food) => {
    const price = Number(food.price || 0);
    const discount = Number(food.discountPrice || 0);

    return discount > 0 && discount < price ? discount : price;
};

const getTableNumber = (order) =>
    order.table?.tableNumber ??
    order.table?.number ??
    (order.table ? "Assigned" : "No table");

export default function WaiterOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [foods, setFoods] = useState([]);
    const [foodLoading, setFoodLoading] = useState(false);
    const [foodSearch, setFoodSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [cart, setCart] = useState([]);
    const [savingItems, setSavingItems] = useState(false);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const token = localStorage.getItem("token");

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}` }),
        [token]
    );

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get(
                `${API}/restaurant-orders/my-orders`,
                { headers }
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Unable to load orders."
                );
            }

            setOrders(response.data.orders || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to load orders."
            );
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const openAddItems = async (order) => {
        setSelectedOrder(order);
        setCart([]);
        setFoodSearch("");
        setCategory("All");
        setActionError("");
        setActionSuccess("");
        setFoodLoading(true);

        try {
            const response = await axios.get(
                `${API}/menu/foods?isAvailable=true`,
                { headers }
            );

            setFoods(response.data.foodItems || []);
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                "Unable to load the menu."
            );
        } finally {
            setFoodLoading(false);
        }
    };

    const closeAddItems = () => {
        if (savingItems) return;

        setSelectedOrder(null);
        setCart([]);
        setActionError("");
        setActionSuccess("");
    };

    const addFood = (food) => {
        setActionError("");
        setActionSuccess("");

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
                    price: getFoodPrice(food),
                    quantity: 1,
                    servingType: "dine-in",
                    specialInstructions: "",
                },
            ];
        });
    };

    const changeQuantity = (foodId, amount) => {
        setCart((current) =>
            current
                .map((item) =>
                    item.food === foodId
                        ? {
                            ...item,
                            quantity: item.quantity + amount,
                        }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
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

    const addItemsToExistingOrder = async (event) => {
        event.preventDefault();

        if (!selectedOrder || cart.length === 0) {
            setActionError("Please add at least one food item.");
            return;
        }

        setSavingItems(true);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await axios.post(
    `${API}/restaurant-orders`,
    {
        table: selectedOrder.table?._id,
        orderType: "dine-in",
        paymentMethod: "pending",
        parentOrder: selectedOrder._id,
        notes: `Additional items for order ${
            selectedOrder.orderNumber || selectedOrder._id
        }`,
        items: cart.map((item) => ({
            food: item.food,
            quantity: item.quantity,
            servingType: item.servingType,
            specialInstructions: item.specialInstructions,
        })),
    },
    { headers }
);

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Unable to add items."
                );
            }

            const updatedOrder = response.data.order;

            if (updatedOrder) {
                setOrders((current) =>
                    current.map((order) =>
                        order._id === updatedOrder._id
                            ? updatedOrder
                            : order
                    )
                );
            }

            setActionSuccess(
                response.data.message ||
                "Items added to the existing order successfully."
            );
            setCart([]);
            setSelectedOrder(null);
            await fetchOrders();
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                err.message ||
                "Unable to add items to the order."
            );
        } finally {
            setSavingItems(false);
        }
    };

    const categories = [
        "All",
        ...new Set(
            foods
                .map((food) =>
                    typeof food.category === "object"
                        ? food.category?.name
                        : ""
                )
                .filter(Boolean)
        ),
    ];

    const filteredFoods = foods.filter((food) => {
        const nameMatches = food.name
            ?.toLowerCase()
            .includes(foodSearch.toLowerCase());

        const categoryName =
            typeof food.category === "object"
                ? food.category?.name
                : "";

        return (
            nameMatches &&
            (category === "All" || categoryName === category) &&
            food.isAvailable !== false
        );
    });

    const cartSubtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const filteredOrders = orders.filter((order) => {
        const status = String(order.orderStatus || "").toLowerCase();

        if (filter === "active") {
            return ["pending", "confirmed", "preparing"].includes(status);
        }

        if (filter === "ready") return status === "ready";
        if (filter === "served") return status === "served";

        return true;
    });

    const readyCount = orders.filter(
        (order) => order.orderStatus === "ready"
    ).length;

    const activeCount = orders.filter((order) =>
        ["pending", "confirmed", "preparing"].includes(order.orderStatus)
    ).length;


    const markAsServed = async (orderId) => {
        try {
            const token = localStorage.getItem("token");

            const response = await axios.put(
                `http://localhost:5000/api/restaurant-orders/${orderId}/status`,
                { orderStatus: "served" },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                alert("Order marked as served!");
                fetchOrders();
            }
        } catch (error) {
            console.error("Error marking order as served:", error);
            alert(
                error.response?.data?.message ||
                "Could not mark order as served"
            );
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        My Restaurant Orders
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Track kitchen progress and add items to existing orders.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchOrders}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Loading..." : "↻ Refresh"}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {actionSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                    {actionSuccess}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-slate-500">My Orders</p>
                    <p className="mt-2 text-3xl font-bold">
                        {loading ? "—" : orders.length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-slate-500">Active Orders</p>
                    <p className="mt-2 text-3xl font-bold text-orange-600">
                        {loading ? "—" : activeCount}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-slate-500">Ready to Serve</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {loading ? "—" : readyCount}
                    </p>
                </div>
            </div>

            <section className="rounded-xl border bg-white p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-slate-800">
                        Order History
                    </h2>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="rounded-lg border p-2"
                    >
                        <option value="all">All Orders</option>
                        <option value="active">Active Orders</option>
                        <option value="ready">Ready to Serve</option>
                        <option value="served">Served Orders</option>
                    </select>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-slate-500">
                        Loading your orders...
                    </p>
                ) : filteredOrders.length === 0 ? (
                    <p className="py-8 text-center text-slate-500">
                        No orders found for this filter.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => {
                            const status = String(
                                order.orderStatus || "pending"
                            ).toLowerCase();

                            const canAddItems =
                                order.paymentStatus !== "paid" &&
                                status !== "cancelled";

                            return (
                                <article
                                    key={order._id}
                                    className="rounded-xl border p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-slate-800">
                                                Order #
                                                {order.orderNumber ||
                                                    String(order._id)
                                                        .slice(-6)
                                                        .toUpperCase()}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Table: {getTableNumber(order)}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {formatDate(order.createdAt)}
                                            </p>
                                        </div>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[status] ||
                                                "bg-slate-100 text-slate-700"
                                                }`}
                                        >
                                            {status.replaceAll("_", " ")}
                                        </span>
                                    </div>

                                    <div className="mt-4 border-t pt-4">
                                        <h4 className="mb-2 text-sm font-semibold text-slate-700">
                                            Items
                                        </h4>

                                        <div className="space-y-3">
                                            {(order.items || []).map(
                                                (item, index) => (
                                                    <div
                                                        key={
                                                            item._id ||
                                                            `${order._id}-${index}`
                                                        }
                                                        className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-slate-700">
                                                                {item.name ||
                                                                    item.food?.name ||
                                                                    "Food item"}{" "}
                                                                × {item.quantity}
                                                            </p>

                                                            <span
                                                                className={`mt-1 inline-block rounded px-2 py-1 text-xs ${item.servingType ===
                                                                    "takeaway"
                                                                    ? "bg-amber-100 text-amber-800"
                                                                    : "bg-blue-100 text-blue-800"
                                                                    }`}
                                                            >
                                                                {item.servingType ===
                                                                    "takeaway"
                                                                    ? "Packed / Takeaway"
                                                                    : "Dine-in"}
                                                            </span>

                                                            {item.specialInstructions && (
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    Note:{" "}
                                                                    {item.specialInstructions}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <span className="font-medium text-slate-700">
                                                            {formatCurrency(
                                                                item.total ??
                                                                Number(
                                                                    item.price ||
                                                                    0
                                                                ) *
                                                                Number(
                                                                    item.quantity ||
                                                                    0
                                                                )
                                                            )}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {order.notes && (
                                            <p className="mt-3 text-sm text-slate-500">
                                                Notes: {order.notes}
                                            </p>
                                        )}

                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                                            <span className="text-sm text-slate-500">
                                                Payment:{" "}
                                                {String(
                                                    order.paymentStatus ||
                                                    "unpaid"
                                                ).replaceAll("_", " ")}
                                            </span>

                                            <span className="text-lg font-bold text-slate-800">
                                                {formatCurrency(
                                                    order.totalAmount
                                                )}
                                            </span>
                                        </div>

                                        {canAddItems && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openAddItems(order)
                                                }
                                                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 sm:w-auto"
                                            >
                                                + Add More Items
                                            </button>
                                        )}


                                        {status === "ready" && (
                                            <div className="mt-4 space-y-3">
                                                <div className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
                                                    ✓ Kitchen ne order ready mark kar diya hai.
                                                    Food customer ko serve kar do.
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => markAsServed(order._id)}
                                                    className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700"
                                                >
                                                    ✓ Mark as Served
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6">
                    <form
                        onSubmit={addItemsToExistingOrder}
                        className="my-4 w-full max-w-5xl rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Add More Items
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Existing order:{" "}
                                    {selectedOrder.orderNumber ||
                                        String(selectedOrder._id)
                                            .slice(-6)
                                            .toUpperCase()}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddItems}
                                disabled={savingItems}
                                className="rounded-lg border px-3 py-2 text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        {actionError && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {actionError}
                            </div>
                        )}

                        <div className="mt-5 grid gap-6 lg:grid-cols-5">
                            <div className="space-y-4 lg:col-span-3">
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <input
                                        value={foodSearch}
                                        onChange={(e) =>
                                            setFoodSearch(e.target.value)
                                        }
                                        placeholder="Search food..."
                                        className="w-full rounded-lg border px-3 py-2.5"
                                    />

                                    <select
                                        value={category}
                                        onChange={(e) =>
                                            setCategory(e.target.value)
                                        }
                                        className="rounded-lg border px-3 py-2.5"
                                    >
                                        {categories.map((item) => (
                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {foodLoading ? (
                                    <p className="py-8 text-center text-slate-500">
                                        Loading menu...
                                    </p>
                                ) : filteredFoods.length === 0 ? (
                                    <p className="py-8 text-center text-slate-500">
                                        No available food items found.
                                    </p>
                                ) : (
                                    <div className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                                        {filteredFoods.map((food) => (
                                            <div
                                                key={food._id}
                                                className="overflow-hidden rounded-xl border"
                                            >
                                                <div className="h-32 w-full overflow-hidden bg-slate-100">
                                                    {food.image ? (
                                                        <img
                                                            src={food.image}
                                                            alt={food.name}
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-4xl">
                                                            🍽️
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2 p-3">
                                                    <p className="font-semibold text-slate-800">
                                                        {food.name}
                                                    </p>

                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-bold">
                                                            {formatCurrency(
                                                                getFoodPrice(
                                                                    food
                                                                )
                                                            )}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                addFood(food)
                                                            }
                                                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 lg:col-span-2">
                                <h3 className="font-bold text-slate-800">
                                    New Items ({cart.length})
                                </h3>

                                {cart.length === 0 ? (
                                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                                        Select food from the menu to add it to
                                        this existing order.
                                    </p>
                                ) : (
                                    <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-1">
                                        {cart.map((item) => (
                                            <div
                                                key={item.food}
                                                className="space-y-3 rounded-lg border p-3"
                                            >
                                                <div className="flex justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-sm text-slate-500">
                                                            {formatCurrency(
                                                                item.price
                                                            )}{" "}
                                                            each
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCart(
                                                                (current) =>
                                                                    current.filter(
                                                                        (x) =>
                                                                            x.food !==
                                                                            item.food
                                                                    )
                                                            )
                                                        }
                                                        className="text-sm text-red-600"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                changeQuantity(
                                                                    item.food,
                                                                    -1
                                                                )
                                                            }
                                                            className="h-8 w-8 rounded border"
                                                        >
                                                            −
                                                        </button>

                                                        <span>
                                                            {item.quantity}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                changeQuantity(
                                                                    item.food,
                                                                    1
                                                                )
                                                            }
                                                            className="h-8 w-8 rounded border"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <span className="font-semibold">
                                                        {formatCurrency(
                                                            item.price *
                                                            item.quantity
                                                        )}
                                                    </span>
                                                </div>

                                                <div>
                                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                                        Serving Type
                                                    </label>

                                                    <select
                                                        value={
                                                            item.servingType
                                                        }
                                                        onChange={(e) =>
                                                            updateCartItem(
                                                                item.food,
                                                                "servingType",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full rounded-lg border px-3 py-2"
                                                    >
                                                        <option value="dine-in">
                                                            Dine-in
                                                        </option>
                                                        <option value="takeaway">
                                                            Packed / Takeaway
                                                        </option>
                                                    </select>
                                                </div>

                                                <input
                                                    value={
                                                        item.specialInstructions
                                                    }
                                                    onChange={(e) =>
                                                        updateCartItem(
                                                            item.food,
                                                            "specialInstructions",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Special instructions (optional)"
                                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <div className="flex justify-between font-bold">
                                        <span>New items subtotal</span>
                                        <span>
                                            {formatCurrency(cartSubtotal)}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-xs text-slate-500">
                                        The backend recalculates the complete
                                        order total, including tax, after
                                        adding these items.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        savingItems ||
                                        foodLoading ||
                                        cart.length === 0
                                    }
                                    className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {savingItems
                                        ? "Adding Items..."
                                        : "Add to Existing Order"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

