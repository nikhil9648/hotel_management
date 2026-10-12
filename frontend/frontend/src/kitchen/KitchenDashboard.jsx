
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function KitchenDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    const fetchOrders = useCallback(async () => {
        try {
            setError("");

            const response = await axios.get(
                `${API}/restaurant-orders/all`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = response.data;

            setOrders(
                Array.isArray(data)
                    ? data
                    : data.orders || data.restaurantOrders || data.data || []
            );
        } catch (err) {
            console.error("Kitchen Dashboard Error:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load restaurant orders."
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchOrders();

        const interval = setInterval(fetchOrders, 5000);

        return () => clearInterval(interval);
    }, [fetchOrders]);

    const countStatus = (status) =>
        orders.filter((order) => order.orderStatus === status).length;

    const cards = [
        {
            title: "Pending Orders",
            count: countStatus("pending"),
            color: "border-yellow-500",
            icon: "⏳",
        },
        {
            title: "Preparing Orders",
            count: countStatus("preparing"),
            color: "border-blue-500",
            icon: "👨‍🍳",
        },
        {
            title: "Ready Orders",
            count: countStatus("ready"),
            color: "border-green-500",
            icon: "✅",
        },
        {
            title: "Served Orders",
            count: countStatus("served"),
            color: "border-purple-500",
            icon: "🍽️",
        },
    ];

    const activeOrders = orders.filter((order) =>
        ["pending", "confirmed", "preparing", "ready"].includes(
            order.orderStatus
        )
    );

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-8 text-center">
                Loading Kitchen Dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Kitchen Dashboard
                    </h1>
                    <p className="mt-1 text-gray-500">
                        Monitor food preparation and restaurant orders.
                    </p>
                </div>

                <button
                    onClick={fetchOrders}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    🔄 Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        className={`rounded-xl border-l-4 ${card.color} bg-white p-5 shadow-sm`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    {card.title}
                                </p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    {card.count}
                                </p>
                            </div>

                            <span className="text-3xl">{card.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">
                    Active Kitchen Orders
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    Orders refresh automatically every 5 seconds.
                </p>

                {activeOrders.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">
                        No active orders right now.
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {activeOrders.map((order) => (
                            <div
                                key={order._id}
                                className="rounded-lg border p-4"
                            >
                                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                                    <div>
                                        <h3 className="font-bold">
                                            Order #{order.orderNumber || order._id?.slice(-6)}
                                        </h3>

                                        <p className="text-sm text-gray-500">
                                            Table:{" "}
                                            {order.table?.tableNumber ||
                                                order.table?.name ||
                                                (order.orderType === "takeaway"
                                                    ? "Takeaway"
                                                    : "N/A")}
                                        </p>
                                    </div>

                                    <span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold capitalize">
                                        {order.orderStatus}
                                    </span>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {(order.items || []).map((item, index) => (
                                        <div
                                            key={item._id || index}
                                            className="flex justify-between gap-3 border-t pt-2"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {item.name || item.food?.name || "Food item"}
                                                </p>

                                                {item.specialInstructions && (
                                                    <p className="text-sm text-orange-700">
                                                        Note: {item.specialInstructions}
                                                    </p>
                                                )}
                                            </div>

                                            <span className="font-bold">
                                                × {item.quantity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
