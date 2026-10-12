import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

function KitchenKOT() {
    const [kots, setKots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    // ================================
    // FETCH KOTS
    // ================================

    const fetchKOTs = async () => {
        try {
            setError("");

            const response = await axios.get(
                `${API}/kots`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setKots(
                response.data.kots ||
                response.data.data ||
                []
            );

        } catch (error) {
            console.error("Fetch KOT Error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to fetch KOTs"
            );
        } finally {
            setLoading(false);
        }
    };

    // ================================
    // UPDATE STATUS
    // ================================

    const updateStatus = async (kotId, status) => {
        try {
            await axios.patch(
                `${API}/kots/${kotId}/status`,
                {
                    status,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            fetchKOTs();

        } catch (error) {
            console.error(
                "Update KOT Status Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to update KOT status"
            );
        }
    };

    useEffect(() => {
        fetchKOTs();

        // Refresh every 5 seconds
        const interval = setInterval(() => {
            fetchKOTs();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // ================================
    // LOADING
    // ================================

    if (loading) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold">
                    Loading Kitchen Orders...
                </h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">

            {/* HEADER */}

            <div className="flex justify-between items-center mb-6">

                <div>
                    <h1 className="text-3xl font-bold">
                        👨‍🍳 Kitchen KOT
                    </h1>

                    <p className="text-gray-600">
                        Manage restaurant kitchen orders
                    </p>
                </div>

                <button
                    onClick={fetchKOTs}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    🔄 Refresh
                </button>

            </div>

            {/* ERROR */}

            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded mb-5">
                    {error}
                </div>
            )}

            {/* NO KOT */}

            {kots.length === 0 && !error && (
                <div className="bg-white p-8 rounded shadow text-center">

                    <h2 className="text-xl font-bold">
                        No Kitchen Orders
                    </h2>

                    <p className="text-gray-500 mt-2">
                        New waiter orders will appear here.
                    </p>

                </div>
            )}

            {/* KOT CARDS */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {kots.map((kot) => (

                    <div
                        key={kot._id}
                        className="bg-white rounded-lg shadow-md overflow-hidden"
                    >

                        {/* KOT HEADER */}

                        <div className="bg-gray-900 text-white p-4">

                            <div className="flex justify-between">

                                <div>
                                    <h2 className="font-bold text-lg">
                                        KOT #{kot._id.slice(-6).toUpperCase()}
                                    </h2>

                                    <p className="text-sm">
                                        Table:{" "}
                                        {kot.table?.tableNumber ||
                                            kot.table?.name ||
                                            kot.table ||
                                            "N/A"}
                                    </p>
                                </div>

                                <span
                                    className={`px-3 py-1 rounded text-sm font-bold ${
                                        kot.status === "pending"
                                            ? "bg-yellow-500"
                                            : kot.status === "preparing"
                                            ? "bg-blue-500"
                                            : kot.status === "ready"
                                            ? "bg-green-500"
                                            : "bg-gray-500"
                                    }`}
                                >
                                    {kot.status}
                                </span>

                            </div>

                        </div>

                        {/* ITEMS */}

                        <div className="p-4">

                            <h3 className="font-bold mb-3">
                                🍽️ Items
                            </h3>

                            <div className="space-y-3">

                                {kot.items?.map(
                                    (item, index) => (

                                        <div
                                            key={
                                                item._id ||
                                                index
                                            }
                                            className="border-b pb-2"
                                        >

                                            <div className="flex justify-between">

                                                <span className="font-medium">
                                                    {item.name}
                                                </span>

                                                <span className="font-bold">
                                                    × {item.quantity}
                                                </span>

                                            </div>

                                            {item.specialInstructions && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Note:{" "}
                                                    {
                                                        item.specialInstructions
                                                    }
                                                </p>
                                            )}

                                        </div>

                                    )
                                )}

                            </div>

                            {/* ACTION BUTTONS */}

                            <div className="mt-5">

                                {kot.status === "pending" && (
                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                kot._id,
                                                "preparing"
                                            )
                                        }
                                        className="w-full bg-blue-600 text-white py-2 rounded"
                                    >
                                        👨‍🍳 Start Preparing
                                    </button>
                                )}

                                {kot.status === "preparing" && (
                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                kot._id,
                                                "ready"
                                            )
                                        }
                                        className="w-full bg-green-600 text-white py-2 rounded"
                                    >
                                        ✅ Mark Ready
                                    </button>
                                )}

                                {kot.status === "ready" && (
                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                kot._id,
                                                "served"
                                            )
                                        }
                                        className="w-full bg-purple-600 text-white py-2 rounded"
                                    >
                                        🍽️ Mark Served
                                    </button>
                                )}

                                {kot.status === "served" && (
                                    <div className="text-center bg-gray-100 p-2 rounded">
                                        ✅ Order Served
                                    </div>
                                )}

                            </div>

                        </div>

                    </div>

                ))}

            </div>

        </div>
    );
}

export default KitchenKOT;