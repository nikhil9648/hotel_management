import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const REFRESH_INTERVAL = 10000;

export default function DeliveryBoyDashboard() {
  const [orders, setOrders] = useState([]);
  const [otpValues, setOtpValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("userToken");

  const getHeaders = useCallback(() => {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, [token]);

  // Fetch active orders assigned to the logged-in delivery boy.
  const fetchOrders = useCallback(
    async (showRefreshing = false) => {
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        if (showRefreshing) setRefreshing(true);

        const { data } = await axios.get(
          `${API}/delivery/my-orders`,
          getHeaders()
        );

        const fetchedOrders = Array.isArray(data)
          ? data
          : data.orders || data.data || [];

        // Only active delivery orders should appear here.
        const activeOrders = fetchedOrders.filter((order) => {
          const status = (
            order.status ||
            order.orderStatus ||
            ""
          ).toLowerCase();

          return ["ready", "out_for_delivery"].includes(status);
        });

        setOrders(activeOrders);
        setError("");
      } catch (err) {
        console.error("Fetch delivery orders error:", err);

        setError(
          err.response?.data?.message ||
            "Orders load nahi hue. Login aur API route check karo."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, getHeaders]
  );

  // Initial fetch and automatic refresh every 10 seconds.
  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Verify customer OTP and complete delivery.
  const verifyOtp = async (orderId) => {
    const otp = otpValues[orderId] || "";

    if (!/^\d{4}$/.test(otp)) {
      setError("Customer ka valid 4-digit OTP enter karo.");
      setSuccess("");
      return;
    }

    try {
      setBusyId(orderId);
      setError("");
      setSuccess("");

      const { data } = await axios.post(
        `${API}/delivery/${orderId}/verify-otp`,
        { otp },
        getHeaders()
      );

      setSuccess(
        data.message || "Delivery successfully completed!"
      );

      setOtpValues((previous) => ({
        ...previous,
        [orderId]: "",
      }));

      // Refetch active orders; delivered order will disappear
      // when the backend excludes delivered orders.
      await fetchOrders();
    } catch (err) {
      console.error("OTP verification error:", err);

      setError(
        err.response?.data?.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setBusyId("");
    }
  };

  const getStatus = (order) =>
    (order.status || order.orderStatus || "pending").toLowerCase();

  const getStatusStyle = (status) => {
    const styles = {
      ready: "bg-cyan-100 text-cyan-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
    };

    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getCustomerName = (order) =>
    order.customerName ||
    order.customer?.name ||
    order.customer?.fullName ||
    "Customer";

  const getCustomerPhone = (order) =>
    order.customerMobile ||
    order.customerPhone ||
    order.customer?.mobile ||
    order.customer?.phone ||
    order.phone ||
    "Not available";

  const getAddress = (order) => {
    const address =
      order.deliveryAddress ||
      order.address ||
      order.customer?.address;

    if (typeof address === "string") return address;

    if (address && typeof address === "object") {
      return (
        address.fullAddress ||
        address.address ||
        [
          address.houseNumber,
          address.street,
          address.area,
          address.city,
          address.state,
          address.pincode,
        ]
          .filter(Boolean)
          .join(", ") ||
        "Address not available"
      );
    }

    return "Address not available";
  };

  const getItems = (order) => order.items || order.orderItems || [];

  const getItemName = (item) =>
    item.name ||
    item.food?.name ||
    item.foodName ||
    "Food item";

  const getItemTotal = (item) => {
    if (item.total != null) return Number(item.total);

    const price = Number(item.price ?? item.food?.price ?? 0);
    const quantity = Number(item.quantity || 1);

    return price * quantity;
  };

  const getTotal = (order) =>
    order.totalAmount ??
    order.grandTotal ??
    order.total ??
    0;

  const getPaymentStatus = (order) =>
    order.paymentStatus ||
    order.payment?.status ||
    "unknown";

  const getPaymentMethod = (order) =>
    order.paymentMethod ||
    order.payment?.method ||
    "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="font-medium text-slate-600">
            Loading your deliveries...
          </p>
        </div>
      </div>
    );
  }

  const pendingOtpCount = orders.length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Delivery Partner Portal
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              My Deliveries
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Manage your assigned orders and confirm deliveries securely.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{refreshing ? "⏳" : "↻"}</span>
            {refreshing ? "Refreshing..." : "Refresh Orders"}
          </button>
        </header>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
          >
            <span>✓ {success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-bold"
              aria-label="Dismiss success"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active Deliveries
            </p>

            <div className="mt-3 flex items-end justify-between">
              <h2 className="text-4xl font-extrabold text-slate-900">
                {orders.length}
              </h2>

              <span className="rounded-xl bg-blue-50 p-3 text-xl">
                📦
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending OTP Verification
            </p>

            <div className="mt-3 flex items-end justify-between">
              <h2 className="text-4xl font-extrabold text-amber-600">
                {pendingOtpCount}
              </h2>

              <span className="rounded-xl bg-amber-50 p-3 text-xl">
                🔐
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Dashboard Status
            </p>

            <p className="mt-4 text-lg font-bold text-emerald-600">
              ● Connected
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Auto-refresh every 10 seconds
            </p>
          </div>
        </section>

        {/* Orders heading */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            Assigned Orders
          </h2>

          <span className="text-sm text-slate-500">
            {orders.length} active orders
          </span>
        </div>

        {/* Empty state */}
        {orders.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mb-4 text-5xl">🛵</div>

            <h3 className="text-xl font-bold text-slate-800">
              No Active Deliveries
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Orders assigned by the admin will appear here.
              Once an order is delivered and its OTP is verified,
              it will disappear from this active list.
            </p>

            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {refreshing ? "Checking..." : "Check Again"}
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {orders.map((order) => {
              const orderId = order._id;
              const status = getStatus(order);
              const items = getItems(order);

              return (
                <article
                  key={orderId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Order heading */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Order ID
                      </p>

                      <h3 className="mt-1 break-all text-lg font-extrabold text-slate-900">
                        {order.orderNumber || orderId}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {getCustomerName(order)}
                      </p>

                      {order.createdAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${getStatusStyle(status)}`}
                    >
                      {status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    {/* Customer details */}
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <span className="text-lg">📞</span>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Customer Phone
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-slate-800">
                            {getCustomerPhone(order)}
                          </p>

                          {getCustomerPhone(order) !== "Not available" && (
                            <a
                              href={`tel:${getCustomerPhone(order)}`}
                              className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Call Customer
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="text-lg">📍</span>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Delivery Address
                          </p>

                          <p className="mt-1 break-words text-sm leading-6 text-slate-700">
                            {getAddress(order)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="rounded-xl bg-slate-50 p-4">
                      <h4 className="mb-3 text-sm font-bold text-slate-800">
                        Order Items
                      </h4>

                      {items.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No items available.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {items.map((item, index) => (
                            <div
                              key={item._id || index}
                              className="flex items-start justify-between gap-3 text-sm"
                            >
                              <span className="min-w-0 text-slate-600">
                                {getItemName(item)}

                                <span className="ml-2 font-semibold text-slate-900">
                                  × {item.quantity || 1}
                                </span>
                              </span>

                              <span className="shrink-0 font-medium text-slate-800">
                                {formatCurrency(getItemTotal(item))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment details */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Payment Status
                        </p>

                        <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                          {String(getPaymentStatus(order)).replaceAll(
                            "_",
                            " "
                          )}
                        </p>

                        {getPaymentMethod(order) && (
                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {String(getPaymentMethod(order)).replaceAll(
                              "_",
                              " "
                            )}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-500">
                          Total Amount
                        </p>

                        <p className="mt-1 text-2xl font-extrabold text-slate-900">
                          {formatCurrency(getTotal(order))}
                        </p>
                      </div>
                    </div>

                    {/* OTP verification */}
                    <div>
                      <label
                        htmlFor={`otp-${orderId}`}
                        className="mb-2 block text-sm font-bold text-slate-800"
                      >
                        Customer Delivery OTP
                      </label>

                      <p className="mb-3 text-xs leading-5 text-slate-500">
                        Customer se OTP lekar enter karo. Server OTP
                        verify hone ke baad hi delivery complete hogi.
                      </p>

                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          verifyOtp(orderId);
                        }}
                        className="flex flex-col gap-3 sm:flex-row"
                      >
                        <input
                          id={`otp-${orderId}`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={4}
                          pattern="[0-9]{4}"
                          placeholder="Enter 4-digit OTP"
                          aria-label={`Delivery OTP for order ${order.orderNumber || orderId}`}
                          value={otpValues[orderId] || ""}
                          onChange={(event) => {
                            const value = event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4);

                            setOtpValues((previous) => ({
                              ...previous,
                              [orderId]: value,
                            }));
                          }}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />

                        <button
                          type="submit"
                          disabled={
                            busyId === orderId ||
                            (otpValues[orderId] || "").length !== 4
                          }
                          className="shrink-0 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyId === orderId
                            ? "Verifying..."
                            : "Verify OTP"}
                        </button>
                      </form>

                      <p className="mt-3 text-xs text-slate-400">
                        The order is removed from Active Orders after
                        successful server-side OTP verification.
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

