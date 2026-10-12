import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Rooms = () => {
    const navigate = useNavigate();

    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const searchRooms = async () => {
        try {
            setMessage("");

            if (!checkInDate || !checkOutDate) {
                setMessage(
                    "Please select check-in and check-out dates"
                );
                return;
            }

            if (checkOutDate <= checkInDate) {
                setMessage(
                    "Check-out date must be after check-in date"
                );
                return;
            }

            setLoading(true);

            const token =
                localStorage.getItem("token");

            const response = await axios.get(
                "http://localhost:5000/api/bookings/available-rooms",
                {
                    params: {
                        checkInDate,
                        checkOutDate,
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                setRooms(response.data.rooms);

                if (response.data.rooms.length === 0) {
                    setMessage(
                        "No rooms available for selected dates"
                    );
                }
            }

        } catch (error) {

            console.error(
                "Search Rooms Error:",
                error
            );

            setMessage(
                error.response?.data?.message ||
                "Unable to search rooms"
            );

        } finally {
            setLoading(false);
        }
    };


    const handleBookRoom = (room) => {

        navigate("/book-room", {
            state: {
                room,
                checkInDate,
                checkOutDate,
            },
        });

    };


    return (
        <div className="min-h-screen bg-gray-100 p-6">

            <div className="max-w-6xl mx-auto">

                <h1 className="text-4xl font-bold mb-2">
                    Find a Room
                </h1>

                <p className="text-gray-600 mb-6">
                    Select your dates to find available rooms.
                </p>


                {/* SEARCH */}

                <div className="bg-white p-6 rounded-xl shadow">

                    <div className="grid md:grid-cols-2 gap-4">

                        <div>

                            <label className="block mb-2 font-semibold">
                                Check-in Date
                            </label>

                            <input
                                type="date"
                                value={checkInDate}
                                onChange={(e) =>
                                    setCheckInDate(e.target.value)
                                }
                                className="w-full border p-3 rounded"
                            />

                        </div>


                        <div>

                            <label className="block mb-2 font-semibold">
                                Check-out Date
                            </label>

                            <input
                                type="date"
                                value={checkOutDate}
                                onChange={(e) =>
                                    setCheckOutDate(e.target.value)
                                }
                                className="w-full border p-3 rounded"
                            />

                        </div>

                    </div>


                    <button
                        onClick={searchRooms}
                        disabled={loading}
                        className="mt-5 bg-blue-600 text-white px-6 py-3 rounded-lg"
                    >

                        {loading
                            ? "Searching..."
                            : "Search Available Rooms"
                        }

                    </button>


                    {message && (
                        <p className="mt-4 text-red-600">
                            {message}
                        </p>
                    )}

                </div>


                {/* ROOMS */}

                <div className="grid md:grid-cols-3 gap-6 mt-8">

                    {rooms.map((room) => (

                        <div
                            key={room._id}
                            className="bg-white rounded-xl shadow p-6"
                        >

                            <h2 className="text-xl font-bold">
                                Room {room.roomNumber}
                            </h2>

                            <p className="text-gray-600 mt-2">
                                Floor: {room.floor}
                            </p>

                            <p className="mt-2">
                                Type:{" "}
                                {room.roomType?.name}
                            </p>

                            <p className="mt-2">
                                Capacity:{" "}
                                {room.roomType?.capacity}
                            </p>

                            <p className="text-2xl font-bold mt-4">
                                ₹
                                {room.price ||
                                    room.roomType?.basePrice}
                                /night
                            </p>


                            <button
                                onClick={() =>
                                    handleBookRoom(room)
                                }
                                className="w-full mt-5 bg-green-600 text-white py-3 rounded-lg"
                            >
                                Book This Room
                            </button>

                        </div>

                    ))}

                </div>

            </div>

        </div>
    );
};

export default Rooms; 