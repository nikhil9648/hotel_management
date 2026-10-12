import axios from "axios";

const API_URL = "http://localhost:5000/api/payments";


// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

export const createPaymentOrder = async (bookingId) => {
    const token = localStorage.getItem("token");

    const response = await axios.post(
        `${API_URL}/create-order`,
        {
            bookingId,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    return response.data;
};


// =====================================================
// VERIFY PAYMENT
// =====================================================

export const verifyPayment = async (paymentData) => {
    const token = localStorage.getItem("token");

    const response = await axios.post(
        `${API_URL}/verify`,
        paymentData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    return response.data;
};