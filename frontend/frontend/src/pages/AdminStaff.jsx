import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/admin/staff";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "receptionist",
};

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");

  const loadStaff = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStaff(res.data.staff || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Staff list load nahi hui."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        const updateData = { ...form };
        delete updateData.password;

        await axios.put(`${API}/${editingId}`, updateData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMessage("Staff details successfully update ho gayi.");
      } else {
        await axios.post(API, form, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMessage("New staff successfully add ho gaya.");
      }

      resetForm();
      await loadStaff();
    } catch (err) {
      setError(
        err.response?.data?.message || "Operation complete nahi hui."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (person) => {
    setEditingId(person._id);
    setForm({
      name: person.name || "",
      email: person.email || "",
      phone: person.phone || "",
      password: "",
      role: person.role || "receptionist",
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Kya tum is staff ko deactivate karna chahte ho?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await axios.delete(`${API}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage("Staff deactivate kar diya gaya.");
      await loadStaff();
    } catch (err) {
      setError(
        err.response?.data?.message || "Staff deactivate nahi hua."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Staff Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Staff members add, update aur manage karo.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-100 p-3 text-green-700">
          {message}
        </div>
      )}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? "Edit Staff" : "Add New Staff"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full name"
            className="rounded-lg border p-3"
            required
          />

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            className="rounded-lg border p-3"
            required
          />

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone number"
            className="rounded-lg border p-3"
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="rounded-lg border p-3"
          >
            <option value="manager">Manager</option>
            <option value="receptionist">Receptionist</option>
            <option value="waiter">Waiter</option>
            <option value="kitchen">Kitchen Staff</option>
            <option value="accountant">Accountant</option>
            <option value="hr">HR</option>
            <option value="delivery_boy">Delivery Boy</option>
          </select>

          {!editingId && (
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Temporary password"
              className="rounded-lg border p-3 md:col-span-2"
              minLength={6}
              required
            />
          )}

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Staff"
                : "Add Staff"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-5 py-3"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold">Staff Members</h2>
          <button
            onClick={loadStaff}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="p-5">Loading staff...</p>
        ) : staff.length === 0 ? (
          <p className="p-5 text-slate-500">Abhi koi staff member nahi hai.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {staff.map((person) => (
                  <tr key={person._id}>
                    <td className="p-4 font-medium">{person.name}</td>
                    <td className="p-4">{person.email}</td>
                    <td className="p-4">{person.phone || "—"}</td>
                    <td className="p-4 capitalize">{person.role}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(person)}
                          className="font-medium text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(person._id)}
                          className="font-medium text-red-600"
                        >
                          Deactivate
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
  );
}

