import React, {
    useEffect,
    useState,
} from "react";

import axios from "axios";

const API =
    "http://localhost:5000/api";

const MyOrders = () => {
    const [orders, setOrders] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    // =====================================================
    // FETCH ORDERS
    // =====================================================

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError("");

            const token =
                localStorage.getItem(
                    "token"
                ) ||
                localStorage.getItem(
                    "accessToken"
                );

            if (!token) {
                setError(
                    "Please login first"
                );

                return;
            }

            const response =
                await axios.get(
                    `${API}/restaurant-orders/my-orders`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            console.log(
                "MY ORDERS:",
                response.data
            );

            setOrders(
                response.data.orders ||
                    []
            );
        } catch (error) {
            console.error(
                "My Orders Error:",
                error
            );

            console.error(
                "Backend Response:",
                error.response?.data
            );

            setError(
                error.response?.data
                    ?.message ||
                    "Unable to load orders"
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // LOAD
    // =====================================================

    useEffect(() => {
        fetchOrders();
    }, []);

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="p-10 text-center">
                Loading orders...
            </div>
        );
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (error) {
        return (
            <div className="max-w-5xl mx-auto p-10 text-center">
                <h2 className="text-2xl font-bold text-red-500">
                    {error}
                </h2>

                <button
                    onClick={
                        fetchOrders
                    }
                    className="mt-5 bg-orange-500 text-white px-6 py-3 rounded-lg"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* HEADER */}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold">
                        My Orders
                    </h1>

                    <p className="text-gray-500 mt-2">
                        Track your restaurant orders
                    </p>
                </div>

                <button
                    onClick={
                        fetchOrders
                    }
                    className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                    Refresh
                </button>
            </div>

            {/* NO ORDERS */}

            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl">
                        🍽️
                    </div>

                    <h2 className="text-2xl font-bold mt-4">
                        No Orders Yet
                    </h2>

                    <a
                        href="/menu"
                        className="inline-block mt-5 bg-orange-500 text-white px-6 py-3 rounded-lg"
                    >
                        Order Food
                    </a>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map(
                        (order) => (
                            <div
                                key={
                                    order._id
                                }
                                className="border rounded-xl p-6 bg-white shadow-sm"
                            >
                                {/* HEADER */}

                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500">
                                            Order Number
                                        </p>

                                        <h2 className="text-xl font-bold">
                                            {
                                                order.orderNumber
                                            }
                                        </h2>

                                        <p className="text-sm text-gray-500 mt-1">
                                            {new Date(
                                                order.createdAt
                                            ).toLocaleString()}
                                        </p>
                                    </div>

                                    <span className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full capitalize">
                                        {
                                            order.orderStatus
                                        }
                                    </span>
                                </div>

                                {/* ITEMS */}

                                <div className="mt-5 space-y-2">
                                    {order.items?.map(
                                        (
                                            item,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    item.food?._id ||
                                                    `${order._id}-${index}`
                                                }
                                                className="flex justify-between"
                                            >
                                                <span>
                                                    {
                                                        item.name
                                                    }{" "}
                                                    ×{" "}
                                                    {
                                                        item.quantity
                                                    }
                                                </span>

                                                <span>
                                                    ₹
                                                    {Number(
                                                        item.total ||
                                                            0
                                                    ).toFixed(
                                                        2
                                                    )}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>

                                <hr className="my-5" />

                                {/* ORDER INFO */}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p>
                                            Payment:{" "}
                                            <b className="capitalize">
                                                {
                                                    order.paymentStatus
                                                }
                                            </b>
                                        </p>

                                        <p className="mt-1">
                                            Payment Method:{" "}
                                            <b className="capitalize">
                                                {
                                                    order.paymentMethod
                                                }
                                            </b>
                                        </p>

                                        <p className="mt-1">
                                            Type:{" "}
                                            <b>
                                                {
                                                    order.orderType
                                                }
                                            </b>
                                        </p>

                                        {order.table && (
                                            <p className="mt-1">
                                                Table:{" "}
                                                <b>
                                                    {
                                                        order
                                                            .table
                                                            .tableNumber
                                                    }
                                                </b>
                                            </p>
                                        )}

                                        {order.deliveryAddress && (
                                            <p className="mt-1">
                                                Address:{" "}
                                                <b>
                                                    {
                                                        order.deliveryAddress
                                                    }
                                                </b>
                                            </p>
                                        )}
                                    </div>

                                    {/* TOTAL */}

                                    <div className="text-right">
                                        <p className="text-gray-500">
                                            Subtotal
                                        </p>

                                        <p>
                                            ₹
                                            {Number(
                                                order.subtotal ||
                                                    0
                                            ).toFixed(
                                                2
                                            )}
                                        </p>

                                        <p className="text-gray-500 mt-2">
                                            Tax
                                        </p>

                                        <p>
                                            ₹
                                            {Number(
                                                order.taxAmount ||
                                                    0
                                            ).toFixed(
                                                2
                                            )}
                                        </p>

                                        <p className="text-gray-500 mt-2">
                                            Total
                                        </p>

                                        <p className="text-2xl font-bold">
                                            ₹
                                            {Number(
                                                order.totalAmount ||
                                                    0
                                            ).toFixed(
                                                2
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default MyOrders;