
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Load Razorpay Checkout script only when needed.
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

export default function EventRegistration() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    quantity: 1,
    attendees: [{ name: "" }],
  });

  // Fetch published events and find the event from the URL.
  useEffect(() => {
    let active = true;

    const loadEvent = async () => {
      try {
        const response = await axios.get(`${API_URL}/events`);

        const events = Array.isArray(response.data)
          ? response.data
          : response.data.events ||
            response.data.data ||
            response.data.eventsList ||
            [];

        const found = events.find(
          (item) => String(item._id) === String(eventId)
        );

        if (!active) return;

        if (!found) {
          setError(
            "Event nahi mila ya registration available nahi hai. Event published hai ya nahi, check karo."
          );
        } else {
          setEvent(found);
        }
      } catch (err) {
        if (!active) return;

        setError(
          err.response?.data?.message ||
            "Event load nahi ho paaya. Backend aur API URL check karo."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  const changeQuantity = (value) => {
    const count = Number(value);
    const maxAllowed = Math.min(
      20,
      Math.max(1, Number(event?.capacity) || 20)
    );

    if (!Number.isInteger(count) || count < 1 || count > maxAllowed) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      quantity: count,
      attendees: Array.from(
        { length: count },
        (_, index) => previous.attendees[index] || { name: "" }
      ),
    }));
  };

  const updateAttendee = (index, name) => {
    setForm((previous) => ({
      ...previous,
      attendees: previous.attendees.map((attendee, i) =>
        i === index ? { ...attendee, name } : attendee
      ),
    }));
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (paymentLoading) return;

    if (!eventId || !event?._id) {
      setError("Event details missing hain. Page refresh karke try karo.");
      return;
    }

    if (
      !form.customerName.trim() ||
      !form.customerEmail.trim() ||
      !form.customerPhone.trim() ||
      form.attendees.some((attendee) => !attendee.name.trim())
    ) {
      setError("Customer details aur sabhi attendee names bharo.");
      return;
    }

    setPaymentLoading(true);

    try {
      // Step 1: Create registration and Razorpay order on backend.
      const response = await axios.post(
        `${API_URL}/event-registrations/register`,
        {
          eventId,
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim(),
          customerPhone: form.customerPhone.trim(),
          attendees: form.attendees.map((attendee) => ({
            name: attendee.name.trim(),
          })),
        }
      );

      const order = response.data;

      if (
        !order.success ||
        !order.key ||
        !order.razorpayOrderId ||
        !order.registrationId ||
        !Number(order.amount)
      ) {
        throw new Error(
          order.message || "Razorpay order details incomplete hain."
        );
      }

      // Step 2: Load Razorpay Checkout.
      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Razorpay Checkout load nahi hua. Internet connection check karo."
        );
      }

      // Step 3: Open Razorpay payment window.
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Hotel & Restaurant",
        description: `Event ticket: ${order.eventTitle || event.title}`,
        order_id: order.razorpayOrderId,

        prefill: {
          name: form.customerName.trim(),
          email: form.customerEmail.trim(),
          contact: form.customerPhone.trim(),
        },

        notes: {
          registrationId: order.registrationId,
        },

        theme: {
          color: "#ea580c",
        },

        // Step 4: Verify the payment on your backend.
        handler: async (paymentResponse) => {
          setError("");
          setSuccessMessage("Payment verify ho raha hai...");

          try {
            const verifyResponse = await axios.post(
              `${API_URL}/event-registrations/verify-payment`,
              {
                registrationId: order.registrationId,
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,
                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,
                razorpay_signature:
                  paymentResponse.razorpay_signature,
              }
            );

            const verification = verifyResponse.data;

            if (!verification.success) {
              throw new Error(
                verification.message || "Payment verification failed."
              );
            }

            if (verification.ticketEmailSent) {
              setSuccessMessage(
                "Payment successful! Tumhara event ticket QR email par bhej diya gaya hai."
              );
            } else {
              setSuccessMessage(
                "Payment verify ho gaya, lekin ticket email send hone ki confirmation nahi mili. Apna inbox aur spam folder check karo; zaroorat ho to hotel admin se contact karo."
              );
            }

            setShowForm(false);
          } catch (verifyError) {
            console.error(
              "Event payment verification error:",
              verifyError
            );

            setError(
              verifyError.response?.data?.message ||
                verifyError.message ||
                "Payment status verify nahi ho paaya. Dobara payment karne se pehle status check karo."
            );

            setSuccessMessage("");
          } finally {
            setPaymentLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", (paymentError) => {
        console.error(
          "Razorpay payment failed:",
          paymentError.error
        );

        setError(
          paymentError.error?.description ||
            "Payment fail ho gaya. Payment status check karke dobara try karo."
        );

        setSuccessMessage("");
        setPaymentLoading(false);
      });

      checkout.open();
    } catch (err) {
      console.error("Event registration error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Registration ya payment start nahi ho paaya."
      );

      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[50vh] p-10 text-center">
        <p className="text-red-600">
          {error || "Event available nahi hai."}
        </p>
      </div>
    );
  }

  const start = event.startDate
    ? new Date(event.startDate).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "To be announced";

  const end = event.endDate
    ? new Date(event.endDate).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const deadline = event.registrationDeadline
    ? new Date(event.registrationDeadline).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const totalAmount =
    Number(event.ticketPrice || 0) * Number(form.quantity);

  const registrationClosed =
    event.status !== "published" ||
    (event.registrationDeadline &&
      new Date(event.registrationDeadline).getTime() < Date.now()) ||
    (event.startDate &&
      new Date(event.startDate).getTime() <= Date.now()) ||
    Number(event.bookedTickets || 0) >= Number(event.capacity || 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-lg">
        {event.poster && (
          <img
            src={event.poster}
            alt={event.title}
            className="h-64 w-full object-cover sm:h-80"
          />
        )}

        <div className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
            Upcoming Event
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {event.title}
          </h1>

          <p className="mt-4 whitespace-pre-line text-gray-600">
            {event.description || "Join us for this special event!"}
          </p>

          <div className="mt-6 space-y-3 rounded-xl bg-gray-50 p-4 text-gray-700">
            <p>
              <strong>Venue:</strong>{" "}
              {event.venue || "To be announced"}
            </p>

            <p>
              <strong>Start date:</strong> {start}
            </p>

            {end && (
              <p>
                <strong>End date:</strong> {end}
              </p>
            )}

            <p>
              <strong>Ticket price:</strong>{" "}
              ₹{Number(event.ticketPrice || 0).toLocaleString("en-IN")}
            </p>

            {deadline && (
              <p>
                <strong>Registration deadline:</strong> {deadline}
              </p>
            )}

            {event.capacity != null && (
              <p>
                <strong>Capacity:</strong> {event.capacity}
              </p>
            )}
          </div>

          {successMessage && (
            <div
              role="status"
              className="mt-5 rounded-lg bg-green-50 p-4 text-green-800"
            >
              {successMessage}
            </div>
          )}

          {!showForm ? (
            <button
              type="button"
              disabled={Boolean(registrationClosed)}
              onClick={() => {
                setError("");
                setShowForm(true);
              }}
              className="mt-6 w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {registrationClosed
                ? "Registration Closed"
                : "Register for Event"}
            </button>
          ) : (
            <form
              onSubmit={submitRegistration}
              className="mt-8 space-y-4"
            >
              <h2 className="text-xl font-bold text-gray-900">
                Customer Registration
              </h2>

              <input
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Full name"
                value={form.customerName}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    customerName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border p-3"
              />

              <input
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                placeholder="Email address"
                value={form.customerEmail}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    customerEmail: e.target.value,
                  }))
                }
                className="w-full rounded-lg border p-3"
              />

              <input
                required
                type="tel"
                maxLength={20}
                autoComplete="tel"
                placeholder="Phone number"
                value={form.customerPhone}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    customerPhone: e.target.value,
                  }))
                }
                className="w-full rounded-lg border p-3"
              />

              <label className="block font-medium text-gray-800">
                Number of attendees

                <select
                  value={form.quantity}
                  onChange={(e) => changeQuantity(e.target.value)}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {Array.from(
                    {
                      length: Math.min(
                        20,
                        Math.max(
                          1,
                          Number(event.capacity || 20) -
                            Number(event.bookedTickets || 0)
                        )
                      ),
                    },
                    (_, i) => i + 1
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>

              {form.attendees.map((attendee, index) => (
                <input
                  key={index}
                  required
                  maxLength={100}
                  placeholder={`Attendee ${index + 1} full name`}
                  value={attendee.name}
                  onChange={(e) =>
                    updateAttendee(index, e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                />
              ))}

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  ₹{Number(event.ticketPrice || 0).toLocaleString("en-IN")}{" "}
                  × {form.quantity} attendee(s)
                </p>

                <p className="mt-1 text-xl font-bold">
                  Total: ₹{totalAmount.toLocaleString("en-IN")}
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={paymentLoading}
                className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paymentLoading
                  ? "Processing..."
                  : `Pay ₹${totalAmount.toLocaleString("en-IN")}`}
              </button>

              <button
                type="button"
                disabled={paymentLoading}
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="w-full rounded-lg border px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Back to Event Details
              </button>
            </form>
          )}

          {error && !showForm && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
