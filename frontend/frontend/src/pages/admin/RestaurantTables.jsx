
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/tables";

const initialForm = {
  tableNumber: "",
  capacity: "4",
  location: "Restaurant",
  status: "available",
  isActive: true,
};

export default function RestaurantTables() {
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({ ...initialForm });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const loadTables = useCallback(async () => {
    try {
      const response = await axios.get(API, {
        headers: headers(),
      });

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data.tables || data.data || [];

      setTables(list);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load restaurant tables."
      );
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm({ ...initialForm });
    setEditingId(null);
  };

  const startEdit = (table) => {
    setForm({
      tableNumber: table.tableNumber || "",
      capacity: String(table.capacity ?? 4),
      location: table.location || "Restaurant",
      status: table.status || "available",
      isActive: table.isActive !== false,
    });

    setEditingId(table._id);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    resetForm();
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const capacity = Number(form.capacity);

    if (!form.tableNumber.trim()) {
      setError("Please enter a table number.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tableNumber: form.tableNumber.trim(),
        capacity,
        location: form.location.trim(),
        status: form.status,
        isActive: form.isActive,
      };

      if (editingId) {
        await axios.put(`${API}/${editingId}`, payload, {
          headers: headers(),
        });

        setMessage("Restaurant table updated successfully!");
      } else {
        await axios.post(API, payload, {
          headers: headers(),
        });

        setMessage("Restaurant table added successfully!");
      }

      resetForm();
      await loadTables();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Could not ${editingId ? "update" : "add"} table.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (table) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove table ${table.tableNumber}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setRemovingId(table._id);

    try {
      await axios.delete(`${API}/${table._id}`, {
        headers: headers(),
      });

      setMessage(`Table ${table.tableNumber} removed successfully.`);

      if (editingId === table._id) {
        resetForm();
      }

      await loadTables();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not remove table. Check your backend delete route."
      );
    } finally {
      setRemovingId(null);
    }
  };

  const statusStyle = {
    available: "bg-green-100 text-green-700",
    occupied: "bg-red-100 text-red-700",
    reserved: "bg-yellow-100 text-yellow-700",
    billing: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Page heading */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">
            Restaurant Table Management
          </h1>
          <p className="mt-1 text-slate-500">
            Add, update, and manage your restaurant tables.
          </p>
        </header>

        {/* Add / Edit form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-5 text-lg font-semibold">
            {editingId ? "Update Restaurant Table" : "Add New Table"}
          </h2>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {message}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Table Number
              <input
                name="tableNumber"
                value={form.tableNumber}
                onChange={handleChange}
                placeholder="e.g. T-01"
                maxLength={30}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Capacity (people)
              <input
                name="capacity"
                type="number"
                min="1"
                step="1"
                value={form.capacity}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Location
              <select
                name="location"
                value={form.location}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
                <option value="Rooftop">Rooftop</option>
                <option value="Garden">Garden</option>
                <option value="Private Dining">Private Dining</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="billing">Billing</option>
              </select>
            </label>

            <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Table is active
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : editingId
                  ? "Update Table"
                  : "+ Add Table"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Existing tables */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Existing Tables
              </h2>
              <p className="text-sm text-slate-500">
                Total tables: {tables.length}
              </p>
            </div>

            <button
              type="button"
              onClick={loadTables}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-4">Table No.</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Active</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tables.map((table) => (
                  <tr key={table._id}>
                    <td className="p-4 font-semibold text-slate-900">
                      {table.tableNumber}
                    </td>

                    <td className="p-4">{table.capacity} people</td>

                    <td className="p-4">
                      {table.location || "Restaurant"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyle[table.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {table.status || "available"}
                      </span>
                    </td>

                    <td className="p-4">
                      {table.isActive ? "Yes" : "No"}
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(table)}
                          disabled={loading || removingId !== null}
                          className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemove(table)}
                          disabled={loading || removingId !== null}
                          className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {removingId === table._id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tables.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-500"
                    >
                      No restaurant tables found. Add your first table above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
