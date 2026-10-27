import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const getHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const formatLocalDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getToday = () => formatLocalDate(new Date());

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatLocalDate(date);
};

const initialForm = {
  room: "",
  checkInDate: "",
  checkOutDate: "",
  adults: 1,
  children: 0,
  name: "",
  email: "",
  phone: "",
  address: "",
  idProofType: "Aadhar",
  idProofNumber: "",
  paymentMethod: "cash",
  paymentReceived: false,
  specialRequests: "",
};

const dateOnly = (value) => {
  if (!value) return "";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatLocalDate(date);
};

const formatDate = (value) => {
  const date = dateOnly(value);
  if (!date) return "—";

  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const getRoomType = (room) => {
  if (room?.roomType && typeof room.roomType === "object") {
    return room.roomType;
  }
  return {};
};

const getRoomNumber = (booking) => {
  const room = booking?.room;
  if (!room) return "—";
  if (typeof room === "string") return room;

  return room.roomNumber
    ? `Room ${room.roomNumber}`
    : "Room details unavailable";
};

const getGuest = (booking) => {
  const guest = booking?.guestDetails || {};
  const user =
    booking?.user && typeof booking.user === "object" ? booking.user : {};

  return {
    name: guest.name || user.name || "Guest",
    email: guest.email || user.email || "—",
    phone: guest.phone || user.phone || "—",
    address: guest.address || "",
    idProofType: guest.idProofType || "",
    idProofNumber: guest.idProofNumber || "",
  };
};

const getStatusClass = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    ["paid", "confirmed", "checked_in", "checked_out", "completed"].includes(
      value,
    )
  ) {
    return "bg-green-100 text-green-800";
  }

  if (["cancelled", "failed", "refunded"].includes(value)) {
    return "bg-red-100 text-red-800";
  }

  return "bg-amber-100 text-amber-800";
};

const isCancelled = (booking) =>
  String(booking?.bookingStatus || "").toLowerCase() === "cancelled";

const isPreviousBooking = (booking, today) => {
  const status = String(booking?.bookingStatus || "").toLowerCase();
  const checkout = dateOnly(booking?.checkOutDate);

  return (
    isCancelled(booking) ||
    ["checked_out", "completed"].includes(status) ||
    Boolean(checkout && checkout <= today)
  );
};

