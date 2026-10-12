import axios from "axios";

const API_URL = "http://localhost:5000/api/bookings";

const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
    },
});

export const getAvailableRooms = async (
    checkInDate,
    checkOutDate,
    roomType = ""
) => {

    const response = await axios.get(
        `${API_URL}/available-rooms`,
        {
            params: {
                checkInDate,
                checkOutDate,
                ...(roomType && { roomType }),
            },
            ...getConfig(),
        }
    );

    return response.data;
};

export const createBooking = async (bookingData) => {

    const response = await axios.post(
        API_URL,
        bookingData,
        getConfig()
    );

    return response.data;
};

export const getMyBookings = async () => {

    const response = await axios.get(
        `${API_URL}/my-bookings`,
        getConfig()
    );

    return response.data;
};

export const getBookingById = async (bookingId) => {

    const response = await axios.get(
        `${API_URL}/${bookingId}`,
        getConfig()
    );

    return response.data;
};

export const cancelBooking = async (bookingId) => {

    const response = await axios.patch(
        `${API_URL}/${bookingId}/cancel`,
        {},
        getConfig()
    );

    return response.data;
};