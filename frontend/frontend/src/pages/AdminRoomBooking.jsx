
import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

const getToday = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const initialForm = {
    room: "",
    checkInDate: "",
    checkOutDate: "",
    adults: 1,
    children: 0,
    guestDetails: {
        name: "",
        email: "",
        phone: "",
        address: "",
        idProofType: "Aadhar",
        idProofNumber: "",
    },
    paymentMethod: "cash",
    paymentReceived: false,
    specialRequests: "",
};

export default function AdminRoomBooking() {
    const [form, setForm] = useState(initialForm);
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [booking, setBooking] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const token = getToken();

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    // Fetch available rooms for the selected dates.
    useEffect(() => {
        const { checkInDate, checkOutDate } = form;

        setRooms([]);

        if (!checkInDate || !checkOutDate) {
            setLoadingRooms(false);
            return;
        }

        if (checkOutDate <= checkInDate) {
            setError("Check-out date must be after check-in date.");
            setLoadingRooms(false);
            return;
        }

        let cancelled = false;

        const loadRooms = async () => {
            setLoadingRooms(true);
            setError("");

            try {
                const response = await axios.get(
                    `${API}/bookings/available-rooms`,
                    {
                        params: {
                            checkInDate,
                            checkOutDate,
                        },
                        headers,
                    }
                );

                if (!cancelled) {
                    setRooms(response.data.rooms || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setRooms([]);
                    setError(
                        err.response?.data?.message ||
                            "Unable to load available rooms."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingRooms(false);
                }
            }
        };

        loadRooms();

        return () => {
            cancelled = true;
        };
    }, [form.checkInDate, form.checkOutDate, token]);

    // Update top-level form fields.
    const updateField = (name, value) => {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Update guest details.
    const updateGuest = (name, value) => {
        setForm((prev) => ({
            ...prev,
            guestDetails: {
                ...prev.guestDetails,
                [name]: value,
            },
        }));
    };

    // Selected room.
    const selectedRoom = rooms.find(
        (room) => room._id === form.room
    );

    // Calculate nights using date-only values.
    const nights =
        form.checkInDate &&
        form.checkOutDate &&
        form.checkOutDate > form.checkInDate
            ? Math.round(
                  (
                      new Date(`${form.checkOutDate}T00:00:00`) -
                      new Date(`${form.checkInDate}T00:00:00`)
                  ) /
                      (1000 * 60 * 60 * 24)
              )
            : 0;

    const price = selectedRoom
        ? Number(
              selectedRoom.price ??
                  selectedRoom.roomType?.basePrice ??
                  0
          )
        : 0;

    const roomCharges = price * nights;
    const tax = Math.round(roomCharges * 0.18 * 100) / 100;
    const total = roomCharges + tax;

    // Create admin booking.
    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setMessage("");
        setBooking(null);

        if (!token) {
            setError("Login session not found. Please log in again.");
            return;
        }

        if (!form.room) {
            setError("Please select an available room.");
            return;
        }

        if (form.checkOutDate <= form.checkInDate) {
            setError("Check-out date must be after check-in date.");
            return;
        }

        if (!form.guestDetails.idProofNumber.trim()) {
            setError("Please enter the guest's ID proof number.");
            return;
        }

        if (
            form.paymentReceived !== true &&
            form.paymentReceived !== false
        ) {
            setError("Please confirm the payment status.");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                ...form,
                adults: Number(form.adults),
                children: Number(form.children),
                guestDetails: {
                    ...form.guestDetails,
                    name: form.guestDetails.name.trim(),
                    email: form.guestDetails.email.trim().toLowerCase(),
                    phone: form.guestDetails.phone.trim(),
                    address: form.guestDetails.address.trim(),
                    idProofType: form.guestDetails.idProofType,
                    idProofNumber:
                        form.guestDetails.idProofNumber.trim(),
                },
            };

            const response = await axios.post(
                `${API}/bookings/admin-create`,
                payload,
                { headers }
            );

            setBooking(response.data.booking);
            setShowForm(false);
            setMessage(
                response.data.message ||
                    "Room booking created successfully."
            );

            setForm({
                ...initialForm,
                guestDetails: { ...initialForm.guestDetails },
            });

            setRooms([]);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to create booking."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl p-4 md:p-8">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">Admin Room Booking</h1>
                    <p className="text-gray-500">Create a room booking for a walk-in or phone customer.</p>
                </div>
                <button type="button" className="add-form-trigger" onClick={() => setShowForm((open) => !open)}>
                    {showForm ? "Close form" : "+ Create Booking"}
                </button>
            </header>

            {message && (
                <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
                    {message}
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
                    {error}
                </div>
            )}

            {booking && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
                    <h2 className="mb-3 text-lg font-semibold text-green-900">
                        Booking Created Successfully
                    </h2>

                    <p>
                        <strong>Booking Number:</strong>{" "}
                        {booking.bookingNumber}
                    </p>

                    <p>
                        <strong>Guest:</strong>{" "}
                        {booking.guestDetails?.name}
                    </p>

                    <p>
                        <strong>Room:</strong>{" "}
                        {booking.room?.roomNumber || "—"}
                    </p>

                    <p>
                        <strong>ID Proof:</strong>{" "}
                        {booking.guestDetails?.idProofType || "—"}
                    </p>

                    <p>
                        <strong>Payment Method:</strong>{" "}
                        {booking.paymentMethod?.toUpperCase()}
                    </p>

                    <p>
                        <strong>Payment Status:</strong>{" "}
                        {booking.paymentStatus}
                    </p>

                    <p>
                        <strong>Booking Status:</strong>{" "}
                        {booking.bookingStatus}
                    </p>

                    <p className="mt-2 text-lg font-bold">
                        Total: ₹
                        {Number(booking.totalAmount || 0).toFixed(2)}
                    </p>
                </div>
            )}

            {showForm && <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-xl border bg-white p-5 shadow-sm md:p-7"
            >
                {/* Guest Details */}
                <section>
                    <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-800">
                        Guest Details
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-gray-700">
                            Full Name *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="text"
                                placeholder="Enter guest full name"
                                value={form.guestDetails.name}
                                onChange={(e) =>
                                    updateGuest("name", e.target.value)
                                }
                                autoComplete="name"
                                required
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            Email Address *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="email"
                                placeholder="Enter email address"
                                value={form.guestDetails.email}
                                onChange={(e) =>
                                    updateGuest("email", e.target.value)
                                }
                                autoComplete="email"
                                required
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            Phone Number *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="tel"
                                placeholder="Enter phone number"
                                value={form.guestDetails.phone}
                                onChange={(e) =>
                                    updateGuest("phone", e.target.value)
                                }
                                autoComplete="tel"
                                required
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            Address
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="text"
                                placeholder="Enter address (optional)"
                                value={form.guestDetails.address}
                                onChange={(e) =>
                                    updateGuest("address", e.target.value)
                                }
                                autoComplete="street-address"
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            ID Proof Type *
                            <select
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                value={form.guestDetails.idProofType}
                                onChange={(e) =>
                                    updateGuest("idProofType", e.target.value)
                                }
                                required
                            >
                                <option value="Aadhar">Aadhar Card</option>
                                <option value="Passport">Passport</option>
                                <option value="Driving License">
                                    Driving License
                                </option>
                                <option value="Voter ID">Voter ID</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            ID Proof Number *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="text"
                                placeholder="Enter ID proof number"
                                value={form.guestDetails.idProofNumber}
                                onChange={(e) =>
                                    updateGuest(
                                        "idProofNumber",
                                        e.target.value
                                    )
                                }
                                autoComplete="off"
                                required
                            />
                        </label>
                    </div>
                </section>

                {/* Stay Details */}
                <section>
                    <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-800">
                        Stay Details
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-gray-700">
                            Check-in Date *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="date"
                                min={getToday()}
                                value={form.checkInDate}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    setForm((prev) => ({
                                        ...prev,
                                        checkInDate: value,
                                        checkOutDate:
                                            prev.checkOutDate &&
                                            prev.checkOutDate > value
                                                ? prev.checkOutDate
                                                : "",
                                        room: "",
                                    }));
                                }}
                                required
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            Check-out Date *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="date"
                                min={form.checkInDate || getToday()}
                                value={form.checkOutDate}
                                onChange={(e) => {
                                    setForm((prev) => ({
                                        ...prev,
                                        checkOutDate: e.target.value,
                                        room: "",
                                    }));
                                }}
                                required
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700 md:col-span-2">
                            Available Room *
                            <select
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                value={form.room}
                                onChange={(e) =>
                                    updateField("room", e.target.value)
                                }
                                disabled={
                                    loadingRooms ||
                                    !form.checkInDate ||
                                    !form.checkOutDate
                                }
                                required
                            >
                                <option value="">
                                    {!form.checkInDate ||
                                    !form.checkOutDate
                                        ? "Select dates first"
                                        : loadingRooms
                                          ? "Loading available rooms..."
                                          : "Select an available room"}
                                </option>

                                {rooms.map((room) => {
                                    const roomPrice = Number(
                                        room.price ??
                                            room.roomType?.basePrice ??
                                            0
                                    );

                                    return (
                                        <option
                                            key={room._id}
                                            value={room._id}
                                        >
                                            Room {room.roomNumber} —{" "}
                                            {room.roomType?.name || "Room"} — ₹
                                            {roomPrice}/night
                                        </option>
                                    );
                                })}
                            </select>

                            {!loadingRooms &&
                                form.checkInDate &&
                                form.checkOutDate &&
                                form.checkOutDate > form.checkInDate &&
                                rooms.length === 0 && (
                                    <span className="mt-2 block text-sm text-amber-700">
                                        No available rooms for these dates.
                                    </span>
                                )}
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            Adults *
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="number"
                                min="1"
                                step="1"
                                value={form.adults}
                                onChange={(e) =>
                                    updateField("adults", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label className="text-sm font-medium text-gray-700">
                            Children
                            <input
                                className="mt-1 block w-full rounded-lg border p-3 font-normal"
                                type="number"
                                min="0"
                                step="1"
                                value={form.children}
                                onChange={(e) =>
                                    updateField("children", e.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                </section>

                {/* Payment Details */}
                <section>
                    <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-800">
                        Payment Details
                    </h2>

                    <label className="block text-sm font-medium text-gray-700">
                        Payment Method *
                        <select
                            className="mt-1 block w-full rounded-lg border p-3 font-normal"
                            value={form.paymentMethod}
                            onChange={(e) =>
                                updateField("paymentMethod", e.target.value)
                            }
                            required
                        >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                        </select>
                    </label>

                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={form.paymentReceived}
                            onChange={(e) =>
                                updateField(
                                    "paymentReceived",
                                    e.target.checked
                                )
                            }
                        />

                        <span>
                            <span className="block font-medium text-gray-800">
                                Payment received
                            </span>
                            <span className="mt-1 block text-sm text-gray-500">
                                Mark this only after confirming cash receipt
                                or successful UPI payment.
                            </span>
                        </span>
                    </label>
                </section>

                {/* Booking Summary */}
                <section>
                    <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-800">
                        Booking Summary
                    </h2>

                    <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
                        <div className="flex justify-between gap-4">
                            <span>Price per night</span>
                            <span>₹{price.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between gap-4">
                            <span>Number of nights</span>
                            <span>{nights}</span>
                        </div>

                        <div className="flex justify-between gap-4">
                            <span>Room charges</span>
                            <span>₹{roomCharges.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between gap-4">
                            <span>Tax (18%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between gap-4 border-t pt-3 text-lg font-bold">
                            <span>Total Amount</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                        This is a preview. The backend calculates the final
                        booking amount.
                    </p>
                </section>

                {/* Special Requests */}
                <section>
                    <label className="block text-sm font-medium text-gray-700">
                        Special Requests
                        <textarea
                            className="mt-1 block w-full rounded-lg border p-3 font-normal"
                            rows={3}
                            placeholder="Any additional guest requests..."
                            value={form.specialRequests}
                            onChange={(e) =>
                                updateField(
                                    "specialRequests",
                                    e.target.value
                                )
                            }
                        />
                    </label>
                </section>

                <button
                    type="submit"
                    disabled={submitting || loadingRooms}
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting
                        ? "Creating Booking..."
                        : "Create Room Booking"}
                </button>
            </form>}
        </div>
    );
}
