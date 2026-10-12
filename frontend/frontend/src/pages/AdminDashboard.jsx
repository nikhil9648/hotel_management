
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api/admin";

const initialStats = {
    totalUsers: 0,
    totalCustomers: 0,
    totalAdmins: 0,
    totalStaff: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    checkedInBookings: 0,
    totalRestaurantOrders: 0,
    activeRestaurantOrders: 0,
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    maintenanceRooms: 0,
    hotelRevenue: 0,
    restaurantRevenue: 0,
    totalRevenue: 0,
    unpaidRestaurantBills: 0,
    recentBookings: [],
    recentOrders: [],
};

const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

const statGroups = [
    {
        title: "Users & Staff",
        cards: [
            { key: "totalUsers", title: "Total Users", icon: "👥", color: "bg-blue-50 text-blue-700" },
            { key: "totalCustomers", title: "Customers", icon: "🧑‍💼", color: "bg-green-50 text-green-700" },
            { key: "totalStaff", title: "Total Staff", icon: "🛎️", color: "bg-purple-50 text-purple-700" },
            { key: "totalAdmins", title: "Total Admins", icon: "🛡️", color: "bg-orange-50 text-orange-700" },
        ],
    },
    {
        title: "Hotel Bookings",
        cards: [
            { key: "totalBookings", title: "Total Bookings", icon: "📋", color: "bg-blue-50 text-blue-700" },
            { key: "pendingBookings", title: "Pending Bookings", icon: "⏳", color: "bg-yellow-50 text-yellow-700" },
            { key: "confirmedBookings", title: "Confirmed", icon: "✅", color: "bg-green-50 text-green-700" },
            { key: "checkedInBookings", title: "Currently Checked In", icon: "🛎️", color: "bg-purple-50 text-purple-700" },
        ],
    },
    {
        title: "Restaurant Orders",
        cards: [
            { key: "totalRestaurantOrders", title: "Total Orders", icon: "🍽️", color: "bg-orange-50 text-orange-700" },
            { key: "activeRestaurantOrders", title: "Active Orders", icon: "👨‍🍳", color: "bg-yellow-50 text-yellow-700" },
            { key: "unpaidRestaurantBills", title: "Unpaid / Partial Bills", icon: "🧾", color: "bg-red-50 text-red-700" },
        ],
    },
    {
        title: "Room Occupancy",
        cards: [
            { key: "totalRooms", title: "Active Rooms", icon: "🏨", color: "bg-blue-50 text-blue-700" },
            { key: "availableRooms", title: "Available Rooms", icon: "🟢", color: "bg-green-50 text-green-700" },
            { key: "occupiedRooms", title: "Occupied Rooms", icon: "🔑", color: "bg-orange-50 text-orange-700" },
            { key: "maintenanceRooms", title: "Under Maintenance", icon: "🔧", color: "bg-red-50 text-red-700" },
        ],
    },
];

const modules = [
    {
        title: "Staff Management",
        description: "Add, edit and deactivate staff.",
        path: "/admin/staff",
        icon: "👥",
    },
    {
        title: "Food Menu",
        description: "Manage restaurant food items.",
        path: "/admin/menu",
        icon: "🍽️",
    },
    {
        title: "Kitchen Orders",
        description: "View and manage kitchen orders.",
        path: "/admin/kitchen",
        icon: "👨‍🍳",
    },
    {
        title: "Reception Billing",
        description: "Generate bills and record payments.",
        path: "/admin/billing",
        icon: "🧾",
    },
    {
        title: "Bill History",
        description: "Review restaurant bills.",
        path: "/admin/bill-history",
        icon: "📑",
    },
];

