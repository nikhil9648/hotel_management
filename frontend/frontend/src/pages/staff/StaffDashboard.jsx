
import React from "react";
import { useNavigate } from "react-router-dom";

const StaffDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-3xl font-bold text-gray-800">
                    Event Entry Staff Dashboard
                </h1>

                <p className="mt-2 text-gray-600">
                    Welcome! Scan event tickets and manage guest entry.
                </p>

                <div className="mt-8 rounded-xl bg-white p-6 shadow">
                    <h2 className="text-xl font-semibold">
                        Event QR Scanner
                    </h2>

                    <p className="mt-2 text-gray-600">
                        Scan a guest's ticket, verify payment, and
                        mark attendee entry.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/staff/event-scanner")}
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                    >
                        Open QR Scanner
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
