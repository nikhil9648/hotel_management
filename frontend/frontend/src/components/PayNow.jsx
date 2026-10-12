import React, { useState } from "react";

import {
    createPaymentOrder,
    verifyPayment,
} from "../services/paymentService";


const PayNow = ({ bookingId, onPaymentSuccess }) => {

    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState("");


    // =====================================================
    // HANDLE PAYMENT
    // =====================================================

    const handlePayment = async () => {

        try {

            setLoading(true);
            setMessage("Creating payment order...");


            // =================================================
            // CREATE RAZORPAY ORDER
            // =================================================

            const data = await createPaymentOrder(
                bookingId
            );


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to create payment order"
                );

            }


            // =================================================
            // RAZORPAY OPTIONS
            // =================================================

            const options = {

                key: data.key,

                amount: data.order.amount,

                currency: data.order.currency,

                name: "Hotel & Restaurant",

                description:
                    `Booking ${data.booking.bookingNumber}`,

                order_id: data.order.id,


                // =================================================
                // PAYMENT SUCCESS
                // =================================================

                handler: async function (response) {

                    try {

                        setMessage(
                            "Verifying payment..."
                        );


                        const verification =
                            await verifyPayment({

                                razorpay_order_id:
                                    response.razorpay_order_id,

                                razorpay_payment_id:
                                    response.razorpay_payment_id,

                                razorpay_signature:
                                    response.razorpay_signature,

                                bookingId:
                                    bookingId,

                            });


                        // =========================================
                        // VERIFICATION SUCCESS
                        // =========================================

                        if (verification.success) {

                            setMessage(
                                "Payment successful!"
                            );


                            /*
                             * IMPORTANT
                             *
                             * Send payment result back to
                             * PaymentTest.jsx
                             */

                            if (onPaymentSuccess) {

                                onPaymentSuccess({

                                    booking:
                                        verification.booking,

                                    payment:
                                        verification.payment,

                                });

                            }


                        } else {

                            setMessage(

                                verification.message ||

                                "Payment verification failed"

                            );

                        }


                    } catch (error) {

                        console.error(
                            "Payment Verification Error:",
                            error
                        );


                        setMessage(

                            error.response?.data?.message ||

                            "Payment verification failed"

                        );

                    }

                },


                // =================================================
                // PREFILL
                // =================================================

                prefill: {

                    name: "",

                    email: "",

                    contact: "",

                },


                // =================================================
                // NOTES
                // =================================================

                notes: {

                    bookingId: bookingId,

                },


                // =================================================
                // THEME
                // =================================================

                theme: {

                    color: "#3399cc",

                },

            };


            // =================================================
            // OPEN RAZORPAY
            // =================================================

            if (!window.Razorpay) {

                throw new Error(
                    "Razorpay SDK is not loaded"
                );

            }


            const razorpay =
                new window.Razorpay(options);


            // =================================================
            // PAYMENT FAILED
            // =================================================

            razorpay.on(
                "payment.failed",
                function (response) {

                    console.error(
                        "Payment Failed:",
                        response.error
                    );


                    setMessage(

                        response.error?.description ||

                        "Payment failed. Please try again."

                    );

                }
            );


            razorpay.open();


        } catch (error) {

            console.error(
                "Payment Error:",
                error
            );


            setMessage(

                error.response?.data?.message ||

                error.message ||

                "Payment initialization failed"

            );

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // UI
    // =====================================================

    return (

        <div className="p-4">

            <button

                onClick={handlePayment}

                disabled={loading}

                className="
                    px-6
                    py-3
                    rounded-lg
                    bg-blue-600
                    text-white
                    font-semibold
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                "

            >

                {loading
                    ? "Processing..."
                    : "Pay Now"
                }

            </button>


            {message && (

                <p className="mt-3 text-sm">

                    {message}

                </p>

            )}

        </div>

    );

};


export default PayNow;