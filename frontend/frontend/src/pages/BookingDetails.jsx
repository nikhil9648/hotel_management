import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PayNow from "../components/PayNow";

const BookingDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const booking = location.state?.booking;

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow text-center">

                    <h2 className="text-xl font-bold text-red-600">
                        Booking not found
                    </h2>

                    <button
                        onClick={() => navigate("/rooms")}
                        className="mt-5 bg-blue-600 text-white px-6 py-3 rounded-lg"
                    >
                        Book a Room
                    </button>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">

            <div className="max-w-3xl mx-auto">

                <div className="bg-white rounded-xl shadow p-8">

                    {/* SUCCESS */}

                    <div className="text-center mb-8">

                        <div className="text-5xl mb-3">
                            ✅
                        </div>

                        <h1 className="text-3xl font-bold text-green-600">
                            Booking Created Successfully
                        </h1>

                        <p className="text-gray-600 mt-2">
                            Your room has been reserved.
                        </p>

                    </div>


                    {/* BOOKING NUMBER */}

                    <div className="bg-gray-100 rounded-lg p-5 text-center mb-6">

                        <p className="text-gray-500">
                            Booking Number
                        </p>

                        <p className="text-2xl font-bold mt-1">
                            {booking.bookingNumber}
                        </p>

                    </div>


                    {/* DETAILS */}

                    <div className="space-y-4">

                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Room
                            </span>

                            <strong>
                                Room {booking.room?.roomNumber}
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Floor
                            </span>

                            <strong>
                                {booking.room?.floor}
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Check-in
                            </span>

                            <strong>
                                {new Date(
                                    booking.checkInDate
                                ).toLocaleDateString("en-IN")}
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Check-out
                            </span>

                            <strong>
                                {new Date(
                                    booking.checkOutDate
                                ).toLocaleDateString("en-IN")}
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Guests
                            </span>

                            <strong>
                                {booking.adults} Adult(s)
                                {" + "}
                                {booking.children} Child(ren)
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Nights
                            </span>

                            <strong>
                                {booking.numberOfNights}
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Room Charges
                            </span>

                            <strong>
                                ₹{booking.roomCharges}
                            </strong>
                        </div>


                        <div className="flex justify-between border-b pb-3">
                            <span className="text-gray-600">
                                Tax
                            </span>

                            <strong>
                                ₹{booking.taxAmount}
                            </strong>
                        </div>


                        <div className="flex justify-between text-xl pt-2">

                            <span className="font-bold">
                                Total Amount
                            </span>

                            <strong className="text-green-600">
                                ₹{booking.totalAmount}
                            </strong>

                        </div>

                    </div>


                    {/* STATUS */}

                    <div className="grid grid-cols-2 gap-4 mt-7">

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">

                            <p className="text-sm text-gray-500">
                                Booking Status
                            </p>

                            <p className="font-bold text-yellow-700 capitalize">
                                {booking.bookingStatus}
                            </p>

                        </div>


                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">

                            <p className="text-sm text-gray-500">
                                Payment Status
                            </p>

                            <p className="font-bold text-yellow-700 capitalize">
                                {booking.paymentStatus}
                            </p>

                        </div>

                    </div>


                    {/* PAYMENT */}

                    {booking.paymentStatus === "pending" && (

                        <div className="mt-8 text-center">

                            <h2 className="text-xl font-bold mb-2">
                                Complete Your Payment
                            </h2>

                            <p className="text-gray-600 mb-4">
                                Pay ₹{booking.totalAmount} to confirm your booking.
                            </p>

                            <PayNow
                                bookingId={booking._id}
                                onPaymentSuccess={(data) => {

                                    navigate("/payment-success", {
                                        state: {
                                            booking:
                                                data.booking,

                                            payment:
                                                data.payment,
                                        },
                                    });

                                }}
                            />

                        </div>

                    )}


                    {/* ALREADY PAID */}

                    {booking.paymentStatus === "paid" && (

                        <div className="mt-8 bg-green-100 text-green-700 p-4 rounded-lg text-center font-semibold">
                            Payment Completed ✓
                        </div>

                    )}


                    {/* BUTTONS */}

                    <div className="flex gap-3 mt-8">

                        <button
                            onClick={() =>
                                navigate("/my-bookings")
                            }
                            className="flex-1 border border-gray-300 py-3 rounded-lg"
                        >
                            My Bookings
                        </button>

                        <button
                            onClick={() =>
                                navigate("/rooms")
                            }
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg"
                        >
                            Book Another Room
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default BookingDetails;
