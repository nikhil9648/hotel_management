import React from "react";

const PaymentSuccess = ({ paymentData }) => {

    const booking = paymentData?.booking;
    const payment = paymentData?.payment;

    // =====================================================
    // BOOKING DATA NOT FOUND
    // =====================================================

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">

                <div className="text-center bg-white p-8 rounded-xl shadow">

                    <h2 className="text-xl font-bold text-red-600">
                        Booking information not found
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Payment was completed, but booking information
                        could not be displayed.
                    </p>

                </div>

            </div>
        );
    }


    // =====================================================
    // PAYMENT SUCCESS
    // =====================================================

    return (

        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">

            <div className="bg-white shadow-lg rounded-xl p-8 max-w-lg w-full text-center">


                {/* SUCCESS ICON */}

                <div className="text-6xl mb-4">
                    ✅
                </div>


                {/* TITLE */}

                <h1 className="text-2xl font-bold text-green-600">
                    Payment Successful!
                </h1>


                <p className="text-gray-600 mt-2">
                    Your hotel booking has been confirmed.
                </p>


                {/* BOOKING DETAILS */}

                <div className="text-left mt-6 space-y-3 border-t pt-5">


                    {/* BOOKING NUMBER */}

                    <div className="flex justify-between gap-4">

                        <span className="text-gray-600">
                            Booking Number
                        </span>

                        <strong>
                            {booking.bookingNumber || "-"}
                        </strong>

                    </div>


                    {/* BOOKING ID */}

                    <div className="flex justify-between gap-4">

                        <span className="text-gray-600">
                            Booking ID
                        </span>

                        <span className="text-sm font-mono break-all text-right">
                            {booking.id || "-"}
                        </span>

                    </div>


                    {/* BOOKING STATUS */}

                    <div className="flex justify-between gap-4">

                        <span className="text-gray-600">
                            Booking Status
                        </span>

                        <strong className="text-green-600">
                            {booking.bookingStatus || "confirmed"}
                        </strong>

                    </div>


                    {/* PAYMENT STATUS */}

                    <div className="flex justify-between gap-4">

                        <span className="text-gray-600">
                            Payment Status
                        </span>

                        <strong className="text-green-600">
                            {booking.paymentStatus || "paid"}
                        </strong>

                    </div>


                    {/* AMOUNT */}

                    <div className="flex justify-between gap-4">

                        <span className="text-gray-600">
                            Total Amount
                        </span>

                        <strong>
                            ₹
                            {Number(
                                booking.totalAmount || 0
                            ).toLocaleString("en-IN")}
                        </strong>

                    </div>


                    {/* PAYMENT ID */}

                    {payment?.paymentId && (

                        <div className="flex justify-between gap-4">

                            <span className="text-gray-600">
                                Payment ID
                            </span>

                            <span className="text-sm font-mono break-all text-right">
                                {payment.paymentId}
                            </span>

                        </div>

                    )}


                    {/* ORDER ID */}

                    {payment?.orderId && (

                        <div className="flex justify-between gap-4">

                            <span className="text-gray-600">
                                Razorpay Order ID
                            </span>

                            <span className="text-sm font-mono break-all text-right">
                                {payment.orderId}
                            </span>

                        </div>

                    )}

                </div>


                {/* BUTTONS */}

                <div className="mt-7 flex gap-3">


                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                    >
                        My Bookings
                    </button>


                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
                    >
                        Home
                    </button>


                </div>

            </div>

        </div>

    );
};


export default PaymentSuccess;