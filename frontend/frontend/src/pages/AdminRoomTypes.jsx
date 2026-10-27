
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BedDouble,
  Plus,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Power,
  Search,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/rooms";

const STATUSES = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "maintenance",
];

const EMPTY_FORM = {
  roomNumber: "",
  typeName: "",
  description: "",
  basePrice: "",
  capacity: "1",
  floor: "1",
  price: "",
  typeAmenities: "",
  roomAmenities: "",
  images: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const parseCommaList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseLines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const getError = (error, fallback) =>
  error.response?.data?.message || fallback;

const getRoomType = (room) =>
  room.roomType && typeof room.roomType === "object"
    ? room.roomType
    : {};

export default function AdminRoomTypes() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(API_URL, {
        headers: getHeaders(),
      });

      setRooms(response.data.rooms || []);
    } catch (err) {
      setError(
        getError(
          err,
          "Unable to load rooms. Check the backend server and login."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      // When creating a room, default the nightly room price
      // to the base price unless the admin has entered a price.
      if (name === "basePrice" && !editingId && !previous.price) {
        updated.price = value;
      }

      return updated;
    });
  };

  const openCreateForm = () => {
    setError("");
    setMessage("");

    if (showForm) {
      resetForm();
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const basePrice = Number(form.basePrice);
    const capacity = Number(form.capacity);
    const floor = Number(form.floor);
    const price = Number(form.price);

    if (!form.roomNumber.trim() || !form.typeName.trim()) {
      setError("Room number and room type name are required.");
      return;
    }

    if (
      form.basePrice === "" ||
      !Number.isFinite(basePrice) ||
      basePrice < 0
    ) {
      setError("Enter a valid base price.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Guest capacity must be at least 1.");
      return;
    }

    if (!Number.isInteger(floor) || floor < 0) {
      setError("Floor must be a non-negative whole number.");
      return;
    }

    if (form.price === "" || !Number.isFinite(price) || price < 0) {
      setError("Enter a valid room price per night.");
      return;
    }

    const payload = {
      roomNumber: form.roomNumber.trim(),
      floor,
      roomType: {
        name: form.typeName.trim(),
        description: form.description.trim(),
        basePrice,
        capacity,
        amenities: parseCommaList(form.typeAmenities),
        images: parseLines(form.images),
        isActive: true,
      },
      price,
      amenities: parseCommaList(form.roomAmenities),
      notes: form.notes.trim(),
    };

    setSaving(true);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, payload, {
          headers: getHeaders(),
        });
        setMessage("Room updated successfully.");
      } else {
        await axios.post(API_URL, payload, {
          headers: getHeaders(),
        });
        setMessage("Room and its type details saved successfully.");
      }

      resetForm();
      await fetchRooms();
    } catch (err) {
      setError(getError(err, "Unable to save room."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (room) => {
    const type = getRoomType(room);

    setForm({
      roomNumber: room.roomNumber || "",
      typeName: type.name || "",
      description: type.description || "",
      basePrice: type.basePrice ?? "",
      capacity: String(type.capacity ?? 1),
      floor: String(room.floor ?? 0),
      price: room.price ?? type.basePrice ?? "",
      typeAmenities: Array.isArray(type.amenities)
        ? type.amenities.join(", ")
        : "",
      roomAmenities: Array.isArray(room.amenities)
        ? room.amenities.join(", ")
        : "",
      images: Array.isArray(type.images)
        ? type.images.join("\n")
        : "",
      notes: room.notes || "",
    });

    setEditingId(room._id);
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleActive = async (room) => {
    setError("");
    setMessage("");
    setBusyId(room._id);

    try {
      const nextActive = room.isActive === false;

      await axios.put(
        `${API_URL}/${room._id}`,
        { isActive: nextActive },
        { headers: getHeaders() }
      );

      setMessage(
        `Room ${room.roomNumber} ${
          nextActive ? "activated" : "deactivated"
        } successfully.`
      );

      await fetchRooms();
    } catch (err) {
      setError(getError(err, "Unable to change room status."));
    } finally {
      setBusyId("");
    }
  };

  const handleStatusChange = async (room, status) => {
    setError("");
    setMessage("");
    setBusyId(room._id);

    try {
      await axios.patch(
        `${API_URL}/${room._id}/status`,
        { status },
        { headers: getHeaders() }
      );

      setMessage(`Room ${room.roomNumber} status updated.`);
      await fetchRooms();
    } catch (err) {
      setError(getError(err, "Unable to update room status."));
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (room) => {
    const confirmed = window.confirm(
      `Delete room ${room.roomNumber}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setBusyId(room._id);

    try {
      await axios.delete(`${API_URL}/${room._id}`, {
        headers: getHeaders(),
      });

      setMessage(`Room ${room.roomNumber} deleted successfully.`);
      await fetchRooms();
    } catch (err) {
      setError(getError(err, "Unable to delete room."));
    } finally {
      setBusyId("");
    }
  };

  const roomTypes = useMemo(() => {
    const unique = new Map();

    rooms.forEach((room) => {
      const type = getRoomType(room);
      if (!type.name) return;

      const key = type.name.toLowerCase();

      if (!unique.has(key)) {
        unique.set(key, type.name);
      }
    });

    return [...unique.values()].sort((a, b) => a.localeCompare(b));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rooms.filter((room) => {
      const type = getRoomType(room);

      const matchesSearch =
        !query ||
        `${room.roomNumber || ""} ${type.name || ""} ${
          type.description || ""
        } ${room.notes || ""}`
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        !statusFilter || room.status === statusFilter;

      const matchesType =
        !typeFilter ||
        String(type.name || "").toLowerCase() ===
          typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rooms, search, statusFilter, typeFilter]);

  const availableCount = rooms.filter(
    (room) => room.status === "available" && room.isActive !== false
  ).length;

  const occupiedCount = rooms.filter(
    (room) => room.status === "occupied"
  ).length;

  const inactiveCount = rooms.filter(
    (room) => room.isActive === false
  ).length;

  const summary = [
    ["Total Rooms", rooms.length],
    ["Available", availableCount],
    ["Occupied", occupiedCount],
    ["Inactive", inactiveCount],
    ["Room Categories", roomTypes.length],
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Hotel Administration
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">
              Room Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Add room details and category information in one form.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchRooms}
              disabled={loading}
              className={`${buttonClass} border border-slate-300 bg-white text-slate-700`}
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            >
              {showForm ? <X size={17} /> : <Plus size={17} />}
              {showForm ? "Close Form" : "Add Room"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {value}
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-800">
              {editingId ? "Edit Room and Category" : "Create Room"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              <label className="text-sm font-medium text-slate-700">
                Room Number *
                <input
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. 101"
                  maxLength={30}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Room Type Name *
                <input
                  name="typeName"
                  value={form.typeName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. Deluxe"
                  maxLength={100}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Floor *
                <input
                  name="floor"
                  type="number"
                  min="0"
                  step="1"
                  value={form.floor}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Base Price per Night (₹) *
                <input
                  name="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Room Price per Night (₹) *
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Guest Capacity *
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacity}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                Category Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className={inputClass}
                  placeholder="Describe the room category..."
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Category Amenities
                <input
                  name="typeAmenities"
                  value={form.typeAmenities}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Wi-Fi, AC, TV"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Room Amenities
                <input
                  name="roomAmenities"
                  value={form.roomAmenities}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Mini fridge, balcony"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                Image URLs (one URL per line)
                <textarea
                  name="images"
                  value={form.images}
                  onChange={handleChange}
                  rows={3}
                  className={inputClass}
                  placeholder={"https://example.com/room1.jpg\nhttps://example.com/room2.jpg"}
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                Notes
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  className={inputClass}
                  placeholder="Optional internal notes"
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Room"
                      : "Save Room"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className={`${buttonClass} border border-slate-300 bg-white text-slate-700`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                All Rooms
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredRooms.length} of {rooms.length} rooms
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search room or category..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {roomTypes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading rooms...
            </p>
          ) : filteredRooms.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No rooms found. Add a room using the form above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Room</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Base Price</th>
                    <th className="p-4">Room Price</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Floor</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Active</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.map((room) => {
                    const type = getRoomType(room);

                    return (
                      <tr key={room._id} className="hover:bg-slate-50">
                        <td className="p-4 font-semibold text-slate-800">
                          {room.roomNumber}
                          {room.notes && (
                            <p className="mt-1 max-w-[180px] truncate text-xs font-normal text-slate-500">
                              {room.notes}
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold">{type.name || "—"}</p>
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                            {type.description || "No description"}
                          </p>
                        </td>

                        <td className="p-4">{money(type.basePrice)}</td>
                        <td className="p-4 font-semibold">{money(room.price)}</td>
                        <td className="p-4">{type.capacity ?? "—"} guests</td>
                        <td className="p-4">{room.floor}</td>

                        <td className="p-4">
                          <select
                            value={room.status || "available"}
                            disabled={busyId === room._id}
                            onChange={(e) =>
                              handleStatusChange(room, e.target.value)
                            }
                            className="rounded-lg border border-slate-300 bg-white p-2 capitalize"
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
                            disabled={busyId === room._id}
                            onClick={() => handleToggleActive(room)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              room.isActive === false
                                ? "bg-slate-200 text-slate-600"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            <Power size={12} className="mr-1 inline" />
                            {room.isActive === false ? "Inactive" : "Active"}
                          </button>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(room)}
                              className={`${buttonClass} bg-blue-50 px-3 py-2 text-blue-700`}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={busyId === room._id}
                              onClick={() => handleDelete(room)}
                              className={`${buttonClass} bg-red-50 px-3 py-2 text-red-700`}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
