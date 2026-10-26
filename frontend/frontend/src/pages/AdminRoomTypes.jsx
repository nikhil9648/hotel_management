
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  BedDouble,
  Layers,
  Plus,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Power,
  CheckCircle,
  Search,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/rooms";
const TYPE_API = `${API_URL}/types`;

const STATUSES = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "maintenance",
];

const EMPTY_ROOM_TYPE = {
  name: "",
  description: "",
  basePrice: "",
  capacity: 1,
  amenities: "",
  images: "",
};

const EMPTY_ROOM = {
  roomNumber: "",
  roomType: "",
  floor: 1,
  price: "",
  amenities: "",
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

const getError = (err, fallback) =>
  err.response?.data?.message || fallback;

const toList = (value, separator = ",") =>
  String(value || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

export default function AdminRoomTypes() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);

  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [typeForm, setTypeForm] = useState(EMPTY_ROOM_TYPE);

  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingTypeId, setEditingTypeId] = useState(null);

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);

  const [roomFilters, setRoomFilters] = useState({
    status: "",
    roomType: "",
  });

  const [roomSearch, setRoomSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // Load both resources from the existing APIs.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch all records first so the summary counts remain accurate.
      const [roomsResponse, typesResponse] = await Promise.all([
        axios.get(API_URL, { headers: getHeaders() }),
        axios.get(TYPE_API, { headers: getHeaders() }),
      ]);

      setRooms(roomsResponse.data.rooms || []);
      setRoomTypes(typesResponse.data.roomTypes || []);
    } catch (err) {
      setError(
        getError(
          err,
          "Unable to load rooms and room types. Check the server and login."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset helpers
  const resetRoomForm = () => {
    setRoomForm(EMPTY_ROOM);
    setEditingRoomId(null);
    setShowRoomForm(false);
  };

  const resetTypeForm = () => {
    setTypeForm(EMPTY_ROOM_TYPE);
    setEditingTypeId(null);
    setShowTypeForm(false);
  };

  const startRoomForm = () => {
    setError("");
    setMessage("");

    if (showRoomForm || editingRoomId) {
      resetRoomForm();
      return;
    }

    resetTypeForm();
    setRoomForm(EMPTY_ROOM);
    setShowRoomForm(true);
  };

  const startTypeForm = () => {
    setError("");
    setMessage("");

    if (showTypeForm || editingTypeId) {
      resetTypeForm();
      return;
    }

    resetRoomForm();
    setTypeForm(EMPTY_ROOM_TYPE);
    setShowTypeForm(true);
  };

  // -----------------------------
  // ROOM TYPE FORM
  // -----------------------------
  const handleTypeChange = (e) => {
    const { name, value } = e.target;

    setTypeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const basePrice = Number(typeForm.basePrice);
    const capacity = Number(typeForm.capacity);

    if (
      !typeForm.name.trim() ||
      typeForm.basePrice === "" ||
      !Number.isFinite(basePrice) ||
      basePrice < 0 ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      setError("Enter a valid room type name, base price and capacity.");
      return;
    }

    const payload = {
      name: typeForm.name.trim(),
      description: typeForm.description.trim(),
      basePrice,
      capacity,
      amenities: toList(typeForm.amenities),
      images: toList(typeForm.images, "\n"),
    };

    setSavingType(true);

    try {
      if (editingTypeId) {
        await axios.put(`${TYPE_API}/${editingTypeId}`, payload, {
          headers: getHeaders(),
        });

        setMessage("Room type updated successfully.");
      } else {
        await axios.post(TYPE_API, payload, {
          headers: getHeaders(),
        });

        setMessage("Room type created successfully.");
      }

      resetTypeForm();
      await fetchData();
    } catch (err) {
      setError(getError(err, "Unable to save room type."));
    } finally {
      setSavingType(false);
    }
  };

  const handleEditType = (type) => {
    resetRoomForm();

    setEditingTypeId(type._id);
    setShowTypeForm(true);

    setTypeForm({
      name: type.name || "",
      description: type.description || "",
      basePrice: type.basePrice ?? "",
      capacity: type.capacity ?? 1,
      amenities: Array.isArray(type.amenities)
        ? type.amenities.join(", ")
        : "",
      images: Array.isArray(type.images)
        ? type.images.join("\n")
        : "",
    });

    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleType = async (type) => {
    const nextActive = type.isActive === false;

    setError("");
    setMessage("");
    setBusyId(type._id);

    try {
      await axios.put(
        `${TYPE_API}/${type._id}`,
        { isActive: nextActive },
        { headers: getHeaders() }
      );

      setMessage(
        `Room type ${nextActive ? "activated" : "deactivated"} successfully.`
      );

      await fetchData();
    } catch (err) {
      setError(getError(err, "Unable to update room type status."));
    } finally {
      setBusyId("");
    }
  };

  const handleDeleteType = async (type) => {
    const hasRooms = rooms.some((room) => {
      const roomTypeId =
        typeof room.roomType === "object"
          ? room.roomType?._id
          : room.roomType;

      return String(roomTypeId) === String(type._id);
    });

    const warning = hasRooms
      ? `Room type "${type.name}" has rooms linked to it. The server may reject deletion. Continue?`
      : `Permanently delete room type "${type.name}"?`;

    if (!window.confirm(warning)) return;

    setError("");
    setMessage("");
    setBusyId(type._id);

    try {
      await axios.delete(`${TYPE_API}/${type._id}`, {
        headers: getHeaders(),
      });

      setMessage("Room type deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(
        getError(
          err,
          "Unable to delete room type. Check whether rooms are linked to it."
        )
      );
    } finally {
      setBusyId("");
    }
  };

  // -----------------------------
  // ROOM FORM
  // -----------------------------
  const handleRoomChange = (e) => {
    const { name, value } = e.target;

    setRoomForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Use the selected type's base price when creating a new room.
    if (name === "roomType" && !editingRoomId) {
      const selectedType = roomTypes.find(
        (type) => type._id === value
      );

      if (selectedType) {
        setRoomForm((previous) => ({
          ...previous,
          roomType: value,
          price: selectedType.basePrice ?? "",
        }));
      }
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const floor = Number(roomForm.floor);
    const price = Number(roomForm.price);

    if (!roomForm.roomNumber.trim()) {
      setError("Room number is required.");
      return;
    }

    if (!roomForm.roomType) {
      setError("Please select a room type.");
      return;
    }

    if (
      !Number.isInteger(floor) ||
      floor < 0 ||
      roomForm.price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Enter a valid floor and price per night.");
      return;
    }

    const payload = {
      roomNumber: roomForm.roomNumber.trim(),
      roomType: roomForm.roomType,
      floor,
      price,
      amenities: toList(roomForm.amenities),
      notes: roomForm.notes.trim(),
    };

    setSavingRoom(true);

    try {
      if (editingRoomId) {
        await axios.put(`${API_URL}/${editingRoomId}`, payload, {
          headers: getHeaders(),
        });

        setMessage("Room updated successfully.");
      } else {
        await axios.post(API_URL, payload, {
          headers: getHeaders(),
        });

        setMessage("Room created successfully.");
      }

      resetRoomForm();
      await fetchData();
    } catch (err) {
      setError(getError(err, "Unable to save room."));
    } finally {
      setSavingRoom(false);
    }
  };

  const handleEditRoom = (room) => {
    resetTypeForm();

    setEditingRoomId(room._id);
    setShowRoomForm(true);

    setRoomForm({
      roomNumber: room.roomNumber || "",
      roomType:
        typeof room.roomType === "object"
          ? room.roomType?._id || ""
          : room.roomType || "",
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

  const handleRoomStatus = async (room, status) => {
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
      await fetchData();
    } catch (err) {
      setError(getError(err, "Unable to update room status."));
    } finally {
      setBusyId("");
    }
  };

  const handleToggleRoom = async (room) => {
    const nextActive = room.isActive === false;

    setError("");
    setMessage("");
    setBusyId(room._id);

    try {
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

      await fetchData();
    } catch (err) {
      setError(getError(err, "Unable to update room active status."));
    } finally {
      setBusyId("");
    }
  };

  const handleDeleteRoom = async (room) => {
    if (
      !window.confirm(
        `Permanently delete room ${room.roomNumber}? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setBusyId(room._id);

    try {
      await axios.delete(`${API_URL}/${room._id}`, {
        headers: getHeaders(),
      });

      setMessage(`Room ${room.roomNumber} deleted successfully.`);
      await fetchData();
    } catch (err) {
      setError(getError(err, "Unable to delete room."));
    } finally {
      setBusyId("");
    }
  };

  // -----------------------------
  // FILTERS AND SUMMARY
  // -----------------------------
  const normalizedRoomSearch = roomSearch.trim().toLowerCase();
  const normalizedTypeSearch = typeSearch.trim().toLowerCase();

  const filteredRooms = rooms.filter((room) => {
    const roomTypeId =
      typeof room.roomType === "object"
        ? room.roomType?._id
        : room.roomType;

    const roomTypeName =
      typeof room.roomType === "object"
        ? room.roomType?.name || ""
        : roomTypes.find(
            (type) => type._id === roomTypeId
          )?.name || "";

    const matchesStatus =
      !roomFilters.status || room.status === roomFilters.status;

    const matchesType =
      !roomFilters.roomType ||
      String(roomTypeId) === String(roomFilters.roomType);

    const matchesSearch =
      !normalizedRoomSearch ||
      `${room.roomNumber || ""} ${roomTypeName} ${room.notes || ""}`
        .toLowerCase()
        .includes(normalizedRoomSearch);

    return matchesStatus && matchesType && matchesSearch;
  });

  const filteredTypes = roomTypes.filter((type) =>
    `${type.name || ""} ${type.description || ""}`
      .toLowerCase()
      .includes(normalizedTypeSearch)
  );

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(
    (room) => room.status === "available" && room.isActive !== false
  ).length;
  const occupiedRooms = rooms.filter(
    (room) => room.status === "occupied"
  ).length;
  const inactiveRooms = rooms.filter(
    (room) => room.isActive === false
  ).length;
  const activeTypes = roomTypes.filter(
    (type) => type.isActive !== false
  ).length;

  const summary = [
    {
      label: "Total Rooms",
      value: totalRooms,
      icon: BedDouble,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Available Rooms",
      value: availableRooms,
      icon: CheckCircle,
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Occupied Rooms",
      value: occupiedRooms,
      icon: BedDouble,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Inactive Rooms",
      value: inactiveRooms,
      icon: Power,
      color: "bg-red-50 text-red-700",
    },
    {
      label: "Room Types",
      value: roomTypes.length,
      icon: Layers,
      color: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* PAGE HEADER */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Hotel Administration
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">
              Room Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage room categories, rooms, pricing, availability and status
              from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {/* ALERTS */}
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

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{label}</p>
                <span className={`rounded-lg p-2 ${color}`}>
                  <Icon size={19} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-800">
                {value}
              </p>
            </div>
          ))}
        </section>

        {/* ROOM TYPE SECTION */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="text-blue-600" size={22} />
                <h2 className="text-xl font-bold text-slate-800">
                  Room Types
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Create and manage Deluxe, Standard, Suite and other categories.
              </p>
            </div>

            <button
              type="button"
              onClick={startTypeForm}
              className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            >
              {showTypeForm || editingTypeId ? (
                <X size={17} />
              ) : (
                <Plus size={17} />
              )}
              {showTypeForm || editingTypeId
                ? "Close Form"
                : "Add Room Type"}
            </button>
          </div>

          {(showTypeForm || editingTypeId) && (
            <form
              onSubmit={handleTypeSubmit}
              className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 p-5 md:grid-cols-2"
            >
              <h3 className="text-lg font-bold text-slate-800 md:col-span-2">
                {editingTypeId ? "Edit Room Type" : "Create Room Type"}
              </h3>

              <label className="text-sm font-medium text-slate-700">
                Room Type Name *
                <input
                  name="name"
                  value={typeForm.name}
                  onChange={handleTypeChange}
                  className={inputClass}
                  placeholder="e.g. Deluxe Room"
                  maxLength={80}
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
                  value={typeForm.basePrice}
                  onChange={handleTypeChange}
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
                  value={typeForm.capacity}
                  onChange={handleTypeChange}
                  className={inputClass}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Amenities (comma-separated)
                <input
                  name="amenities"
                  value={typeForm.amenities}
                  onChange={handleTypeChange}
                  className={inputClass}
                  placeholder="Wi-Fi, AC, TV, Breakfast"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  name="description"
                  value={typeForm.description}
                  onChange={handleTypeChange}
                  rows={3}
                  className={inputClass}
                  placeholder="Describe this room category..."
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Image URLs (one URL per line)
                <textarea
                  name="images"
                  value={typeForm.images}
                  onChange={handleTypeChange}
                  rows={3}
                  className={inputClass}
                  placeholder={
                    "https://example.com/room1.jpg\nhttps://example.com/room2.jpg"
                  }
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={savingType}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {savingType
                    ? "Saving..."
                    : editingTypeId
                      ? "Update Room Type"
                      : "Create Room Type"}
                </button>

                <button
                  type="button"
                  onClick={resetTypeForm}
                  className={`${buttonClass} border border-slate-300 bg-white text-slate-700`}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">
              All Room Types ({filteredTypes.length} of {roomTypes.length})
            </h3>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                placeholder="Search room types..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading room types...
            </p>
          ) : filteredTypes.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No room types found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Room Type</th>
                    <th className="p-4">Base Price</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Amenities</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTypes.map((type) => (
                    <tr key={type._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">
                          {type.name}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-slate-500">
                          {type.description || "No description"}
                        </p>
                      </td>

                      <td className="p-4 font-semibold">
                        {money(type.basePrice)}
                      </td>

                      <td className="p-4">{type.capacity} guests</td>

                      <td className="max-w-xs p-4 text-slate-600">
                        {Array.isArray(type.amenities) &&
                        type.amenities.length
                          ? type.amenities.join(", ")
                          : "—"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            type.isActive === false
                              ? "bg-slate-200 text-slate-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {type.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditType(type)}
                            className={`${buttonClass} bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100`}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={busyId === type._id}
                            onClick={() => handleToggleType(type)}
                            className={`${buttonClass} border border-slate-300 bg-white px-3 py-2 text-slate-700`}
                          >
                            <Power size={14} />
                            {type.isActive === false ? "Activate" : "Deactivate"}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === type._id}
                            onClick={() => handleDeleteType(type)}
                            className={`${buttonClass} bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100`}
                          >
                            <Trash2 size={14} />
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

        {/* ROOM SECTION */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <div className="flex items-center gap-2">
                <BedDouble className="text-blue-600" size={22} />
                <h2 className="text-xl font-bold text-slate-800">Rooms</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Assign room types, manage room numbers, pricing and availability.
              </p>
            </div>

            <button
              type="button"
              onClick={startRoomForm}
              className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            >
              {showRoomForm || editingRoomId ? (
                <X size={17} />
              ) : (
                <Plus size={17} />
              )}
              {showRoomForm || editingRoomId ? "Close Form" : "Add New Room"}
            </button>
          </div>

          {(showRoomForm || editingRoomId) && (
            <form
              onSubmit={handleRoomSubmit}
              className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-3"
            >
              <h3 className="text-lg font-bold text-slate-800 md:col-span-2 xl:col-span-3">
                {editingRoomId ? "Edit Room" : "Create Room"}
              </h3>

              <label className="text-sm font-medium text-slate-700">
                Room Number *
                <input
                  name="roomNumber"
                  value={roomForm.roomNumber}
                  onChange={handleRoomChange}
                  className={inputClass}
                  placeholder="e.g. 101"
                  maxLength={30}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Room Type *
                <select
                  name="roomType"
                  value={roomForm.roomType}
                  onChange={handleRoomChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select room type</option>
                  {roomTypes
                    .filter((type) => {
                      // Keep an inactive type visible when editing an existing room.
                      const currentTypeId = roomForm.roomType;
                      return (
                        type.isActive !== false ||
                        type._id === currentTypeId
                      );
                    })
                    .map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name} — {money(type.basePrice)}
                        {type.isActive === false ? " (Inactive)" : ""}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Floor *
                <input
                  name="floor"
                  type="number"
                  value={roomForm.floor}
                  onChange={handleRoomChange}
                  className={inputClass}
                  min="0"
                  step="1"
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Price per Night (₹) *
                <input
                  name="price"
                  type="number"
                  value={roomForm.price}
                  onChange={handleRoomChange}
                  className={inputClass}
                  min="0"
                  step="0.01"
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Amenities
                <input
                  name="amenities"
                  value={roomForm.amenities}
                  onChange={handleRoomChange}
                  className={inputClass}
                  placeholder="Wi-Fi, AC, TV"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  name="notes"
                  value={roomForm.notes}
                  onChange={handleRoomChange}
                  className={inputClass}
                  placeholder="Optional notes"
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3">
                <button
                  type="submit"
                  disabled={savingRoom || roomTypes.length === 0}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {savingRoom
                    ? "Saving..."
                    : editingRoomId
                      ? "Update Room"
                      : "Create Room"}
                </button>

                <button
                  type="button"
                  onClick={resetRoomForm}
                  className={`${buttonClass} border border-slate-300 bg-white text-slate-700`}
                >
                  Cancel
                </button>
              </div>

              {roomTypes.length === 0 && (
                <p className="text-sm text-amber-700 md:col-span-2 xl:col-span-3">
                  Create a room type in the section above before adding a room.
                </p>
              )}
            </form>
          )}

          {/* ROOM SEARCH AND FILTERS */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
            <h3 className="font-semibold text-slate-800">
              All Rooms ({filteredRooms.length} of {rooms.length})
            </h3>

            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search room..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>

              <select
                value={roomFilters.status}
                onChange={(e) =>
                  setRoomFilters((previous) => ({
                    ...previous,
                    status: e.target.value,
                  }))
                }
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
                value={roomFilters.roomType}
                onChange={(e) =>
                  setRoomFilters((previous) => ({
                    ...previous,
                    roomType: e.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All room types</option>
                {roomTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name}
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
              No rooms found for the selected search or filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Room</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Floor</th>
                    <th className="p-4">Price/Night</th>
                    <th className="p-4">Room Status</th>
                    <th className="p-4">Active</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.map((room) => (
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
                        {typeof room.roomType === "object"
                          ? room.roomType?.name || "Unknown"
                          : roomTypes.find(
                              (type) => type._id === room.roomType
                            )?.name || "Unknown"}
                      </td>

                      <td className="p-4">{room.floor}</td>

                      <td className="p-4 font-semibold">
                        {money(room.price)}
                      </td>

                      <td className="p-4">
                        <select
                          value={room.status || "available"}
                          disabled={busyId === room._id}
                          onChange={(e) =>
                            handleRoomStatus(room, e.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-white p-2 text-sm capitalize"
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
                          onClick={() => handleToggleRoom(room)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            room.isActive === false
                              ? "bg-slate-200 text-slate-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {room.isActive === false ? "Inactive" : "Active"}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditRoom(room)}
                            className={`${buttonClass} bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100`}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={busyId === room._id}
                            onClick={() => handleDeleteRoom(room)}
                            className={`${buttonClass} bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100`}
                          >
                            <Trash2 size={14} />
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

        <p className="text-center text-xs text-slate-500">
          Room Management includes room categories and individual rooms.
          Changes are saved through your existing backend APIs.
        </p>
      </div>
    </div>
  );
}