export default function AdminDashboard() {
    const [stats, setStats] = useState(initialStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDashboard = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Please log in again.");
            }

            const response = await axios.get(
                `${API_URL}/dashboard`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Unable to load dashboard."
                );
            }

            setStats({
                ...initialStats,
                ...response.data.dashboard,
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to load dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const displayValue = (value) =>
        loading ? "—" : (value ?? 0);

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Admin Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Hotel and restaurant business overview.
                    </p>
                </div>

                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Loading..." : "↻ Refresh"}
                </button>
            </div>

            {/* ERROR */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    <p className="font-semibold">
                        Dashboard could not load
                    </p>
                    <p className="mt-1 text-sm">{error}</p>
                </div>
            )}

            {/* REVENUE */}
            <section>
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                    Revenue Overview
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                        {
                            title: "Hotel Revenue",
                            key: "hotelRevenue",
                            icon: "🏨",
                            color: "border-blue-500",
                        },
                        {
                            title: "Restaurant Collections",
                            key: "restaurantRevenue",
                            icon: "🍽️",
                            color: "border-green-500",
                        },
                        {
                            title: "Combined Collections",
                            key: "totalRevenue",
                            icon: "💰",
                            color: "border-purple-500",
                        },
                    ].map((item) => (
                        <div
                            key={item.key}
                            className={`rounded-xl border border-slate-200 border-l-4 ${item.color} bg-white p-5 shadow-sm`}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    {item.title}
                                </p>
                                <span className="text-2xl">
                                    {item.icon}
                                </span>
                            </div>

                            <p className="mt-4 break-words text-2xl font-bold text-slate-800">
                                {loading
                                    ? "—"
                                    : formatCurrency(stats[item.key])}
                            </p>
                        </div>
                    ))}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                    Collections reflect recorded payment data, not necessarily
                    profit or net revenue after refunds and expenses.
                </p>
            </section>

            {/* STATISTIC GROUPS */}
            {statGroups.map((group) => (
                <section key={group.title}>
                    <h2 className="mb-4 text-lg font-bold text-slate-800">
                        {group.title}
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {group.cards.map((card) => (
                            <div
                                key={card.key}
                                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-slate-500">
                                        {card.title}
                                    </p>
                                    <span
                                        className={`rounded-lg p-3 text-xl ${card.color}`}
                                    >
                                        {card.icon}
                                    </span>
                                </div>

                                <p className="mt-4 text-3xl font-bold text-slate-800">
                                    {displayValue(stats[card.key])}
                                </p>

                                <p className="mt-2 text-xs text-slate-400">
                                    Current database count
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {/* RECENT BOOKINGS */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b p-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            Recent Hotel Bookings
                        </h2>
                        <p className="text-sm text-slate-500">
                            Latest five booking records.
                        </p>
                    </div>

                    <Link
                        to="/rooms"
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        View Rooms
                    </Link>
                </div>

                {loading ? (
                    <p className="p-5 text-slate-500">Loading bookings...</p>
                ) : stats.recentBookings.length === 0 ? (
                    <p className="p-5 text-slate-500">
                        No bookings found.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-4">Booking No.</th>
                                    <th className="p-4">Guest</th>
                                    <th className="p-4">Room</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {stats.recentBookings.map((booking) => (
                                    <tr key={booking._id}>
                                        <td className="p-4 font-medium">
                                            {booking.bookingNumber || "—"}
                                        </td>
                                        <td className="p-4">
                                            {booking.guestDetails?.name ||
                                                booking.user?.name ||
                                                "Guest"}
                                        </td>
                                        <td className="p-4">
                                            {booking.room?.roomNumber || "—"}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            {formatCurrency(booking.totalAmount)}
                                        </td>
                                        <td className="p-4">
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">
                                                {(booking.bookingStatus || "unknown")
                                                    .replace("_", " ")}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* RECENT RESTAURANT ORDERS */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b p-5">
                    <h2 className="text-lg font-bold text-slate-800">
                        Recent Restaurant Orders
                    </h2>
                    <p className="text-sm text-slate-500">
                        Latest five restaurant orders.
                    </p>
                </div>

                {loading ? (
                    <p className="p-5 text-slate-500">Loading orders...</p>
                ) : stats.recentOrders.length === 0 ? (
                    <p className="p-5 text-slate-500">
                        No restaurant orders found.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-4">Order No.</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Order Status</th>
                                    <th className="p-4">Payment</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {stats.recentOrders.map((order) => (
                                    <tr key={order._id}>
                                        <td className="p-4 font-medium">
                                            {order.orderNumber || "—"}
                                        </td>
                                        <td className="p-4">
                                            {order.customer?.name || "Walk-in Customer"}
                                        </td>
                                        <td className="p-4 capitalize">
                                            {order.orderType || "—"}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            {formatCurrency(order.totalAmount)}
                                        </td>
                                        <td className="p-4 capitalize">
                                            {(order.orderStatus || "unknown")
                                                .replace("_", " ")}
                                        </td>
                                        <td className="p-4 capitalize">
                                            {(order.paymentStatus || "unknown")
                                                .replace("_", " ")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* MANAGEMENT MODULES */}
            <section>
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                    Management Modules
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => (
                        <Link
                            key={module.path}
                            to={module.path}
                            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
                        >
                            <div className="text-2xl">
                                {module.icon}
                            </div>

                            <h3 className="mt-3 font-semibold text-slate-800">
                                {module.title}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                {module.description}
                            </p>

                            <span className="mt-3 inline-block text-sm font-medium text-blue-600">
                                Open module →
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
