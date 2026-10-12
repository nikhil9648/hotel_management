import React, { useEffect, useState } from "react";

import {
    getMyBookings,
    cancelBooking,
} from "../services/bookingService";

import PayNow from "../components/PayNow";


// =====================================================
// MY BOOKINGS
// =====================================================

const MyBookings = ({ onPaymentSuccess }) => {

    const [bookings, setBookings] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [cancellingId, setCancellingId] = useState(null);


    // =====================================================
    // FETCH BOOKINGS
    // =====================================================

    const fetchBookings = async () => {

        try {

            setLoading(true);

            setError("");

            const data = await getMyBookings();

            if (data.success) {

                setBookings(data.bookings || []);

            } else {

                setError(
                    data.message ||
                    "Unable to fetch bookings"
                );

            }

        } catch (error) {

            console.error(
                "Get My Bookings Error:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Unable to fetch bookings"
            );

        } finally {

            setLoading(false);

        }
    };


    // =====================================================
    // LOAD BOOKINGS
    // =====================================================

    useEffect(() => {

        fetchBookings();

    }, []);


    // =====================================================
    // CANCEL BOOKING
    // =====================================================

    const handleCancel = async (bookingId) => {

        const confirmCancel =
            window.confirm(
                "Are you sure you want to cancel this booking?"
            );

        if (!confirmCancel) {
            return;
        }


        try {

            setCancellingId(bookingId);

            const data =
                await cancelBooking(bookingId);


            if (data.success) {

                alert(
                    "Booking cancelled successfully"
                );

                fetchBookings();

            } else {

                alert(
                    data.message ||
                    "Unable to cancel booking"
                );

            }

        } catch (error) {

            console.error(
                "Cancel Booking Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to cancel booking"
            );

        } finally {

            setCancellingId(null);

        }
    };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="min-h-screen bg-gray-100 flex items-center justify-center">

                <div className="text-xl font-semibold">

                    Loading your bookings...

                </div>

            </div>

        );
    }


    // =====================================================
    // ERROR
    // =====================================================

    if (error) {

        return (

            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">

                <div className="bg-white p-8 rounded-xl shadow text-center">

                    <h2 className="text-xl font-bold text-red-600">

                        Unable to load bookings

                    </h2>

                    <p className="text-gray-600 mt-3">

                        {error}

                    </p>


                    <button
                        onClick={fetchBookings}
                        className="mt-5 px-5 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        Try Again
                    </button>

                </div>

            </div>

        );
    }


    // =====================================================
    // NO BOOKINGS
    // =====================================================

    if (bookings.length === 0) {

        return (

            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">

                <div className="bg-white p-8 rounded-xl shadow text-center">

                    <div className="text-5xl mb-4">
                        🏨
                    </div>

                    <h2 className="text-2xl font-bold">

                        No Bookings Found

                    </h2>

                    <p className="text-gray-500 mt-2">

                        You have not made any hotel bookings yet.

                    </p>

                </div>

            </div>

        );
    }


    // =====================================================
    // BOOKINGS LIST
    // =====================================================

    return (

        <div className="min-h-screen bg-gray-100 p-6">

            <div className="max-w-6xl mx-auto">


                {/* HEADER */}

                <div className="flex justify-between items-center mb-6">

                    <div>

                        <h1 className="text-3xl font-bold">

                            My Bookings

                        </h1>

                        <p className="text-gray-500 mt-1">

                            Manage your hotel bookings

                        </p>

                    </div>


                    <button
                        onClick={fetchBookings}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg"
                    >
                        Refresh
                    </button>

                </div>


                {/* BOOKINGS */}

                <div className="grid gap-6">

                    {bookings.map((booking) => (

                        <div
                            key={booking._id}
                            className="bg-white rounded-xl shadow-md p-6"
                        >


                            {/* TOP */}

                            <div className="flex flex-col md:flex-row md:justify-between gap-4 border-b pb-4">


                                <div>

                                    <p className="text-sm text-gray-500">
                                        Booking Number
                                    </p>

                                    <h2 className="text-xl font-bold">
                                        {booking.bookingNumber}
                                    </h2>

                                </div>


                                <div className="flex gap-2">


                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                            booking.bookingStatus === "confirmed"
                                                ? "bg-green-100 text-green-700"
                                                : booking.bookingStatus === "cancelled"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-700"
                                        }`}
                                    >
                                        {booking.bookingStatus}
                                    </span>


                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                            booking.paymentStatus === "paid"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-yellow-100 text-yellow-700"
                                        }`}
                                    >
                                        {booking.paymentStatus}
                                    </span>


                                </div>

                            </div>


                            {/* DETAILS */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">


                                {/* ROOM */}

                                <div>

                                    <p className="text-sm text-gray-500">
                                        Room
                                    </p>

                                    <p className="font-semibold">

                                        Room{" "}

                                        {booking.room?.roomNumber ||
                                            "-"}

                                    </p>

                                    <p className="text-sm text-gray-500">

                                        Floor{" "}

                                        {booking.room?.floor ||
                                            "-"}

                                    </p>

                                </div>


                                {/* DATES */}

                                <div>

                                    <p className="text-sm text-gray-500">
                                        Check-in
                                    </p>

                                    <p className="font-semibold">

                                        {new Date(
                                            booking.checkInDate
                                        ).toLocaleDateString("en-IN")}

                                    </p>


                                    <p className="text-sm text-gray-500 mt-2">
                                        Check-out
                                    </p>

                                    <p className="font-semibold">

                                        {new Date(
                                            booking.checkOutDate
                                        ).toLocaleDateString("en-IN")}

                                    </p>

                                </div>


                                {/* AMOUNT */}

                                <div>

                                    <p className="text-sm text-gray-500">
                                        Total Amount
                                    </p>

                                    <p className="text-2xl font-bold">

                                        ₹
                                        {Number(
                                            booking.totalAmount || 0
                                        ).toLocaleString("en-IN")}

                                    </p>


                                    <p className="text-sm text-gray-500">

                                        {booking.numberOfNights} night(s)

                                    </p>

                                </div>

                            </div>


                            {/* GUEST */}

                            <div className="mt-5 border-t pt-4">

                                <p className="text-sm text-gray-500">
                                    Guest
                                </p>

                                <p className="font-semibold">

                                    {booking.guestDetails?.name ||
                                        "-"}

                                </p>

                                <p className="text-sm text-gray-500">

                                    {booking.guestDetails?.email ||
                                        "-"}

                                </p>

                            </div>


                            {/* ACTIONS */}

                            <div className="mt-6 flex flex-wrap gap-3">


                                {/* PAY NOW */}

                                {booking.paymentStatus !== "paid" &&
                                    booking.bookingStatus !== "cancelled" && (

                                    <PayNow
                                        bookingId={booking._id}
                                        onPaymentSuccess={
                                            onPaymentSuccess
                                        }
                                    />

                                )}


                                {/* CANCEL */}

                                {booking.bookingStatus !== "cancelled" &&
                                    booking.bookingStatus !== "checked_out" && (

                                    <button
                                        onClick={() =>
                                            handleCancel(
                                                booking._id
                                            )
                                        }
                                        disabled={
                                            cancellingId ===
                                            booking._id
                                        }
                                        className="px-5 py-3 bg-red-600 text-white rounded-lg disabled:opacity-50"
                                    >

                                        {cancellingId ===
                                        booking._id
                                            ? "Cancelling..."
                                            : "Cancel Booking"}

                                    </button>

                                )}


                                {/* PAID */}

                                {booking.paymentStatus === "paid" && (

                                    <span className="px-5 py-3 bg-green-100 text-green-700 rounded-lg font-semibold">

                                        ✓ Payment Completed

                                    </span>

                                )}

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        </div>

    );
};


export default MyBookings;