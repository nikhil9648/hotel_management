
import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/rooms";

const STATUSES = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "maintenance",
];

const initialForm = {
  roomNumber: "",
  roomType: "",
  floor: 1,
  price: "",
  amenities: "",
  notes: "",
};

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    roomType: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.roomType) params.roomType = filters.roomType;

      const [roomsResponse, typesResponse] = await Promise.all([
        axios.get(API_URL, { headers, params }),
        axios.get(`${API_URL}/types`, { headers }),
      ]);

      setRooms(roomsResponse.data.rooms || []);
      setRoomTypes(typesResponse.data.roomTypes || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load rooms. Please check your server and login."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.status, filters.roomType]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (!form.roomType) {
      setError("Please select a room type.");
      setSaving(false);
      return;
    }

    const payload = {
      roomNumber: form.roomNumber.trim(),
      roomType: form.roomType,
      floor: Number(form.floor),
      price: Number(form.price),
      amenities: form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      notes: form.notes,
    };

    if (
      !payload.roomNumber ||
      !Number.isFinite(payload.floor) ||
      !Number.isFinite(payload.price) ||
      payload.price < 0
    ) {
      setError("Enter a valid room number, floor and price.");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, payload, {
          headers,
        });
        setMessage("Room updated successfully.");
      } else {
        await axios.post(API_URL, payload, { headers });
        setMessage("Room created successfully.");
      }

      resetForm();
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save room."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (room) => {
    setEditingId(room._id);
    setShowForm(true);
    setForm({
      roomNumber: room.roomNumber || "",
      roomType: room.roomType?._id || "",
      floor: room.floor ?? 1,
      price: room.price ?? "",
      amenities: Array.isArray(room.amenities)
        ? room.amenities.join(", ")
        : "",
      notes: room.notes || "",
    });

    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatusChange = async (roomId, status) => {
    setError("");
    setMessage("");

    try {
      await axios.patch(
        `${API_URL}/${roomId}/status`,
        { status },
        { headers }
      );

      setMessage("Room status updated successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update room status."
      );
    }
  };

  const handleActiveToggle = async (room) => {
    setError("");
    setMessage("");

    try {
      await axios.put(
        `${API_URL}/${room._id}`,
        { isActive: !room.isActive },
        { headers }
      );

      setMessage(
        `Room ${room.isActive ? "deactivated" : "activated"} successfully.`
      );
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change room active status."
      );
    }
  };

  const handleDelete = async (room) => {
    const confirmed = window.confirm(
      `Delete room ${room.roomNumber}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await axios.delete(`${API_URL}/${room._id}`, { headers });
      setMessage("Room deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete room."
      );
    }
  };

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(
    (room) => room.status === "available" && room.isActive
  ).length;
  const occupiedRooms = rooms.filter(
    (room) => room.status === "occupied"
  ).length;
  const inactiveRooms = rooms.filter(
    (room) => !room.isActive
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Room Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, update and manage hotel rooms.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm || editingId) resetForm();
              else { resetForm(); setShowForm(true); }
              setError("");
              setMessage("");
            }}
            className="add-form-trigger"
          >
            {showForm || editingId ? "Close form" : "+ Add New Room"}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Rooms Listed", totalRooms],
            ["Available & Active", availableRooms],
            ["Occupied", occupiedRooms],
            ["Inactive", inactiveRooms],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {value}
              </p>
            </div>
          ))}
        </div>

        {(showForm || editingId) && (
        <section className="add-form-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            {editingId ? "Edit Room" : "Create Room"}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Room Number *
              <input
                name="roomNumber"
                value={form.roomNumber}
                onChange={handleChange}
                required
                maxLength={30}
                placeholder="e.g. 101"
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Room Type *
              <select
                name="roomType"
                value={form.roomType}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="">Select room type</option>
                {roomTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name} — ₹{type.basePrice}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Floor *
              <input
                name="floor"
                type="number"
                value={form.floor}
                onChange={handleChange}
                required
                min="0"
                step="1"
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Price per Night (₹) *
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="e.g. 2500"
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Amenities
              <input
                name="amenities"
                value={form.amenities}
                onChange={handleChange}
                placeholder="Wi-Fi, AC, TV"
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Notes
              <input
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional notes"
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Room"
                    : "Create Room"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear Form
              </button>
            </div>
          </form>

          {roomTypes.length === 0 && !loading && (
            <p className="mt-4 text-sm text-amber-700">
              No room types found. Create a room type before adding a room.
            </p>
          )}
        </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <h2 className="text-xl font-bold text-slate-800">
              All Rooms
            </h2>

            <div className="flex flex-wrap gap-3">
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="rounded-lg border border-slate-300 p-2"
              >
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <select
                value={filters.roomType}
                onChange={(e) =>
                  setFilters({ ...filters, roomType: e.target.value })
                }
                className="rounded-lg border border-slate-300 p-2"
              >
                <option value="">All room types</option>
                {roomTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchData}
                className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading rooms...
            </p>
          ) : rooms.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No rooms found for the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Room</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Floor</th>
                    <th className="p-4">Price/Night</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Active</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rooms.map((room) => (
                    <tr key={room._id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-800">
                        {room.roomNumber}
                      </td>
                      <td className="p-4">
                        {room.roomType?.name || "Unknown"}
                      </td>
                      <td className="p-4">{room.floor}</td>
                      <td className="p-4">
                        ₹{Number(room.price || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <select
                          value={room.status}
                          onChange={(e) =>
                            handleStatusChange(room._id, e.target.value)
                          }
                          className="rounded-lg border border-slate-300 p-2 capitalize"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleActiveToggle(room)}
                          className={`rounded-full px-3 py-1 font-semibold ${
                            room.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {room.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(room)}
                            className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(room)}
                            className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete
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
    </div>
  );
}
