
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const getTableStyle = (status) => {
    switch (String(status || "").toLowerCase()) {
        case "available":
            return "bg-green-100 text-green-800";
        case "occupied":
            return "bg-red-100 text-red-800";
        case "reserved":
            return "bg-yellow-100 text-yellow-800";
        case "cleaning":
            return "bg-blue-100 text-blue-800";
        default:
            return "bg-slate-100 text-slate-700";
    }
};

export default function WaiterTables() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const fetchTables = async () => {
            setLoading(true);
            setError("");

            try {
                const token = localStorage.getItem("token");

                // API endpoint ko existing backend route confirm karne ke
                // baad set karenge. Guess karke request nahi bhej rahe.
                const response = await axios.get(`${API_URL}/tables`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = response.data;
                const list = Array.isArray(data)
                    ? data
                    : data.tables || data.data || [];

                setTables(list);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    "Tables load nahi ho paayi. Backend table API endpoint verify karein."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchTables();
    }, []);

    const filteredTables = tables.filter((table) => {
        if (filter === "all") return true;

        return String(table.status || "").toLowerCase() === filter;
    });

    const countByStatus = (status) =>
        tables.filter(
            (table) =>
                String(table.status || "").toLowerCase() === status
        ).length;

    const tableName = (table) =>
        table.tableNumber || table.name || table.number || "Unnamed table";

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Table Management
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        View table availability and occupancy.
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { label: "Total Tables", value: tables.length },
                    { label: "Available", value: countByStatus("available") },
                    { label: "Occupied", value: countByStatus("occupied") },
                    { label: "Reserved", value: countByStatus("reserved") },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl border bg-white p-5"
                    >
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="mt-2 text-3xl font-bold text-slate-800">
                            {loading ? "—" : item.value}
                        </p>
                    </div>
                ))}
            </div>

            <section className="rounded-xl border bg-white p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-slate-800">
                        Restaurant Tables
                    </h2>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="rounded-lg border p-2"
                    >
                        <option value="all">All Tables</option>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="reserved">Reserved</option>
                        <option value="cleaning">Cleaning</option>
                    </select>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-slate-500">
                        Loading tables...
                    </p>
                ) : filteredTables.length === 0 ? (
                    <p className="py-8 text-center text-slate-500">
                        No tables found for this filter.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredTables.map((table) => (
                            <div
                                key={table._id}
                                className="rounded-xl border p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            RESTAURANT TABLE
                                        </p>
                                        <h3 className="mt-1 text-lg font-bold text-slate-800">
                                            {tableName(table)}
                                        </h3>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getTableStyle(table.status)}`}
                                    >
                                        {String(table.status || "unknown")
                                            .replaceAll("_", " ")}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2 text-sm text-slate-600">
                                    <p>
                                        Capacity: {table.capacity ?? table.seats ?? "—"} guests
                                    </p>
                                    <p>
                                        Section: {table.section || table.location || "—"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
