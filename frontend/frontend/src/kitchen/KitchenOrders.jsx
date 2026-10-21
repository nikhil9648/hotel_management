
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function KitchenOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState("");

    const token = localStorage.getItem("token");

    const authConfig = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    const fetchOrders = useCallback(async () => {
        try {
            setError("");

            const response = await axios.get(
                `${API}/restaurant-orders/all`,
                authConfig
            );

            const data = response.data;
            const list = Array.isArray(data)
                ? data
                : data.orders || data.restaurantOrders || data.data || [];

            setOrders(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load kitchen orders."
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

    const updateStatus = async (orderId, orderStatus) => {
        try {
            setUpdatingId(orderId);
            setError("");

            await axios.put(
                `${API}/restaurant-orders/${orderId}/status`,
                { orderStatus },
                authConfig
            );

            await fetchOrders();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update order status."
            );
        } finally {
            setUpdatingId("");
        }
    };

    const visibleOrders = orders.filter((order) =>
        ["pending", "confirmed", "preparing", "ready"].includes(
            order.orderStatus
        )
    );

    if (loading) {
        return <div className="p-8 text-center">Loading kitchen orders...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Kitchen Orders</h1>
                    <p className="mt-1 text-gray-500">
                        Prepare orders and mark them ready for serving.
                    </p>
                </div>

                <button
                    onClick={fetchOrders}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-lg bg-red-100 p-3 text-red-700">
                    {error}
                </div>
            )}

            {visibleOrders.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
                    No active kitchen orders.
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {visibleOrders.map((order) => (
                        <div
                            key={order._id}
                            className="overflow-hidden rounded-xl bg-white shadow"
                        >
                            <div className="flex items-start justify-between gap-3 bg-blue-900 p-4 text-white">
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Order #{order.orderNumber || order._id.slice(-6)}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-300">
                                        Table:{" "}
                                        {order.table?.tableNumber ||
                                            order.table?.name ||
                                            (order.orderType === "takeaway"
                                                ? "Takeaway"
                                                : "Packing")}
                                    </p>
                                </div>

                                <span className="rounded bg-blue-600 px-3 py-1 text-sm capitalize">
                                    {order.orderStatus}
                                </span>
                            </div>

                            <div className="space-y-3 p-4">
                                {(order.items || []).map((item, index) => (
                                    <div
                                        key={item._id || index}
                                        className="border-b pb-3 last:border-0"
                                    >
                                        <div className="flex justify-between gap-3">
                                            <span className="font-semibold">
                                                {item.name || item.food?.name || "Food item"}
                                            </span>
                                            <span className="font-bold">
                                                × {item.quantity}
                                            </span>
                                        </div>

                                        {item.servingType && (
                                            <p className="text-xs capitalize text-gray-500">
                                                {item.servingType}
                                            </p>
                                        )}

                                        {item.specialInstructions && (
                                            <p className="mt-1 text-sm text-orange-700">
                                                Note: {item.specialInstructions}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                <div className="pt-2">
                                    {["pending", "confirmed"].includes(
                                        order.orderStatus
                                    ) && (
                                        <button
                                            disabled={updatingId === order._id}
                                            onClick={() =>
                                                updateStatus(order._id, "preparing")
                                            }
                                            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {updatingId === order._id
                                                ? "Updating..."
                                                : "Start Preparing"}
                                        </button>
                                    )}

                                    {order.orderStatus === "preparing" && (
                                        <button
                                            disabled={updatingId === order._id}
                                            onClick={() =>
                                                updateStatus(order._id, "ready")
                                            }
                                            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {updatingId === order._id
                                                ? "Updating..."
                                                : "Mark Ready"}
                                        </button>
                                    )}

                                    {order.orderStatus === "ready" && (
                                        <div className="rounded-lg bg-green-50 p-3 text-center font-semibold text-green-700">
                                            Ready for serving
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
