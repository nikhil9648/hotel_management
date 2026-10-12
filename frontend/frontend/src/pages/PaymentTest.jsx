import React from "react";
import PayNow from "../components/PayNow";

const PaymentTest = ({ onPaymentSuccess }) => {

    const bookingId = "6ab608bbf1a56d7135f111bf";

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">

            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">

                <h1 className="text-2xl font-bold mb-6">
                    Hotel Booking Payment
                </h1>

                <div className="space-y-3">

                    <div>
                        <p className="text-gray-500 text-sm">
                            Booking Number
                        </p>

                        <p className="font-semibold">
                            HTL-20260923-0001
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500 text-sm">
                            Booking ID
                        </p>

                        <p className="font-mono text-sm break-all">
                            {bookingId}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500 text-sm">
                            Amount
                        </p>

                        <p className="text-2xl font-bold">
                            ₹12,390
                        </p>
                    </div>

                </div>

                <div className="mt-6">

                    <PayNow
                        bookingId={bookingId}
                        onPaymentSuccess={onPaymentSuccess}
                    />

                </div>

            </div>

        </div>
    );
};

export default PaymentTest;