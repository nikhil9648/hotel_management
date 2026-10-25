
import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/rooms/types";

const initialForm = {
  name: "",
  description: "",
  basePrice: "",
  capacity: 1,
  amenities: "",
  images: "",
};

export default function AdminRoomTypes() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  const fetchRoomTypes = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(API_URL, { headers });
      setRoomTypes(response.data.roomTypes || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load room types."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTypes();
  }, []);

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
    setError("");
    setMessage("");

    const basePrice = Number(form.basePrice);
    const capacity = Number(form.capacity);

    if (
      !form.name.trim() ||
      form.basePrice === "" ||
      !Number.isFinite(basePrice) ||
      basePrice < 0 ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      setError("Enter a valid name, price and capacity.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      basePrice,
      capacity,
      amenities: form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      images: form.images
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    setSaving(true);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, payload, {
          headers,
        });
        setMessage("Room type updated successfully.");
      } else {
        await axios.post(API_URL, payload, { headers });
        setMessage("Room type created successfully.");
      }

      resetForm();
      await fetchRoomTypes();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save room type."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (type) => {
    setEditingId(type._id);
    setShowForm(true);
    setForm({
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

  const handleToggleActive = async (type) => {
    setError("");
    setMessage("");

    try {
      await axios.put(
        `${API_URL}/${type._id}`,
        { isActive: type.isActive === false },
        { headers }
      );

      setMessage(
        `Room type ${type.isActive === false ? "activated" : "deactivated"} successfully.`
      );
      await fetchRoomTypes();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update room type status."
      );
    }
  };

  const handleDelete = async (type) => {
    if (
      !window.confirm(
        `Delete "${type.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await axios.delete(`${API_URL}/${type._id}`, { headers });
      setMessage("Room type deleted successfully.");
      await fetchRoomTypes();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete room type."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Room Type Management</h1>
            <p className="mt-1 text-slate-500">Manage room categories, pricing, capacity and amenities.</p>
          </div>
          <button type="button" className="add-form-trigger" onClick={() => {
            if (showForm || editingId) resetForm();
            else { resetForm(); setShowForm(true); }
          }}>{showForm || editingId ? "Close form" : "+ Add Room Type"}</button>
        </header>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="rounded-lg bg-green-50 p-3 text-green-700">
            {message}
          </div>
        )}

        {(showForm || editingId) && (
        <section className="add-form-panel rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            {editingId ? "Edit Room Type" : "Add Room Type"}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Room Type Name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={80}
                placeholder="e.g. Deluxe"
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="text-sm font-medium">
              Base Price per Night (₹) *
              <input
                name="basePrice"
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="text-sm font-medium">
              Guest Capacity *
              <input
                name="capacity"
                type="number"
                min="1"
                step="1"
                value={form.capacity}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="text-sm font-medium">
              Amenities (comma-separated)
              <input
                name="amenities"
                value={form.amenities}
                onChange={handleChange}
                placeholder="Wi-Fi, AC, TV, Breakfast"
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Describe this room category..."
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Image URLs (one URL per line)
              <textarea
                name="images"
                value={form.images}
                onChange={handleChange}
                rows="3"
                placeholder={"https://example.com/room1.jpg\nhttps://example.com/room2.jpg"}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Room Type"
                    : "Create Room Type"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-5 py-3 font-semibold hover:bg-slate-100"
              >
                Clear
              </button>
            </div>
          </form>
        </section>
        )}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold text-slate-800">
              All Room Types ({roomTypes.length})
            </h2>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading room types...
            </p>
          ) : roomTypes.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No room types found. Create your first room type above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Base Price</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Amenities</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {roomTypes.map((type) => (
                    <tr key={type._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">
                          {type.name}
                        </p>
                        <p className="mt-1 max-w-xs text-slate-500">
                          {type.description || "No description"}
                        </p>
                      </td>

                      <td className="p-4 font-semibold">
                        ₹{Number(type.basePrice || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="p-4">{type.capacity} guests</td>

                      <td className="p-4">
                        {Array.isArray(type.amenities) &&
                        type.amenities.length
                          ? type.amenities.join(", ")
                          : "—"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 font-semibold ${
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
                            onClick={() => handleEdit(type)}
                            className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(type)}
                            className="rounded-lg border px-3 py-2 font-semibold"
                          >
                            {type.isActive === false
                              ? "Activate"
                              : "Deactivate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(type)}
                            className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700"
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
