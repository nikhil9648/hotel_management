
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/bookings";

const bookingStatuses = [
    "pending",
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
];

const paymentStatuses = [
    "pending",
    "paid",
    "partially_paid",
    "refunded",
    "failed",
];

const statusStyle = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    checked_in: "bg-blue-100 text-blue-800",
    checked_out: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
};

const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export default function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [date, setDate] = useState("");

    const fetchBookings = async () => {
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const token = localStorage.getItem("token");

            const params = {};

            if (status) params.status = status;
            if (paymentStatus) {
                params.paymentStatus = paymentStatus;
            }
            if (date) params.date = date;

            const response = await axios.get(API_URL, {
                params,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Unable to fetch bookings."
                );
            }

            setBookings(response.data.bookings || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to load bookings."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const updateStatus = async (booking, newStatus) => {
        if (newStatus === booking.bookingStatus) return;

        const confirmed = window.confirm(
            `Booking ${booking.bookingNumber} ka status "${newStatus.replaceAll("_", " ")}" karna hai?`
        );

        if (!confirmed) return;

        setError("");
        setMessage("");

        try {
            const token = localStorage.getItem("token");

            const response = await axios.patch(
                `${API_URL}/${booking._id}/status`,
                { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setMessage(
                response.data?.message ||
                "Booking status updated successfully."
            );

            await fetchBookings();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update booking status."
            );
        }
    };


    const downloadInvoice = async (booking) => {
        setError("");
        setMessage("");

        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                `${API_URL}/${booking._id}/invoice`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    responseType: "blob",
                }
            );

            const blob = new Blob([response.data], {
                type: "application/pdf",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `Invoice-${booking.bookingNumber || booking._id}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            setMessage("Invoice downloaded successfully.");
        } catch (err) {
            setError("Unable to download invoice. Please check the backend route and try again.");
        }
    };


    const filteredBookings = bookings.filter((booking) => {
        const searchText = search.trim().toLowerCase();

        if (!searchText) return true;

        const guestName =
            booking.guestDetails?.name ||
            booking.user?.name ||
            "";

        const guestEmail =
            booking.guestDetails?.email ||
            booking.user?.email ||
            "";

        const roomNumber =
            booking.room?.roomNumber || "";

        return [
            booking.bookingNumber,
            guestName,
            guestEmail,
            roomNumber,
            booking.guestDetails?.phone,
        ].some((value) =>
            String(value || "")
                .toLowerCase()
                .includes(searchText)
        );
    });

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Booking Management
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Search, filter and manage hotel bookings.
                    </p>
                </div>

                <button
                    onClick={fetchBookings}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Loading..." : "↻ Refresh"}
                </button>
            </div>

            {/* MESSAGES */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {message && (
                <div className="rounded-lg bg-green-50 p-4 text-green-700">
                    {message}
                </div>
            )}

            {/* SUMMARY */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Matching Bookings
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                        {loading ? "—" : filteredBookings.length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Pending
                    </p>
                    <p className="mt-2 text-3xl font-bold text-yellow-600">
                        {loading
                            ? "—"
                            : filteredBookings.filter(
                                (b) => b.bookingStatus === "pending"
                            ).length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Checked In
                    </p>
                    <p className="mt-2 text-3xl font-bold text-blue-600">
                        {loading
                            ? "—"
                            : filteredBookings.filter(
                                (b) => b.bookingStatus === "checked_in"
                            ).length}
                    </p>
                </div>
            </div>

            {/* FILTERS */}
            <section className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold text-slate-800">
                    Search and Filters
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search booking, guest, email, room..."
                        className="rounded-lg border p-3"
                    />

                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-lg border p-3"
                    >
                        <option value="">All Booking Statuses</option>
                        {bookingStatuses.map((item) => (
                            <option key={item} value={item}>
                                {item.replaceAll("_", " ")}
                            </option>
                        ))}
                    </select>

                    <select
                        value={paymentStatus}
                        onChange={(e) =>
                            setPaymentStatus(e.target.value)
                        }
                        className="rounded-lg border p-3"
                    >
                        <option value="">All Payment Statuses</option>
                        {paymentStatuses.map((item) => (
                            <option key={item} value={item}>
                                {item.replaceAll("_", " ")}
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-lg border p-3"
                        title="Filter by check-in date"
                    />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        onClick={fetchBookings}
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        Apply Filters
                    </button>

                    <button
                        onClick={() => {
                            setSearch("");
                            setStatus("");
                            setPaymentStatus("");
                            setDate("");
                            fetchBookings();
                        }}
                        disabled={loading}
                        className="rounded-lg border px-5 py-2 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Clear Filters
                    </button>
                </div>
            </section>

            {/* BOOKINGS TABLE */}
            <section className="overflow-hidden rounded-xl border bg-white">
                <div className="border-b p-5">
                    <h2 className="font-semibold text-slate-800">
                        All Hotel Bookings
                    </h2>
                </div>

                {loading ? (
                    <p className="p-5 text-slate-500">
                        Loading bookings...
                    </p>
                ) : filteredBookings.length === 0 ? (
                    <p className="p-5 text-slate-500">
                        No matching bookings found.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-4">Booking</th>
                                    <th className="p-4">Guest Details</th>
                                    <th className="p-4">Room</th>
                                    <th className="p-4">Stay Dates</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Payment</th>
                                    <th className="p-4">Booking Status</th>
                                    <th className="p-4">Update Status</th>
                                    <th className="p-4">Invoice</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {filteredBookings.map((booking) => (
                                    <tr key={booking._id}>
                                        <td className="p-4">
                                            <p className="font-semibold">
                                                {booking.bookingNumber}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {formatDate(booking.createdAt)}
                                            </p>
                                        </td>

                                        <td className="p-4">
                                            <p className="font-medium">
                                                {booking.guestDetails?.name ||
                                                    booking.user?.name ||
                                                    "Guest"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {booking.guestDetails?.email ||
                                                    booking.user?.email ||
                                                    "—"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {booking.guestDetails?.phone ||
                                                    booking.user?.phone ||
                                                    "—"}
                                            </p>
                                        </td>

                                        <td className="p-4">
                                            <p className="font-medium">
                                                {booking.room?.roomNumber || "—"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Floor {booking.room?.floor ?? "—"}
                                            </p>
                                        </td>

                                        <td className="p-4 whitespace-nowrap">
                                            <p>{formatDate(booking.checkInDate)}</p>
                                            <p className="text-slate-500">
                                                to {formatDate(booking.checkOutDate)}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {booking.numberOfNights || 0} night(s)
                                            </p>
                                        </td>

                                        <td className="p-4 whitespace-nowrap font-medium">
                                            {formatCurrency(booking.totalAmount)}
                                        </td>

                                        <td className="p-4">
                                            <span className="capitalize">
                                                {(booking.paymentStatus || "pending")
                                                    .replaceAll("_", " ")}
                                            </span>
                                        </td>

                                        <td className="p-4">
                                            <span
                                                className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusStyle[booking.bookingStatus] ||
                                                    "bg-slate-100 text-slate-700"
                                                    }`}
                                            >
                                                {(booking.bookingStatus || "unknown")
                                                    .replaceAll("_", " ")}
                                            </span>
                                        </td>

                                        <td className="p-4">
                                            <select
                                                value={booking.bookingStatus}
                                                onChange={(e) =>
                                                    updateStatus(
                                                        booking,
                                                        e.target.value
                                                    )
                                                }
                                                className="min-w-36 rounded-lg border p-2 capitalize"
                                            >
                                                {bookingStatuses.map((item) => (
                                                    <option
                                                        key={item}
                                                        value={item}
                                                    >
                                                        {item.replaceAll("_", " ")}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => downloadInvoice(booking)}
                                                className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
                                            >
                                                Download PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
