
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    X,
    Pencil,
    Power,
    Trash2,
    RefreshCw,
    Search,
    Users,
    CheckCircle,
    XCircle,
    LoaderCircle,
} from "lucide-react";
import axios from "axios";

const API = "http://localhost:5000/api/admin/staff";

const initialForm = {
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "receptionist",
};

const STAFF_ROLES = [
    { value: "manager", label: "Manager" },
    { value: "receptionist", label: "Receptionist" },
    { value: "waiter", label: "Waiter" },
    { value: "kitchen", label: "Kitchen Staff" },
    { value: "accountant", label: "Accountant" },
    { value: "hr", label: "HR" },
    { value: "staff", label: "Staff" },
    { value: "delivery_boy", label: "Delivery Boy" },
];

const getErrorMessage = (error, fallback) =>
    error.response?.data?.message || fallback;

export default function AdminStaff() {
    const [staff, setStaff] = useState([]);
    const [form, setForm] = useState(initialForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const token = localStorage.getItem("token");

    const getHeaders = useCallback(() => ({
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    }), []);

    const loadStaff = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const res = await axios.get(API, {
                headers: getHeaders(),
            });

            setStaff(res.data.staff || []);
        } catch (err) {
            setError(
                getErrorMessage(err, "Staff list load nahi hui.")
            );
        } finally {
            setLoading(false);
        }
    }, [getHeaders]);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    const filteredStaff = useMemo(() => {
        const query = search.trim().toLowerCase();

        return staff.filter((person) => {
            const matchesSearch =
                !query ||
                person.name?.toLowerCase().includes(query) ||
                person.email?.toLowerCase().includes(query) ||
                person.phone?.toLowerCase().includes(query) ||
                person.role?.toLowerCase().includes(query);

            const isActive = person.isActive !== false;

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && isActive) ||
                (statusFilter === "inactive" && !isActive);

            return matchesSearch && matchesStatus;
        });
    }, [staff, search, statusFilter]);

    const activeCount = staff.filter(
        (person) => person.isActive !== false
    ).length;

    const inactiveCount = staff.length - activeCount;

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const resetForm = () => {
        setForm(initialForm);
        setEditingId(null);
        setShowForm(false);
    };

    const openAddForm = () => {
        setForm(initialForm);
        setEditingId(null);
        setShowForm(true);
        setError("");
        setMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setSaving(true);
        setError("");
        setMessage("");

        try {
            if (editingId) {
                // Backend updateStaff supports name, phone, role, isActive.
                const updateData = {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    role: form.role,
                };

                await axios.put(`${API}/${editingId}`, updateData, {
                    headers: getHeaders(),
                });

                setMessage("Staff details successfully update ho gayi.");
            } else {
                await axios.post(
                    API,
                    {
                        name: form.name.trim(),
                        email: form.email.trim().toLowerCase(),
                        phone: form.phone.trim(),
                        password: form.password,
                        role: form.role,
                    },
                    {
                        headers: getHeaders(),
                    }
                );

                setMessage("New staff successfully add ho gaya.");
            }

            resetForm();
            await loadStaff();
        } catch (err) {
            setError(
                getErrorMessage(err, "Operation complete nahi hui.")
            );
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (person) => {
        setEditingId(person._id);
        setShowForm(true);

        setForm({
            name: person.name || "",
            email: person.email || "",
            phone: person.phone || "",
            password: "",
            role: person.role || "receptionist",
        });

        setError("");
        setMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleToggleStatus = async (person) => {
        const currentlyActive = person.isActive !== false;
        const action = currentlyActive ? "deactivate" : "activate";

        const confirmed = window.confirm(
            `Kya aap ${person.name} ko ${action} karna chahte hain?`
        );

        if (!confirmed) return;

        setActionId(person._id);
        setError("");
        setMessage("");

        try {
            if (currentlyActive) {
                // Existing backend DELETE endpoint performs soft deactivation.
                await axios.delete(`${API}/${person._id}`, {
                    headers: getHeaders(),
                });
            } else {
                // Existing updateStaff controller supports isActive.
                await axios.put(
                    `${API}/${person._id}`,
                    { isActive: true },
                    { headers: getHeaders() }
                );
            }

            setMessage(
                currentlyActive
                    ? "Staff deactivate kar diya gaya."
                    : "Staff dobara activate kar diya gaya."
            );

            await loadStaff();
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    `Staff ko ${action} nahi kar paye.`
                )
            );
        } finally {
            setActionId(null);
        }
    };

    const handlePermanentDelete = async (person) => {
        const confirmed = window.confirm(
            `WARNING: ${person.name} ka record permanently delete hoga. ` +
            "Yeh action undo nahi kiya ja sakta. Kya aap continue karna chahte hain?"
        );

        if (!confirmed) return;

        setActionId(person._id);
        setError("");
        setMessage("");

        try {
            // Requires a separate backend permanent-delete route.
            await axios.delete(`${API}/${person._id}/permanent`, {
                headers: getHeaders(),
            });

            setMessage("Staff record permanently delete ho gaya.");

            if (editingId === person._id) {
                resetForm();
            }

            await loadStaff();
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Permanent delete endpoint available nahi hai ya request fail hui."
                )
            );
        } finally {
            setActionId(null);
        }
    };

    const clearNotices = () => {
        setError("");
        setMessage("");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Staff Management
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Staff add, edit, activate, deactivate aur manage karo.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (showForm || editingId) {
                            resetForm();
                        } else {
                            openAddForm();
                        }
                        clearNotices();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                    aria-expanded={showForm || Boolean(editingId)}
                >
                    {showForm || editingId
                        ? <X size={18} />
                        : <Plus size={18} />}
                    {showForm || editingId ? "Close Form" : "Add Staff"}
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
                >
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {message && (
                <div
                    role="status"
                    className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700"
                >
                    <span>{message}</span>
                    <button
                        type="button"
                        onClick={() => setMessage("")}
                        aria-label="Dismiss message"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
                            <Users size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Total Staff
                            </p>
                            <p className="text-2xl font-bold text-slate-800">
                                {staff.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-3 text-green-700">
                            <CheckCircle size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Active Staff
                            </p>
                            <p className="text-2xl font-bold text-green-700">
                                {activeCount}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-100 p-3 text-red-700">
                            <XCircle size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Inactive Staff
                            </p>
                            <p className="text-2xl font-bold text-red-700">
                                {inactiveCount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add / Edit form */}
            {(showForm || editingId) && (
                <section className="rounded-xl border bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800">
                            {editingId ? "Edit Staff" : "Add New Staff"}
                        </h2>

                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label="Close staff form"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Full Name
                            </label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Full name"
                                className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                required
                                maxLength={100}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Email Address
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Email address"
                                className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                required
                                disabled={Boolean(editingId)}
                            />
                            {editingId && (
                                <p className="mt-1 text-xs text-slate-500">
                                    Email editing is not enabled in the current backend.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Phone
                            </label>
                            <input
                                name="phone"
                                type="tel"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="Phone number"
                                className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Role
                            </label>
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                required
                            >
                                {STAFF_ROLES.map((role) => (
                                    <option
                                        key={role.value}
                                        value={role.value}
                                    >
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {!editingId && (
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Temporary Password
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="At least 6 characters"
                                    className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    minLength={6}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3 md:col-span-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving && (
                                    <LoaderCircle
                                        size={17}
                                        className="animate-spin"
                                    />
                                )}
                                {saving
                                    ? "Saving..."
                                    : editingId
                                    ? "Update Staff"
                                    : "Add Staff"}
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-lg border px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Staff table */}
            <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Staff Members
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Showing {filteredStaff.length} of {staff.length} staff
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search staff..."
                                className="w-full rounded-lg border py-2.5 pl-10 pr-3 outline-none focus:border-blue-500 sm:w-56"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
                            aria-label="Filter by staff status"
                        >
                            <option value="all">All Staff</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>

                        <button
                            type="button"
                            onClick={loadStaff}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 hover:bg-slate-50 disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                        <LoaderCircle size={22} className="animate-spin" />
                        Loading staff...
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="p-10 text-center">
                        <Users
                            size={35}
                            className="mx-auto mb-3 text-slate-300"
                        />
                        <p className="font-medium text-slate-700">
                            No staff members found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Search ya status filter change karke dekhein.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-4">Staff Member</th>
                                    <th className="p-4">Phone</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Joined</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredStaff.map((person) => {
                                    const isActive = person.isActive !== false;
                                    const isBusy = actionId === person._id;

                                    return (
                                        <tr
                                            key={person._id}
                                            className={`hover:bg-slate-50 ${
                                                !isActive ? "bg-slate-50/70" : ""
                                            }`}
                                        >
                                            <td className="p-4">
                                                <div className="font-semibold text-slate-800">
                                                    {person.name}
                                                </div>
                                                <div className="mt-1 text-slate-500">
                                                    {person.email}
                                                </div>
                                            </td>

                                            <td className="p-4 text-slate-600">
                                                {person.phone || "—"}
                                            </td>

                                            <td className="p-4">
                                                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-700">
                                                    {STAFF_ROLES.find(
                                                        (r) => r.value === person.role
                                                    )?.label || person.role}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                                        isActive
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {isActive
                                                        ? <CheckCircle size={14} />
                                                        : <XCircle size={14} />}
                                                    {isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            <td className="p-4 text-slate-500">
                                                {person.createdAt
                                                    ? new Date(
                                                          person.createdAt
                                                      ).toLocaleDateString("en-IN")
                                                    : "—"}
                                            </td>

                                            <td className="p-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(person)}
                                                        disabled={isBusy}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                                    >
                                                        <Pencil size={15} />
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleStatus(person)
                                                        }
                                                        disabled={isBusy}
                                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-medium disabled:opacity-50 ${
                                                            isActive
                                                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                : "border-green-200 text-green-700 hover:bg-green-50"
                                                        }`}
                                                    >
                                                        {isBusy ? (
                                                            <LoaderCircle
                                                                size={15}
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Power size={15} />
                                                        )}
                                                        {isActive
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handlePermanentDelete(person)
                                                        }
                                                        disabled={isBusy}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        <Trash2 size={15} />
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
    );
}
