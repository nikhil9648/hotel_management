
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  RefreshCw,
  Package,
  MapPin,
  Phone,
  Navigation,
  ShieldCheck,
  Truck,
  Clock3,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  ChefHat,
  Route,
  MapPinned,
  ExternalLink,
} from "lucide-react";

const API = "http://localhost:5000/api";
const REFRESH_INTERVAL = 10000;

const normalizeStatus = (value) =>
  String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

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

  const getHeaders = useCallback(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  // Fetch active orders assigned to the logged-in delivery partner.
  const fetchOrders = useCallback(
    async (showRefreshing = false) => {
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        setRefreshing(false);
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

        const activeOrders = fetchedOrders.filter((order) => {
          const status = normalizeStatus(
            order.status || order.orderStatus
          );

          return [
            "confirmed",
            "preparing",
            "ready",
            "out_for_delivery",
          ].includes(status);
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

  useEffect(() => {
    fetchOrders();

    const intervalId = setInterval(() => {
      fetchOrders();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  // Read the delivery address saved with the order.
  // Supports common string and object address formats.
  const getAddress = (order) => {
    const address =
      order.deliveryAddress ||
      order.shippingAddress ||
      order.customerAddress ||
      order.address ||
      order.customer?.address;

    if (typeof address === "string") {
      return address.trim();
    }

    if (address && typeof address === "object") {
      // Prefer the complete saved address if present.
      const fullAddress =
        address.fullAddress ||
        address.formattedAddress;

      if (fullAddress) {
        return String(fullAddress).trim();
      }

      const parts = [
        address.houseNumber,
        address.flatNumber,
        address.building,
        address.street,
        address.addressLine1,
        address.addressLine2,
        address.area,
        address.locality,
        address.landmark,
        address.city,
        address.district,
        address.state,
        address.pincode || address.pinCode || address.postalCode,
        address.country,
      ];

      return [
        ...new Set(
          parts
            .filter(Boolean)
            .map((part) => String(part).trim())
        ),
      ].join(", ");
    }

    return "";
  };

  // Open Google Maps from the delivery partner's current GPS
  // location to the saved delivery address for this order.
  const getDirections = (order) => {
    const address = getAddress(order);

    if (!address) {
      setError(
        "Is order ka saved delivery address API response mein nahi mila. Backend controller aur Order model check karo."
      );
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");

    const destination = encodeURIComponent(address);

    const mapsUrl =
      "https://www.google.com/maps/dir/?api=1" +
      `&destination=${destination}` +
      "&travelmode=driving";

    // Open the Maps app or browser without blocking the current page.
    const newWindow = window.open(
      mapsUrl,
      "_blank",
      "noopener,noreferrer"
    );

    // Fallback if the browser blocks the new tab.
    if (!newWindow) {
      window.location.href = mapsUrl;
    }
  };

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
    normalizeStatus(order.status || order.orderStatus);

  const getStatusStyle = (status) => {
    const styles = {
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-amber-100 text-amber-800",
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
    "";

  const getItems = (order) =>
    order.items || order.orderItems || [];

  const getItemName = (item) =>
    item.name ||
    item.food?.name ||
    item.foodName ||
    "Food item";

  const getItemTotal = (item) => {
    if (item.total != null) {
      return Number(item.total);
    }

    return (
      Number(item.price ?? item.food?.price ?? 0) *
      Number(item.quantity || 1)
    );
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

  const getOrderDate = (order) => {
    if (!order.createdAt) return "";

    const date = new Date(order.createdAt);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Delivery Partner Portal
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              My Deliveries
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Manage orders, navigate to customers, and verify deliveries.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh Orders"}
          </button>
        </header>

        {/* Error alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Success alert */}
        {success && (
          <div
            role="status"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{success}</span>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success"
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Active Deliveries"
            value={orders.length}
            icon={<Package size={22} />}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            label="Pending OTP Verification"
            value={orders.length}
            icon={<ShieldCheck size={22} />}
            iconClass="bg-amber-50 text-amber-600"
          />

          <SummaryCard
            label="Dashboard Status"
            value="Connected"
            subtitle="Auto-refresh every 10 seconds"
            icon={<Truck size={22} />}
            iconClass="bg-emerald-50 text-emerald-600"
          />
        </section>

        {/* Assigned orders heading */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            Assigned Orders
          </h2>

          <span className="text-sm text-slate-500">
            {orders.length} active orders
          </span>
        </div>

        {/* Empty state */}
        {orders.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Truck size={32} />
            </div>

            <h3 className="text-xl font-bold">
              No Active Deliveries
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Orders assigned by the admin will appear here.
              Completed deliveries will be removed from this active list.
            </p>

            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              Check Again
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {orders.map((order) => {
              const orderId = order._id;
              const status = getStatus(order);
              const items = getItems(order);
              const address = getAddress(order);
              const phone = getCustomerPhone(order);

              return (
                <article
                  key={orderId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Order header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Order ID
                      </p>

                      <h3 className="mt-1 break-all text-lg font-extrabold">
                        {order.orderNumber || orderId}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        {getCustomerName(order)}
                      </p>

                      {getOrderDate(order) && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock3 size={13} />
                          {getOrderDate(order)}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(status)}`}
                    >
                      {status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">

                    {/* Customer contact */}
                    <section className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Phone size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Customer Phone
                          </p>

                          <p className="mt-1 break-words text-sm font-semibold">
                            {phone || "Not available"}
                          </p>

                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Call Customer
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Saved delivery address */}
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                          <MapPin size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Customer Delivery Address
                          </p>

                          <p className="mt-1 break-words text-sm leading-6 text-slate-700">
                            {address || "Saved delivery address not returned by API"}
                          </p>

                          {address && (
                            <button
                              type="button"
                              onClick={() => getDirections(order)}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                            >
                              <MapPinned size={14} />
                              Navigate to this address
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Get Directions */}
                    <button
                      type="button"
                      onClick={() => getDirections(order)}
                      disabled={!address}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-blue-600 p-4 text-left text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 transition group-hover:bg-white/20">
                        <Navigation size={25} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">
                          Get Directions
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-blue-100">
                          Google Maps · Route to customer location
                        </span>
                      </span>

                      <Route size={22} className="shrink-0" />
                    </button>

                    {/* Order items */}
                    <section className="rounded-xl bg-slate-50 p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
                        <ChefHat size={17} className="text-slate-500" />
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

                              <span className="shrink-0 font-semibold text-slate-800">
                                {formatCurrency(getItemTotal(item))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Payment details */}
                    <section className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <CreditCard size={15} />
                          Payment Status
                        </p>

                        <p className="mt-1 text-sm font-semibold capitalize">
                          {String(getPaymentStatus(order)).replaceAll("_", " ")}
                        </p>

                        {getPaymentMethod(order) && (
                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {String(getPaymentMethod(order)).replaceAll("_", " ")}
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
                    </section>

                    {/* OTP verification */}
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={21} />

                        <h4 className="text-sm font-bold text-slate-800">
                          Customer Delivery OTP
                        </h4>
                      </div>

                      <p className="mb-3 text-xs leading-5 text-slate-500">
                        Customer se OTP lekar enter karo. Delivery tabhi
                        complete hogi jab server OTP verify karega.
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
                          aria-label="Customer delivery OTP"
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
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none transition placeholder:tracking-normal placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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

                      <p className="mt-3 text-xs leading-5 text-slate-400">
                        Successful server-side verification removes the
                        completed order from active deliveries.
                      </p>
                    </section>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          Delivery Partner Dashboard · Safe delivery, happy customers.
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, subtitle, icon, iconClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <span className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </span>
      </div>

      <h2
        className={`mt-3 font-extrabold tracking-tight ${
          typeof value === "number"
            ? "text-4xl text-slate-900"
            : "text-xl text-emerald-600"
        }`}
      >
        {value}
      </h2>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
