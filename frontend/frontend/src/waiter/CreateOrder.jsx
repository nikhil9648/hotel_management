
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const BACKEND_URL = "http://localhost:5000";

const getImageUrl = (image) => {
    if (!image || typeof image !== "string") return "";

    const value = image.trim();
    if (!value) return "";

    if (/^https?:\/\//i.test(value)) return value;

    const cleanPath = value.replace(/^\/+/, "");

    if (cleanPath.startsWith("uploads/")) {
        return `${BACKEND_URL}/${cleanPath}`;
    }

    if (cleanPath.startsWith("food-images/")) {
        return `${BACKEND_URL}/uploads/${cleanPath}`;
    }

    return `${BACKEND_URL}/uploads/food-images/${cleanPath}`;
};

export default function CreateOrder() {
    const [foods, setFoods] = useState([]);
    const [tables, setTables] = useState([]);
    const [cart, setCart] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [customerMobile, setCustomerMobile] = useState("");

    const [tableId, setTableId] = useState("");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [notes, setNotes] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [createdOrderNumber, setCreatedOrderNumber] = useState("");
    const [createdAt, setCreatedAt] = useState("");

    const token = localStorage.getItem("token");

    const headers = useMemo(
        () => ({
            Authorization: `Bearer ${token}`,
        }),
        [token]
    );

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const [foodResponse, tableResponse] = await Promise.all([
                axios.get(`${API}/menu/foods?isAvailable=true`, {
                    headers,
                }),
                axios.get(`${API}/tables`, {
                    headers,
                }),
            ]);

            setFoods(foodResponse.data.foodItems || []);

            setTables(
                Array.isArray(tableResponse.data)
                    ? tableResponse.data
                    : tableResponse.data.tables ||
                      tableResponse.data.data ||
                      []
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to load menu or tables. Check your backend and API routes."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Initial data load for this page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        const matchesSearch = food.name
            ?.toLowerCase()
            .includes(search.toLowerCase());

        const categoryName =
            typeof food.category === "object"
                ? food.category?.name
                : "";

        return (
            matchesSearch &&
            (category === "All" || categoryName === category) &&
            food.isAvailable !== false
        );
    });

    const availableTables = tables.filter(
        (table) =>
            table.isActive !== false &&
            !["occupied", "maintenance", "inactive"].includes(
                String(table.status || "").toLowerCase()
            )
    );

    const getPrice = (food) =>
        Number(food.discountPrice) > 0 &&
        Number(food.discountPrice) < Number(food.price)
            ? Number(food.discountPrice)
            : Number(food.price || 0);

    const addToCart = (food) => {
        setSuccess("");
        setCreatedOrderNumber("");
        setCreatedAt("");
        setError("");

        setCart((current) => {
            const existing = current.find(
                (item) => item.food === food._id
            );

            if (existing) {
                return current.map((item) =>
                    item.food === food._id
                        ? {
                              ...item,
                              quantity: item.quantity + 1,
                          }
                        : item
                );
            }

            return [
                ...current,
                {
                    food: food._id,
                    name: food.name,
                    price: getPrice(food),
                    quantity: 1,
                    specialInstructions: "",
                    servingType: "dine-in",
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

    const updateInstructions = (foodId, value) => {
        setCart((current) =>
            current.map((item) =>
                item.food === foodId
                    ? { ...item, specialInstructions: value }
                    : item
            )
        );
    };

    const updateServingType = (foodId, value) => {
        setCart((current) =>
            current.map((item) =>
                item.food === foodId
                    ? { ...item, servingType: value }
                    : item
            )
        );
    };

    const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    const placeOrder = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");
        setCreatedOrderNumber("");
        setCreatedAt("");

        if (!customerName.trim()) {
            setError("Please enter the customer name.");
            return;
        }

        if (!customerMobile.trim()) {
            setError("Please enter the customer mobile number.");
            return;
        }

        if (!tableId) {
            setError("Please select a table.");
            return;
        }

        if (cart.length === 0) {
            setError("Please add at least one food item.");
            return;
        }

        if (!token) {
            setError("Please login again. Your session token was not found.");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                customerName: customerName.trim(),
                customerMobile: customerMobile.trim(),
                table: tableId,
                orderType: "dine-in",
                paymentMethod: "pending",
                notes: notes.trim(),
                items: cart.map((item) => ({
                    food: item.food,
                    quantity: item.quantity,
                    specialInstructions: item.specialInstructions,
                    servingType: item.servingType || "dine-in",
                })),
            };

            const response = await axios.post(
                `${API}/restaurant-orders`,
                payload,
                { headers }
            );

            const order =
                response.data.order ||
                response.data.restaurantOrder ||
                response.data.data;

            setSuccess("Order created successfully!");
            setCreatedOrderNumber(
                order?.orderNumber || order?._id || "Order created"
            );

            if (order?.createdAt) {
                setCreatedAt(
                    new Date(order.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                    })
                );
            }

            setCart([]);
            setCustomerName("");
            setCustomerMobile("");
            setTableId("");
            setNotes("");

            // Refresh tables after the order is created.
            try {
                const tableResponse = await axios.get(`${API}/tables`, {
                    headers,
                });

                setTables(
                    Array.isArray(tableResponse.data)
                        ? tableResponse.data
                        : tableResponse.data.tables ||
                          tableResponse.data.data ||
                          []
                );
            } catch (refreshError) {
                console.error("Unable to refresh tables:", refreshError);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to create order. Please check your API and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-600">
                Loading menu and tables...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">
                    Create Restaurant Order
                </h1>
                <p className="mt-1 text-slate-500">
                    Enter customer details, select a table, and add food items.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
                >
                    <p className="font-semibold">{success}</p>
                    <p className="mt-1">
                        Order Number:{" "}
                        <span className="font-bold">
                            {createdOrderNumber}
                        </span>
                    </p>

                    {createdAt && (
                        <p className="mt-1">
                            Created At:{" "}
                            <span className="font-medium">{createdAt}</span>
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="space-y-4 xl:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search food..."
                            className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <select
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                            className="rounded-lg border bg-white px-4 py-3"
                        >
                            {categories.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    {filteredFoods.length === 0 ? (
                        <div className="rounded-xl bg-white p-8 text-center text-slate-500">
                            No available food items found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredFoods.map((food) => (
                                <div
                                    key={food._id}
                                    className="flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm"
                                >
                                    <div className="h-40 w-full shrink-0 overflow-hidden bg-slate-100">
                                        {getImageUrl(food.image) ? (
                                            <img
                                                src={getImageUrl(food.image)}
                                                alt={food.name}
                                                loading="lazy"
                                                className="h-full w-full object-cover"
                                                onError={(event) => {
                                                    console.error(
                                                        "Food image failed:",
                                                        getImageUrl(food.image)
                                                    );
                                                    event.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-5xl">
                                                🍽️
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                                        <div>
                                            <h3 className="line-clamp-2 min-h-12 font-semibold text-slate-800">
                                                {food.name}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {typeof food.category === "object"
                                                    ? food.category?.name
                                                    : "Food item"}
                                                {" · "}
                                                {food.foodType || "veg"}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-slate-800">
                                                ₹{getPrice(food).toFixed(2)}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => addToCart(food)}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <form
                    onSubmit={placeOrder}
                    className="h-fit space-y-5 rounded-xl border bg-white p-5 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">
                            Order Cart
                        </h2>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                            {cart.reduce(
                                (sum, item) => sum + item.quantity,
                                0
                            )}{" "}
                            items
                        </span>
                    </div>

                    {/* Customer details */}
                    <div className="space-y-4 rounded-lg bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-800">
                            Customer Details
                        </h3>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(event) =>
                                    setCustomerName(event.target.value)
                                }
                                placeholder="Enter customer name"
                                required
                                maxLength={100}
                                className="w-full rounded-lg border bg-white px-3 py-3"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Customer Mobile Number *
                            </label>
                            <input
                                type="tel"
                                value={customerMobile}
                                onChange={(event) =>
                                    setCustomerMobile(event.target.value)
                                }
                                placeholder="Enter mobile number"
                                required
                                maxLength={20}
                                className="w-full rounded-lg border bg-white px-3 py-3"
                            />
                        </div>
                    </div>

                    {/* Table selection */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Select Table *
                        </label>

                        <select
                            required
                            value={tableId}
                            onChange={(event) => setTableId(event.target.value)}
                            className="w-full rounded-lg border px-3 py-3"
                        >
                            <option value="">Choose available table</option>

                            {availableTables.map((table) => (
                                <option key={table._id} value={table._id}>
                                    Table{" "}
                                    {table.tableNumber ??
                                        table.number ??
                                        table.name}
                                    {" · Capacity: "}
                                    {table.capacity ?? table.seats ?? "N/A"}
                                </option>
                            ))}
                        </select>

                        {availableTables.length === 0 && (
                            <p className="mt-2 text-sm text-amber-700">
                                No available tables. Check table status or refresh the page.
                            </p>
                        )}
                    </div>

                    {/* Cart items */}
                    <div className="max-h-96 space-y-4 overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                                Your cart is empty. Add food from the menu.
                            </p>
                        ) : (
                            cart.map((item) => (
                                <div
                                    key={item.food}
                                    className="border-b pb-4 last:border-0"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                ₹{item.price.toFixed(2)} each
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCart((current) =>
                                                    current.filter(
                                                        (entry) =>
                                                            entry.food !== item.food
                                                    )
                                                )
                                            }
                                            className="text-sm text-red-600"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQuantity(item.food, -1)
                                                }
                                                className="h-8 w-8 rounded border"
                                            >
                                                −
                                            </button>

                                            <span>{item.quantity}</span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQuantity(item.food, 1)
                                                }
                                                className="h-8 w-8 rounded border"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <span className="font-semibold">
                                            ₹{(
                                                item.price * item.quantity
                                            ).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="mt-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Serving Type
                                        </label>
                                        <select
                                            value={item.servingType}
                                            onChange={(event) =>
                                                updateServingType(
                                                    item.food,
                                                    event.target.value
                                                )
                                            }
                                            className="w-full rounded-lg border px-3 py-2 text-sm"
                                        >
                                            <option value="dine-in">Dine-in</option>
                                            <option value="takeaway">Takeaway</option>
                                        </select>
                                    </div>

                                    <div className="mt-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Special Instructions
                                        </label>
                                        <input
                                            type="text"
                                            value={item.specialInstructions}
                                            onChange={(event) =>
                                                updateInstructions(
                                                    item.food,
                                                    event.target.value
                                                )
                                            }
                                            placeholder="e.g. less spicy, no onion"
                                            className="w-full rounded-lg border px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Order notes */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Order Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={2}
                            placeholder="Additional notes..."
                            className="w-full rounded-lg border px-3 py-3"
                        />
                    </div>

                    {/* Bill summary */}
                    <div className="space-y-2 border-t pt-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-600">Tax (18%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between border-t pt-3 text-lg font-bold">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            cart.length === 0 ||
                            !tableId ||
                            !customerName.trim() ||
                            !customerMobile.trim()
                        }
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Creating Order..." : "Create Order"}
                    </button>
                </form>
            </div>
        </div>
    );
}
