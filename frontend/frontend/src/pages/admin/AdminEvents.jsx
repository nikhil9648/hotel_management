import { useEffect, useState } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const initialForm = {
  title: "",
  description: "",
  poster: "",
  venue: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  ticketPrice: "0",
  capacity: "100",
  status: "draft",
};

const getDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
};

const AdminEvents = () => {
  const [form, setForm] = useState(initialForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedGuestEvent, setSelectedGuestEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  // Public registration page URL.
  // Make sure this route exists in App.jsx.
  const getRegistrationLink = (event) =>
    `${window.location.origin}/events/${event._id}/register`;

  const loadEvents = async () => {
    setFetching(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/events/admin`, authConfig);

      setEvents(response.data.events || response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load admin events.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateDates = (data) => {
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    const deadline = new Date(data.registrationDeadline).getTime();

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !Number.isFinite(deadline)
    ) {
      return "Please enter all event dates and times.";
    }

    if (end <= start) {
      return "Event end date and time must be after the start.";
    }

    if (deadline > start) {
      return "Registration deadline must not be after the event starts.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateDates(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        ticketPrice: Number(form.ticketPrice),
        capacity: Number(form.capacity),
      };

      const response = await axios.post(
        `${API_URL}/events`,
        payload,
        authConfig,
      );

      setMessage(response.data.message || "Event created successfully.");

      setForm(initialForm);
      setShowCreateForm(false);
      await loadEvents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create event. Check the form and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (item) => {
    setError("");
    setMessage("");

    setEditingEvent({
      ...item,
      startDate: getDateTimeInput(item.startDate),
      endDate: getDateTimeInput(item.endDate),
      registrationDeadline: getDateTimeInput(item.registrationDeadline),
      ticketPrice: String(item.ticketPrice ?? 0),
      capacity: String(item.capacity ?? 1),
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditingEvent((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const saveEventChanges = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateDates(editingEvent);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      Number(editingEvent.capacity) < Number(editingEvent.bookedTickets || 0)
    ) {
      setError("Capacity cannot be lower than already booked tickets.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: editingEvent.title,
        description: editingEvent.description,
        poster: editingEvent.poster || "",
        venue: editingEvent.venue,
        startDate: editingEvent.startDate,
        endDate: editingEvent.endDate,
        registrationDeadline: editingEvent.registrationDeadline,
        ticketPrice: Number(editingEvent.ticketPrice),
        capacity: Number(editingEvent.capacity),
        status: editingEvent.status,
      };

      const response = await axios.put(
        `${API_URL}/events/${editingEvent._id}`,
        payload,
        authConfig,
      );

      setMessage(response.data.message || "Event updated successfully.");

      setEditingEvent(null);
      await loadEvents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update event. Check your backend update route.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyRegistrationLink = async (item) => {
    const link = getRegistrationLink(item);

    try {
      await navigator.clipboard.writeText(link);
      setMessage("Registration link copied successfully!");
      setError("");
    } catch {
      setError(
        `Unable to copy automatically. Copy this link manually: ${link}`,
      );
    }
  };

  const openGuestList = async (item) => {
    setSelectedGuestEvent(item);
    setGuests([]);
    setGuestError("");
    setGuestLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/events/${item._id}/guests`,
        authConfig,
      );

      setGuests(response.data.guests || []);
    } catch (err) {
      setGuestError(
        err.response?.data?.message || "Unable to load guest list.",
      );
    } finally {
      setGuestLoading(false);
    }
  };

  const printGuestList = () => {
    if (!selectedGuestEvent || guests.length === 0) return;

    const escapeHtml = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character],
      );

    const rows = guests
      .map(
        (guest, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(guest.customerName)}</td>
      <td>${escapeHtml(guest.customerEmail)}</td>
      <td>${escapeHtml(guest.customerPhone)}</td>
      <td>${guest.attendees.map(escapeHtml).join(", ")}</td>
      <td>${Number(guest.quantity || 0)}</td>
      <td>₹${Number(guest.totalAmount || 0).toFixed(2)}</td>
      <td>Paid</td>
    </tr>
  `,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      setGuestError(
        "Print window blocked. Please allow pop-ups and try again.",
      );
      return;
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Guest List - ${escapeHtml(selectedGuestEvent.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          h1 { margin-bottom: 8px; }
          p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; }
          th { background: #eee; }
          tr { page-break-inside: avoid; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Paid Event Guest List</h1>
        <p><strong>Event:</strong> ${escapeHtml(selectedGuestEvent.title)}</p>
        <p><strong>Venue:</strong> ${escapeHtml(selectedGuestEvent.venue)}</p>
        <p><strong>Paid bookings:</strong> ${guests.length}</p>
        <p><strong>Paid attendees:</strong> ${guests.reduce((sum, guest) => sum + Number(guest.quantity || 0), 0)}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Attendee Names</th>
              <th>Qty</th>
              <th>Amount</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();
  };

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-gray-800 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Event Management</h1>
            <p className="mt-2 text-gray-600">Create and manage hotel events and ticket registrations.</p>
          </div>
          <button type="button" className="add-form-trigger" onClick={() => setShowCreateForm((open) => !open)}>
            {showCreateForm ? "Close form" : "+ Create Event"}
          </button>
        </header>

        {message && (
          <div className="mt-4 break-words rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 break-words rounded-lg bg-red-100 p-3 text-red-800">
            {error}
          </div>
        )}

        {/* Create Event Form */}
        {showCreateForm && <form
          onSubmit={handleSubmit}
          className="add-form-panel mt-6 space-y-5 rounded-xl bg-white p-5 shadow sm:p-6"
        >
          <h2 className="text-xl font-semibold">Create New Event</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-medium">Event Title *</span>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Garba Night 2026"
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">Venue *</span>
              <input
                name="venue"
                value={form.venue}
                onChange={handleChange}
                required
                placeholder="Hotel Banquet Hall"
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block font-medium">Description *</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the event..."
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block font-medium">Poster Image URL</span>
              <input
                type="url"
                name="poster"
                value={form.poster}
                onChange={handleChange}
                placeholder="https://example.com/event-poster.jpg"
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">
                Start Date & Time *
              </span>
              <input
                type="datetime-local"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">End Date & Time *</span>
              <input
                type="datetime-local"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">
                Registration Deadline *
              </span>
              <input
                type="datetime-local"
                name="registrationDeadline"
                value={form.registrationDeadline}
                onChange={handleChange}
                required
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">Ticket Price (₹) *</span>
              <input
                type="number"
                name="ticketPrice"
                value={form.ticketPrice}
                onChange={handleChange}
                min="0"
                max="1000000"
                step="0.01"
                required
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">Total Capacity *</span>
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                min="1"
                step="1"
                required
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">Initial Status</span>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </form>}

        {/* Existing Events */}
        <section className="mt-8 rounded-xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Existing Events</h2>

            <button
              type="button"
              onClick={loadEvents}
              disabled={fetching}
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              {fetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {fetching ? (
            <p className="mt-5">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="mt-5 text-gray-500">No events found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Event</th>
                    <th className="p-3">Start</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Tickets</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {events.map((item) => (
                    <tr key={item._id} className="border-b align-top">
                      <td className="p-3">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-gray-500">
                          {item.venue}
                        </div>
                      </td>

                      <td className="p-3">{formatDate(item.startDate)}</td>

                      <td className="p-3">
                        ₹{Number(item.ticketPrice).toFixed(2)}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-green-700">
                          {item.paidTickets || 0} / {item.capacity}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Paid attendees
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                          {item.status}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex min-w-56 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Edit Event
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedEvent(item)}
                            className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                          >
                            Show QR
                          </button>

                          <button
                            type="button"
                            onClick={() => copyRegistrationLink(item)}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            Copy Registration Link
                          </button>

                          <button
                            type="button"
                            onClick={() => openGuestList(item)}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                          >
                            View Guest List
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={saveEventChanges}
            className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 text-gray-800 shadow-xl"
          >
            <h2 className="text-2xl font-bold">Edit Event</h2>

            <label className="block">
              Event Title *
              <input
                name="title"
                value={editingEvent.title || ""}
                onChange={handleEditChange}
                required
                maxLength={150}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              Venue *
              <input
                name="venue"
                value={editingEvent.venue || ""}
                onChange={handleEditChange}
                required
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              Description *
              <textarea
                name="description"
                value={editingEvent.description || ""}
                onChange={handleEditChange}
                required
                rows={3}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              Poster Image URL
              <input
                type="url"
                name="poster"
                value={editingEvent.poster || ""}
                onChange={handleEditChange}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["startDate", "Start Date & Time"],
                ["endDate", "End Date & Time"],
                ["registrationDeadline", "Registration Deadline"],
              ].map(([name, label]) => (
                <label key={name} className="block">
                  {label} *
                  <input
                    type="datetime-local"
                    name={name}
                    value={editingEvent[name] || ""}
                    onChange={handleEditChange}
                    required
                    className="mt-1 w-full rounded-lg border p-3"
                  />
                </label>
              ))}

              <label className="block">
                Ticket Price (₹) *
                <input
                  type="number"
                  name="ticketPrice"
                  value={editingEvent.ticketPrice}
                  onChange={handleEditChange}
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block">
                Capacity *
                <input
                  type="number"
                  name="capacity"
                  value={editingEvent.capacity}
                  onChange={handleEditChange}
                  min={Math.max(1, Number(editingEvent.bookedTickets || 0))}
                  step="1"
                  required
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block">
                Status
                <select
                  name="status"
                  value={editingEvent.status}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-lg border p-3"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                disabled={loading}
                className="rounded-lg border px-5 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-center text-gray-800 shadow-xl">
            <h2 className="text-xl font-bold">{selectedEvent.title}</h2>

            <p className="mt-2 text-gray-600">Event Registration QR Code</p>

            <div className="my-6 flex justify-center">
              <QRCodeSVG
                value={getRegistrationLink(selectedEvent)}
                size={240}
                level="H"
                includeMargin
              />
            </div>

            <p className="break-all text-sm text-gray-600">
              {getRegistrationLink(selectedEvent)}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => copyRegistrationLink(selectedEvent)}
                className="rounded-lg bg-green-600 px-4 py-2 text-white"
              >
                Copy Link
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              >
                Print QR
              </button>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg border px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


{selectedGuestEvent && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
    <div className="max-h-[90vh] w-full max-w-7xl overflow-auto rounded-xl bg-white p-5 text-gray-800 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            Registered Guest List
          </h2>
          <p className="mt-1 text-gray-600">
            {selectedGuestEvent.title}
          </p>
          <p className="text-sm text-gray-500">
            Only successfully paid registrations
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedGuestEvent(null)}
          className="rounded-lg border px-4 py-2"
        >
          Close
        </button>
      </div>

      {!guestLoading && !guestError && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">Paid bookings</p>
            <p className="text-2xl font-bold text-green-800">
              {guests.length}
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Paid attendees</p>
            <p className="text-2xl font-bold text-blue-800">
              {guests.reduce(
                (sum, guest) => sum + Number(guest.quantity || 0),
                0
              )}
            </p>
          </div>
        </div>
      )}

      {guestLoading && (
        <p className="py-8 text-center">Loading guest list...</p>
      )}

      {guestError && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
          {guestError}
        </p>
      )}

      {!guestLoading && !guestError && (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3">#</th>
                  <th className="border p-3">Customer Name</th>
                  <th className="border p-3">Email</th>
                  <th className="border p-3">Phone</th>
                  <th className="border p-3">Attendee Names</th>
                  <th className="border p-3">Tickets</th>
                  <th className="border p-3">Amount</th>
                  <th className="border p-3">Payment</th>
                </tr>
              </thead>

              <tbody>
                {guests.map((guest, index) => (
                  <tr key={guest.registrationId}>
                    <td className="border p-3">{index + 1}</td>
                    <td className="border p-3">
                      {guest.customerName}
                    </td>
                    <td className="border p-3">
                      {guest.customerEmail}
                    </td>
                    <td className="border p-3">
                      {guest.customerPhone || "—"}
                    </td>
                    <td className="border p-3">
                      {guest.attendees?.join(", ") || "—"}
                    </td>
                    <td className="border p-3">
                      {guest.quantity}
                    </td>
                    <td className="border p-3">
                      ₹{Number(guest.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="border p-3 font-medium text-green-700">
                      Paid
                    </td>
                  </tr>
                ))}

                {guests.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="border p-6 text-center text-gray-500"
                    >
                      No paid registrations found for this event.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={guests.length === 0}
              onClick={printGuestList}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Print Guest List
            </button>

            <button
              type="button"
              onClick={() => setSelectedGuestEvent(null)}
              className="rounded-lg border px-5 py-3"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}

    </div>
  );
};

export default AdminEvents;
