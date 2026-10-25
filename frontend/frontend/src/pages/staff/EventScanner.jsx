
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const EventScanner = () => {
    const scannerRef = useRef(null);
    const busyRef = useRef(false);

    const [cameraRunning, setCameraRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ticket, setTicket] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    const authConfig = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    useEffect(() => {
        return () => {
            const scanner = scannerRef.current;

            if (scanner?.isScanning) {
                scanner.stop().catch(() => {});
            }
        };
    }, []);

    const verifyTicket = async (qrText) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setLoading(true);
        setError("");
        setMessage("");
        setTicket(null);

        try {
            // QR may contain the full ticket URL or just the token.
            let ticketToken = qrText.trim();

            try {
                const url = new URL(ticketToken);
                const match = url.pathname.match(
                    /\/event-ticket\/verify\/([a-f0-9]{64})\/?$/i
                );

                if (match) ticketToken = match[1];
            } catch {
                // QR content is not a URL; treat it as a token.
            }

            if (!/^[a-f0-9]{64}$/i.test(ticketToken)) {
                throw new Error("QR code is not a valid event ticket.");
            }

            const response = await axios.get(
                `${API_URL}/event-registrations/ticket/${encodeURIComponent(ticketToken)}`,
                authConfig
            );

            setTicket({
                ...response.data,
                token: ticketToken,
            });

            setMessage("Ticket verified successfully.");
            stopCamera();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to verify this ticket."
            );
        } finally {
            setLoading(false);
            busyRef.current = false;
        }
    };

    const startCamera = async () => {
        setError("");
        setMessage("");
        setTicket(null);

        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("event-qr-reader");
            }

            if (scannerRef.current.isScanning) return;

            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    verifyTicket(decodedText);
                },
                () => {}
            );

            setCameraRunning(true);
        } catch (err) {
            setError(
                "Camera could not start. Allow camera permission and use localhost or HTTPS."
            );
            console.error("Camera start error:", err);
        }
    };

    const stopCamera = async () => {
        const scanner = scannerRef.current;

        if (scanner?.isScanning) {
            try {
                await scanner.stop();
            } catch (err) {
                console.error("Camera stop error:", err);
            }
        }

        setCameraRunning(false);
    };

    const checkInAttendee = async (attendeeIndex) => {
        if (!ticket?.token) return;

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await axios.post(
                `${API_URL}/event-registrations/ticket/${encodeURIComponent(ticket.token)}/check-in`,
                { attendeeIndex },
                authConfig
            );

            setMessage(response.data.message || "Entry recorded.");

            // Refresh ticket data so entry status stays accurate.
            const refreshed = await axios.get(
                `${API_URL}/event-registrations/ticket/${encodeURIComponent(ticket.token)}`,
                authConfig
            );

            setTicket({
                ...refreshed.data,
                token: ticket.token,
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to record attendee entry."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
            <div className="mx-auto max-w-4xl">
                <Link
                    to="/staff"
                    className="text-blue-700 hover:underline"
                >
                    ← Back to Staff Dashboard
                </Link>

                <h1 className="mt-5 text-3xl font-bold text-gray-800">
                    Event QR Scanner
                </h1>

                <p className="mt-2 text-gray-600">
                    Scan a paid event ticket and check in attendees.
                </p>

                <div className="mt-6 rounded-xl bg-white p-5 shadow">
                    <div
                        id="event-qr-reader"
                        className="mx-auto w-full max-w-md overflow-hidden"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                        {!cameraRunning ? (
                            <button
                                type="button"
                                onClick={startCamera}
                                disabled={loading}
                                className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
                            >
                                Start Camera
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="rounded-lg bg-gray-700 px-5 py-3 text-white"
                            >
                                Stop Camera
                            </button>
                        )}
                    </div>

                    {loading && (
                        <p className="mt-4 text-gray-600">
                            Please wait...
                        </p>
                    )}

                    {message && (
                        <p className="mt-4 rounded-lg bg-green-100 p-3 text-green-800">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">
                            {error}
                        </p>
                    )}
                </div>

                {ticket && (
                    <div className="mt-6 rounded-xl bg-white p-5 shadow">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {ticket.event?.title || "Event Ticket"}
                        </h2>

                        <p className="mt-2 text-gray-600">
                            Booking contact: {ticket.customerName}
                        </p>

                        <p className="text-gray-600">
                            Venue: {ticket.event?.venue || "—"}
                        </p>

                        <p className="mt-2 font-medium">
                            Entries: {ticket.checkedInCount || 0} / {ticket.quantity}
                        </p>

                        <h3 className="mt-5 text-lg font-semibold">
                            Attendees
                        </h3>

                        <div className="mt-3 space-y-3">
                            {(ticket.attendees || []).map((attendee) => (
                                <div
                                    key={attendee.index}
                                    className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {attendee.name}
                                        </p>

                                        <p className="text-sm text-gray-600">
                                            {attendee.checkedIn
                                                ? "Already checked in"
                                                : "Not checked in"}
                                        </p>
                                    </div>

                                    {attendee.checkedIn ? (
                                        <span className="font-medium text-green-700">
                                            Entered ✓
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={() =>
                                                checkInAttendee(attendee.index)
                                            }
                                            className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                                        >
                                            Check In
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setTicket(null);
                                setMessage("");
                                setError("");
                            }}
                            className="mt-5 rounded-lg border px-4 py-2"
                        >
                            Scan Another Ticket
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventScanner;
