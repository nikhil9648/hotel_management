import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const BookRoom = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Rooms.jsx se received data
    const room = location.state?.room;
    const checkInDate = location.state?.checkInDate;
    const checkOutDate = location.state?.checkOutDate;

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        idProofType: "Aadhar",
        idProofNumber: "",
        adults: 1,
        children: 0,
        specialRequests: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // --------------------------------------------------
    // If room data is missing
    // --------------------------------------------------

    if (!room || !checkInDate || !checkOutDate) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow text-center">

                    <h2 className="text-xl font-bold text-red-600">
                        Booking information not found
                    </h2>

                    <p className="text-gray-600 mt-2">
                        Please select a room again.
                    </p>

                    <button
                        onClick={() => navigate("/rooms")}
                        className="mt-5 bg-blue-600 text-white px-6 py-3 rounded-lg"
                    >
                        Find a Room
                    </button>

                </div>
            </div>
        );
    }

    // --------------------------------------------------
    // Handle Input
    // --------------------------------------------------

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

    };

    // --------------------------------------------------
    // Create Booking
    // --------------------------------------------------

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);
            setMessage("");

            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/login");
                return;
            }

            // ------------------------------------------
            // Validate guests
            // ------------------------------------------

            const adults =
                Number(formData.adults);

            const children =
                Number(formData.children);

            if (adults < 1) {
                setMessage(
                    "At least 1 adult is required."
                );
                return;
            }

            if (children < 0) {
                setMessage(
                    "Children cannot be negative."
                );
                return;
            }

            // ------------------------------------------
            // Booking payload
            // ------------------------------------------

            const bookingData = {

                room: room._id,

                checkInDate: checkInDate,

                checkOutDate: checkOutDate,

                adults: adults,

                children: children,

                guestDetails: {

                    name:
                        formData.name.trim(),

                    email:
                        formData.email
                            .trim()
                            .toLowerCase(),

                    phone:
                        formData.phone.trim(),

                    address:
                        formData.address.trim(),

                    idProofType:
                        formData.idProofType,

                    idProofNumber:
                        formData.idProofNumber.trim(),

                },

                specialRequests:
                    formData.specialRequests.trim(),

                paymentMethod:
                    "razorpay",
            };

            // ------------------------------------------
            // API
            // ------------------------------------------

            const response =
                await axios.post(
                    "http://localhost:5000/api/bookings",
                    bookingData,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                        },
                    }
                );

            if (response.data.success) {

                const booking =
                    response.data.booking;

                // --------------------------------------
                // Go to booking details / payment
                // --------------------------------------

                navigate("/booking-details", {
                    state: {
                        booking,
                    },
                });

            } else {

                setMessage(
                    response.data.message ||
                    "Unable to create booking."
                );

            }

        } catch (error) {

            console.error(
                "Create Booking Error:",
                error
            );

            setMessage(
                error.response?.data?.message ||
                "Unable to create booking."
            );

        } finally {

            setLoading(false);

        }
    };


    return (

        <div className="min-h-screen bg-gray-100 p-6">

            <div className="max-w-5xl mx-auto">

                {/* HEADER */}

                <div className="mb-6">

                    <h1 className="text-3xl font-bold">
                        Book Room
                    </h1>

                    <p className="text-gray-600 mt-1">
                        Enter guest details to complete your booking.
                    </p>

                </div>


                <div className="grid lg:grid-cols-3 gap-6">


                    {/* -------------------------------- */}
                    {/* ROOM DETAILS */}
                    {/* -------------------------------- */}

                    <div className="bg-white rounded-xl shadow p-6 h-fit">

                        <h2 className="text-xl font-bold mb-4">
                            Room Details
                        </h2>

                        <div className="space-y-3">

                            <div>
                                <p className="text-gray-500 text-sm">
                                    Room
                                </p>

                                <p className="font-semibold text-lg">
                                    Room {room.roomNumber}
                                </p>
                            </div>


                            <div>
                                <p className="text-gray-500 text-sm">
                                    Floor
                                </p>

                                <p className="font-semibold">
                                    {room.floor}
                                </p>
                            </div>


                            <div>
                                <p className="text-gray-500 text-sm">
                                    Room Type
                                </p>

                                <p className="font-semibold">
                                    {room.roomType?.name ||
                                        "Standard Room"}
                                </p>
                            </div>


                            <div>
                                <p className="text-gray-500 text-sm">
                                    Price
                                </p>

                                <p className="text-2xl font-bold">
                                    ₹
                                    {room.price ||
                                        room.roomType?.basePrice}
                                    /night
                                </p>
                            </div>


                            <hr />


                            <div>
                                <p className="text-gray-500 text-sm">
                                    Check-in
                                </p>

                                <p className="font-semibold">
                                    {checkInDate}
                                </p>
                            </div>


                            <div>
                                <p className="text-gray-500 text-sm">
                                    Check-out
                                </p>

                                <p className="font-semibold">
                                    {checkOutDate}
                                </p>
                            </div>


                            <div>
                                <p className="text-gray-500 text-sm">
                                    Capacity
                                </p>

                                <p className="font-semibold">
                                    {room.roomType?.capacity ||
                                        "N/A"}{" "}
                                    guests
                                </p>
                            </div>

                        </div>

                    </div>


                    {/* -------------------------------- */}
                    {/* BOOKING FORM */}
                    {/* -------------------------------- */}

                    <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">

                        <form onSubmit={handleSubmit}>

                            <h2 className="text-xl font-bold mb-5">
                                Guest Details
                            </h2>


                            {/* NAME */}

                            <div className="mb-4">

                                <label className="block font-semibold mb-2">
                                    Full Name *
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter guest name"
                                    required
                                    className="w-full border rounded-lg p-3"
                                />

                            </div>


                            {/* EMAIL */}

                            <div className="mb-4">

                                <label className="block font-semibold mb-2">
                                    Email *
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter email"
                                    required
                                    className="w-full border rounded-lg p-3"
                                />

                            </div>


                            {/* PHONE */}

                            <div className="mb-4">

                                <label className="block font-semibold mb-2">
                                    Phone *
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    required
                                    className="w-full border rounded-lg p-3"
                                />

                            </div>


                            {/* ADDRESS */}

                            <div className="mb-4">

                                <label className="block font-semibold mb-2">
                                    Address
                                </label>

                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter address"
                                    rows="3"
                                    className="w-full border rounded-lg p-3"
                                />

                            </div>


                            {/* ID PROOF */}

                            <div className="grid md:grid-cols-2 gap-4 mb-4">

                                <div>

                                    <label className="block font-semibold mb-2">
                                        ID Proof Type
                                    </label>

                                    <select
                                        name="idProofType"
                                        value={formData.idProofType}
                                        onChange={handleChange}
                                        className="w-full border rounded-lg p-3"
                                    >

                                        <option value="Aadhar">
                                            Aadhar
                                        </option>

                                        <option value="Passport">
                                            Passport
                                        </option>

                                        <option value="Driving License">
                                            Driving License
                                        </option>

                                        <option value="Voter ID">
                                            Voter ID
                                        </option>

                                    </select>

                                </div>


                                <div>

                                    <label className="block font-semibold mb-2">
                                        ID Proof Number
                                    </label>

                                    <input
                                        type="text"
                                        name="idProofNumber"
                                        value={formData.idProofNumber}
                                        onChange={handleChange}
                                        placeholder="Enter ID number"
                                        className="w-full border rounded-lg p-3"
                                    />

                                </div>

                            </div>


                            {/* GUEST COUNT */}

                            <div className="grid md:grid-cols-2 gap-4 mb-4">

                                <div>

                                    <label className="block font-semibold mb-2">
                                        Adults *
                                    </label>

                                    <input
                                        type="number"
                                        name="adults"
                                        min="1"
                                        value={formData.adults}
                                        onChange={handleChange}
                                        className="w-full border rounded-lg p-3"
                                    />

                                </div>


                                <div>

                                    <label className="block font-semibold mb-2">
                                        Children
                                    </label>

                                    <input
                                        type="number"
                                        name="children"
                                        min="0"
                                        value={formData.children}
                                        onChange={handleChange}
                                        className="w-full border rounded-lg p-3"
                                    />

                                </div>

                            </div>


                            {/* SPECIAL REQUEST */}

                            <div className="mb-5">

                                <label className="block font-semibold mb-2">
                                    Special Requests
                                </label>

                                <textarea
                                    name="specialRequests"
                                    value={formData.specialRequests}
                                    onChange={handleChange}
                                    placeholder="Any special request..."
                                    rows="3"
                                    className="w-full border rounded-lg p-3"
                                />

                            </div>


                            {/* ERROR */}

                            {message && (

                                <div className="mb-5 bg-red-100 text-red-700 p-3 rounded-lg">
                                    {message}
                                </div>

                            )}


                            {/* SUBMIT */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                            >

                                {loading
                                    ? "Creating Booking..."
                                    : "Confirm Booking"
                                }

                            </button>

                        </form>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default BookRoom;