const getBookingSource = (booking) => {
  if (booking?.createdBy) {
    const creator =
      typeof booking.createdBy === "object"
        ? booking.createdBy.name || "Staff"
        : "Staff";

    return { label: "Admin / Staff", person: creator };
  }

  if (booking?.user) {
    const user =
      typeof booking.user === "object"
        ? booking.user.name || "Customer"
        : "Customer";

    return { label: "Customer Online", person: user };
  }

  return { label: "Walk-in / Reception", person: "Reception" };
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const printBookingReceipt = (booking) => {
  const guest = getGuest(booking);
  const room =
    booking?.room && typeof booking.room === "object" ? booking.room : {};
  const source = getBookingSource(booking);

  const receiptWindow = window.open("", "_blank", "width=800,height=750");

  if (!receiptWindow) {
    window.alert("Please allow pop-ups to print the receipt.");
    return;
  }

  const rows = [
    ["Booking Number", booking.bookingNumber || booking._id],
    ["Guest Name", guest.name],
    ["Email", guest.email],
    ["Phone", guest.phone],
    ["Room", room.roomNumber || "—"],
    ["Floor", room.floor ?? "—"],
    ["Check-in", formatDate(booking.checkInDate)],
    ["Check-out", formatDate(booking.checkOutDate)],
    ["Nights", booking.numberOfNights ?? "—"],
    ["Adults", booking.adults ?? 1],
    ["Children", booking.children ?? 0],
    ["Room Charges", money(booking.roomCharges)],
    ["Tax", money(booking.taxAmount)],
    ["Discount", money(booking.discountAmount)],
    ["Total Amount", money(booking.totalAmount)],
    ["Payment Method", booking.paymentMethod || "—"],
    ["Payment Status", booking.paymentStatus || "pending"],
    ["Booking Status", booking.bookingStatus || "pending"],
    ["Booked By", `${source.label} - ${source.person}`],
  ];

  receiptWindow.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Booking Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 28px; color: #222; }
        h1, h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        td:first-child { font-weight: bold; width: 40%; }
        .footer { text-align: center; margin-top: 35px; color: #555; }
      </style>
    </head>
    <body>
      <h1>Hotel &amp; Restaurant Management</h1>
      <h2>Room Booking Receipt</h2>
      <table>
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
          )
          .join("")}
      </table>
      <p class="footer">Thank you for choosing our hotel.</p>
      <script>window.onload = function () { window.print(); };</script>
    </body>
    </html>
  `);

  receiptWindow.document.close();
};

export default function AdminRoomBooking() {
  const [form, setForm] = useState(initialForm);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [todayRooms, setTodayRooms] = useState([]);

  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [todayRoomsLoading, setTodayRoomsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [payingId, setPayingId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);

  const today = getToday();

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);

    try {
      const response = await axios.get(`${API}/bookings`, {
        headers: getHeaders(),
      });

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data?.bookings || data?.data?.bookings || [];

      setBookings(list);
    } catch (err) {
      setError(
        `${getErrorMessage(err)} Check GET /api/bookings and its permissions.`,
      );
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Availability is always requested using the currently selected date range.
  const loadRooms = useCallback(async () => {
    if (
      !form.checkInDate ||
      !form.checkOutDate ||
      form.checkOutDate <= form.checkInDate
    ) {
      setRooms([]);
      return;
    }

    setLoadingRooms(true);

    try {
      const response = await axios.get(`${API}/bookings/available-rooms`, {
        headers: getHeaders(),
        params: {
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
        },
      });

      const data = response.data;
      setRooms(
        Array.isArray(data)
          ? data
          : data?.rooms || data?.data?.rooms || data?.availableRooms || [],
      );
    } catch (err) {
      setRooms([]);
      setError(getErrorMessage(err));
    } finally {
      setLoadingRooms(false);
    }
  }, [form.checkInDate, form.checkOutDate]);

  const loadTodayAvailableRooms = useCallback(async () => {
    setTodayRoomsLoading(true);

    try {
      const response = await axios.get(`${API}/bookings/available-rooms`, {
        headers: getHeaders(),
        params: {
          checkInDate: getToday(),
          checkOutDate: getTomorrow(),
        },
      });

      const data = response.data;
      setTodayRooms(
        Array.isArray(data)
          ? data
          : data?.rooms || data?.availableRooms || data?.data?.rooms || [],
      );
    } catch (err) {
      setTodayRooms([]);
      setError(getErrorMessage(err));
    } finally {
      setTodayRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadTodayAvailableRooms();
  }, [loadBookings, loadTodayAvailableRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

const handleChange = (event) => {
  const { name, value, type, checked } = event.target;

  console.log("Input changed:", name, value);

  setForm((prev) => {
    const next = {
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "checkInDate") {
      next.room = "";

      if (next.checkOutDate && next.checkOutDate <= value) {
        next.checkOutDate = "";
      }
    }

    if (name === "checkOutDate") {
      next.room = "";
    }

    return next;
  });

  setError("");
  setSuccess("");
};

  const handleCreateBooking = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.checkInDate || !form.checkOutDate) {
      setError("Please select check-in and check-out dates.");
      return;
    }

    if (form.checkInDate < today) {
      setError("Check-in date cannot be in the past.");
      return;
    }

    if (form.checkOutDate <= form.checkInDate) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    if (!form.room) {
      setError("Please select an available room for these dates.");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Guest name, email and phone are required.");
      return;
    }

    if (!Number.isInteger(Number(form.adults)) || Number(form.adults) < 1) {
      setError("At least one adult is required.");
      return;
    }

    if (!Number.isInteger(Number(form.children)) || Number(form.children) < 0) {
      setError("Children must be zero or a positive whole number.");
      return;
    }

    if (!form.idProofNumber.trim()) {
      setError("ID proof number is required.");
      return;
    }

    setCreating(true);

    try {
      console.log("Selected form dates:", {
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
      });

      console.log("Submitting booking dates:", {
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
      });
      const payload = {
        room: form.room,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        adults: Number(form.adults),
        children: Number(form.children),
        guestDetails: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          idProofType: form.idProofType,
          idProofNumber: form.idProofNumber.trim(),
        },
        paymentMethod: form.paymentMethod,
        paymentReceived: Boolean(form.paymentReceived),
        specialRequests: form.specialRequests.trim(),
      };

      const response = await axios.post(
        `${API}/bookings/admin-create`,
        payload,
        { headers: getHeaders() },
      );

      setSuccess(
        response.data?.message ||
          "Booking created. Verify the confirmation email in your inbox.",
      );

      setForm(initialForm);
      setRooms([]);
      setShowForm(false);

      await Promise.all([loadBookings(), loadTodayAvailableRooms()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleMarkPaid = async (booking) => {
    const paymentMethod = paymentMethods[booking._id] || "cash";

    if (isCancelled(booking)) {
      setError("Cancelled bookings cannot be marked as paid.");
      return;
    }

    if (
      !window.confirm(
        `Confirm that ${money(booking.totalAmount)} has actually been received by ${paymentMethod.toUpperCase()}?`,
      )
    ) {
      return;
    }

    setPayingId(booking._id);
    setError("");
    setSuccess("");

    try {
      const response = await axios.patch(
        `${API}/bookings/${booking._id}/payment`,
        { paymentMethod },
        { headers: getHeaders() },
      );

      await loadBookings();
      setSuccess(response.data?.message || "Payment status updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayingId("");
    }
  };

  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return bookings
      .filter((booking) => {
        const previous = isPreviousBooking(booking, today);

        if (activeTab === "previous" && !previous) return false;
        if (activeTab === "upcoming" && previous) return false;

        if (filterDate && dateOnly(booking.checkInDate) !== filterDate) {
          return false;
        }

        if (normalizedSearch) {
          const guest = getGuest(booking);
          const source = getBookingSource(booking);

          const searchable = [
            booking.bookingNumber,
            guest.name,
            guest.email,
            guest.phone,
            getRoomNumber(booking),
            booking.bookingStatus,
            booking.paymentStatus,
            source.label,
            source.person,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!searchable.includes(normalizedSearch)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = dateOnly(a.checkInDate);
        const dateB = dateOnly(b.checkInDate);

        return activeTab === "upcoming"
          ? dateA.localeCompare(dateB)
          : dateB.localeCompare(dateA);
      });
  }, [bookings, search, filterDate, activeTab, today]);

  const upcomingCount = bookings.filter(
    (booking) => !isPreviousBooking(booking, today),
  ).length;

  const previousCount = bookings.length - upcomingCount;

  const renderPaymentActions = (booking) => {
    const pending =
      String(booking.paymentStatus || "pending").toLowerCase() === "pending";

    return (
      <div className="min-w-36 space-y-2">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
            booking.paymentStatus,
          )}`}
        >
          {booking.paymentStatus || "pending"}
        </span>

        <p className="text-xs text-gray-500">{booking.paymentMethod || "—"}</p>

        {pending && !isCancelled(booking) && (
          <div className="space-y-2">
            <select
              value={paymentMethods[booking._id] || "cash"}
              onChange={(event) =>
                setPaymentMethods((previous) => ({
                  ...previous,
                  [booking._id]: event.target.value,
                }))
              }
              className="w-full rounded-lg border p-2 text-xs"
              aria-label="Payment method"
            >
              <option value="cash">Cash received</option>
              <option value="upi">UPI received</option>
            </select>

            <button
              type="button"
              disabled={payingId === booking._id}
              onClick={() => handleMarkPaid(booking)}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {payingId === booking._id ? "Updating..." : "Mark Paid"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => printBookingReceipt(booking)}
          className="w-full rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-100"
        >
          Print Receipt
        </button>
      </div>
    );
  };

  const renderBookingDetails = (booking) => {
    const guest = getGuest(booking);
    const source = getBookingSource(booking);

    return (
      <>
        <p className="font-bold">{booking.bookingNumber || booking._id}</p>
        <p className="mt-1 font-medium">{guest.name}</p>
        <p className="break-all text-xs text-gray-500">{guest.email}</p>
        <p className="text-xs text-gray-500">{guest.phone}</p>

        {guest.address && (
          <p className="mt-1 text-xs text-gray-500">Address: {guest.address}</p>
        )}

        {guest.idProofType && (
          <p className="mt-1 text-xs text-gray-500">
            ID: {guest.idProofType}
            {guest.idProofNumber ? ` • ${guest.idProofNumber}` : ""}
          </p>
        )}

        <div className="mt-2 rounded bg-gray-50 p-2 text-xs">
          <p className="font-semibold">Booked By: {source.label}</p>
          <p className="text-gray-600">{source.person}</p>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-800 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Room Booking</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage bookings, guest details, payments and receipts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                loadBookings();
                loadTodayAvailableRooms();
              }}
              disabled={loadingBookings || todayRoomsLoading}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm((value) => !value);
                setError("");
                setSuccess("");
              }}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              {showForm ? "Close Form" : "+ Create Booking"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Unable to complete request</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Today's Available Rooms
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Availability for {formatDate(getToday())} to{" "}
                {formatDate(getTomorrow())}
              </p>
            </div>

            <button
              type="button"
              onClick={loadTodayAvailableRooms}
              disabled={todayRoomsLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {todayRoomsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {todayRoomsLoading ? (
            <p className="py-5 text-center text-gray-500">
              Loading available rooms...
            </p>
          ) : todayRooms.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              No available rooms found for this date range.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {todayRooms.map((room) => {
                const type = getRoomType(room);

                return (
                  <div
                    key={room._id}
                    className="rounded-xl border border-green-200 bg-green-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900">
                        Room {room.roomNumber || room.number || "N/A"}
                      </h3>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        Available
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      Type: {type.name || room.type || "Standard"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Price: {money(room.price ?? type.basePrice)} / night
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Capacity: {type.capacity ?? "N/A"} guests
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showForm && (
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-xl font-bold">Create Guest Booking</h2>

            <form onSubmit={handleCreateBooking} className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold">Stay Details</h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">
                      Check-in Date *
                    </span>

                    <input
                      type="date"
                      name="checkInDate"
                      min={today}
                      value={form.checkInDate}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border p-2.5"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">
                      Check-out Date *
                    </span>

                    <input
                      type="date"
                      name="checkOutDate"
                      min={
                        form.checkInDate
                          ? getTomorrowFrom(form.checkInDate)
                          : getTomorrow()
                      }
                      value={form.checkOutDate}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border p-2.5"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Adults *</span>
                    <input
                      type="number"
                      name="adults"
                      min="1"
                      step="1"
                      value={form.adults}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border p-2.5"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Children</span>
                    <input
                      type="number"
                      name="children"
                      min="0"
                      step="1"
                      value={form.children}
                      onChange={handleChange}
                      className="w-full rounded-lg border p-2.5"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Available Room *</h3>
                  {loadingRooms && (
                    <span className="text-xs text-gray-500">
                      Checking availability...
                    </span>
                  )}
                </div>

                <select
                  name="room"
                  value={form.room}
                  onChange={handleChange}
                  required
                  disabled={
                    loadingRooms ||
                    !form.checkInDate ||
                    !form.checkOutDate ||
                    form.checkOutDate <= form.checkInDate
                  }
                  className="w-full rounded-lg border bg-white p-3 disabled:bg-gray-100"
                >
                  <option value="">
                    {!form.checkInDate || !form.checkOutDate
                      ? "Select dates first"
                      : "Select an available room"}
                  </option>

                  {rooms.map((room) => {
                    const type = getRoomType(room);

                    return (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber}
                        {room.floor !== undefined
                          ? ` | Floor ${room.floor}`
                          : ""}
                        {room.price != null || type.basePrice != null
                          ? ` | ${money(room.price ?? type.basePrice)} / night`
                          : ""}
                      </option>
                    );
                  })}
                </select>

                {!loadingRooms &&
                  form.checkInDate &&
                  form.checkOutDate &&
                  form.checkOutDate > form.checkInDate &&
                  rooms.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      No available rooms found for these dates.
                    </p>
                  )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Guest Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Guest Name *</span>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border p-2.5"
                      placeholder="Full name"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Email *</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border p-2.5"
                      placeholder="guest@example.com"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Phone *</span>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border p-2.5"
                      placeholder="Phone number"
                    />
                  </label>

                  <label className="text-sm sm:col-span-2 lg:col-span-3">
                    <span className="mb-1 block font-medium">Address *</span>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={2}
                      className="w-full rounded-lg border p-2.5"
                      placeholder="Guest address"
                      required
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">
                      ID Proof Type *
                    </span>
                    <select
                      name="idProofType"
                      value={form.idProofType}
                      onChange={handleChange}
                      className="w-full rounded-lg border bg-white p-2.5"
                    >
                      <option value="Aadhar">Aadhar</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium">
                      ID Proof Number *
                    </span>
                    <input
                      name="idProofNumber"
                      value={form.idProofNumber}
                      onChange={handleChange}
                      className="w-full rounded-lg border p-2.5"
                      placeholder="ID number"
                      required
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Payment Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">
                      Payment Method *
                    </span>
                    <select
                      name="paymentMethod"
                      value={form.paymentMethod}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border bg-white p-2.5"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <input
                      type="checkbox"
                      name="paymentReceived"
                      checked={form.paymentReceived}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span>
                      <span className="block font-semibold">
                        Payment received
                      </span>
                      <span className="text-gray-500">
                        Check only if payment was actually received.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Special Requests</span>
                <textarea
                  name="specialRequests"
                  value={form.specialRequests}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border p-2.5"
                  placeholder="Any special requirements..."
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={creating || loadingRooms}
                  className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {creating ? "Creating Booking..." : "Create Booking"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(initialForm);
                    setRooms([]);
                  }}
                  className="rounded-lg border px-6 py-3 font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold">Room Booking Records</h2>
              <p className="mt-1 text-sm text-gray-500">
                Upcoming and previous stays, guest details, payments and
                receipts.
              </p>
            </div>
            <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold">
              {bookings.length} Total Bookings
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                Search guest, phone, email or booking number
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookings..."
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">
                Filter by check-in date
              </span>
              <input
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="w-full rounded-lg border p-3"
              />
            </label>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                activeTab === "upcoming"
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              Upcoming ({upcomingCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("previous")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                activeTab === "previous"
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              Previous ({previousCount})
            </button>
          </div>

          {loadingBookings ? (
            <div className="rounded-xl bg-gray-50 p-10 text-center text-gray-500">
              Loading bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-10 text-center">
              <p className="font-semibold">No {activeTab} bookings found.</p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing the search text or date filter.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border lg:block">
                <table className="w-full min-w-[1350px] text-left text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3">Booking / Guest</th>
                      <th className="p-3">Room</th>
                      <th className="p-3">Check-in</th>
                      <th className="p-3">Check-out</th>
                      <th className="p-3">Guests</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Booking Status</th>
                      <th className="p-3">Payment / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBookings.map((booking) => (
                      <tr
                        key={booking._id}
                        className="align-top hover:bg-gray-50"
                      >
                        <td className="p-3">{renderBookingDetails(booking)}</td>
                        <td className="p-3">
                          {getRoomNumber(booking)}
                          {booking.room?.floor !== undefined && (
                            <p className="text-xs text-gray-500">
                              Floor {booking.room.floor}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap p-3">
                          {formatDate(booking.checkInDate)}
                        </td>
                        <td className="whitespace-nowrap p-3">
                          {formatDate(booking.checkOutDate)}
                        </td>
                        <td className="p-3">
                          {booking.adults ?? 1} Adult(s)
                          <p className="text-xs text-gray-500">
                            {booking.children ?? 0} Child(ren)
                          </p>
                        </td>
                        <td className="whitespace-nowrap p-3 font-semibold">
                          {money(booking.totalAmount)}
                          <p className="text-xs font-normal text-gray-500">
                            {booking.numberOfNights ?? "—"} night(s)
                          </p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(booking.bookingStatus)}`}
                          >
                            {booking.bookingStatus || "pending"}
                          </span>
                        </td>
                        <td className="p-3">{renderPaymentActions(booking)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {filteredBookings.map((booking) => (
                  <article key={booking._id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Booking Number</p>
                        <h3 className="font-bold">
                          {booking.bookingNumber || booking._id}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(booking.bookingStatus)}`}
                      >
                        {booking.bookingStatus || "pending"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      {renderBookingDetails(booking)}
                      <hr />
                      <p>
                        <b>Room:</b> {getRoomNumber(booking)}
                      </p>
                      <p>
                        <b>Check-in:</b> {formatDate(booking.checkInDate)}
                      </p>
                      <p>
                        <b>Check-out:</b> {formatDate(booking.checkOutDate)}
                      </p>
                      <p>
                        <b>Guests:</b> {booking.adults ?? 1} Adult(s),{" "}
                        {booking.children ?? 0} Child(ren)
                      </p>
                      <p>
                        <b>Total:</b> {money(booking.totalAmount)}
                      </p>
                      {renderPaymentActions(booking)}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function getTomorrowFrom(dateString) {
  if (!dateString) return getTomorrow();

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);

  return formatLocalDate(date);
}
