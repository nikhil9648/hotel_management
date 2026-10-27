
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  CheckCircle2,
  Circle,
  Package,
  ChefHat,
  Truck,
  MapPin,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  CalendarDays,
  Hash,
} from "lucide-react";

const API = "http://localhost:5000/api";
const REFRESH_INTERVAL = 15000;

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const titleCase = (value) =>
  String(value || "Pending")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeStatus = (status) =>
  String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const ORDER_STEPS = [
  {
    key: "confirmed",
    label: "Order Confirmed",
    description: "Your order has been accepted.",
    icon: CheckCircle2,
  },
  {
    key: "preparing",
    label: "Preparing Your Food",
    description: "Our kitchen is preparing your order.",
    icon: ChefHat,
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    description: "Your order is on its way to you.",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Your order has been delivered. Enjoy your meal!",
    icon: Package,
  },
];

// Supports common backend status names.
const STATUS_ALIASES = {
  pending: "pending",
  placed: "pending",
  order_placed: "pending",
  confirmed: "confirmed",
  accepted: "confirmed",
  order_confirmed: "confirmed",
  preparing: "preparing",
  processing: "preparing",
  food_preparing: "preparing",
  ready: "preparing",
  ready_for_pickup: "preparing",
  out_for_delivery: "out_for_delivery",
  outfordelivery: "out_for_delivery",
  dispatched: "out_for_delivery",
  shipped: "out_for_delivery",
  delivered: "delivered",
  completed: "delivered",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const getOrderStage = (status) => {
  const normalized = normalizeStatus(status);
  return STATUS_ALIASES[normalized] || normalized;
};

const getStageIndex = (status) => {
  const stage = getOrderStage(status);

  if (stage === "pending") return -1;
  if (stage === "confirmed") return 0;
  if (stage === "preparing") return 1;
  if (stage === "out_for_delivery") return 2;
  if (stage === "delivered") return 3;

  return -1;
};

const getDeliveryOtp = (order) => {
  // Match these fields with your actual backend response.
  const value =
    order?.deliveryOtp ??
    order?.deliveryOTP ??
    order?.deliveryOtpCode ??
    order?.otp ??
    null;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
};

const getStatusStyle = (status) => {
  const stage = getOrderStage(status);

  const styles = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
    preparing: "bg-orange-50 text-orange-700 ring-orange-200",
    out_for_delivery: "bg-violet-50 text-violet-700 ring-violet-200",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cancelled: "bg-red-50 text-red-700 ring-red-200",
  };

  return styles[stage] || "bg-gray-100 text-gray-700 ring-gray-200";
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function OrderTimeline({ status }) {
  const stage = getOrderStage(status);
  const currentIndex = getStageIndex(status);
  const isCancelled = stage === "cancelled";

  if (isCancelled) {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle size={22} />
          <div>
            <h4 className="font-bold">Order Cancelled</h4>
            <p className="mt-1 text-sm text-red-600">
              This order is no longer being processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-7 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            Live tracking
          </p>
          <h3 className="mt-1 text-lg font-bold text-gray-900">
            Your order journey
          </h3>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${getStatusStyle(
            status
          )}`}
        >
          {titleCase(status)}
        </span>
      </div>

      <div className="relative">
        {ORDER_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete =
            stage === "delivered" || index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = !isComplete && !isCurrent;

          // Delivered means every step is complete.
          const complete = isComplete || stage === "delivered";

          return (
            <div key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
              {index < ORDER_STEPS.length - 1 && (
                <div
                  className={`absolute left-[17px] top-9 h-[calc(100%-12px)] w-0.5 ${
                    complete
                      ? "bg-emerald-400"
                      : "bg-gray-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  complete
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-orange-500 text-white ring-4 ring-orange-100"
                    : "border border-gray-200 bg-white text-gray-400"
                }`}
              >
                {complete ? (
                  <CheckCircle2 size={20} />
                ) : isCurrent ? (
                  <Icon size={19} />
                ) : (
                  <Circle size={19} />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={`text-sm font-bold sm:text-base ${
                      isPending ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {step.label}
                  </h4>

                  {isCurrent && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                      Current
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 text-sm ${
                    isPending ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeliveryOtp({ order }) {
  const stage = getOrderStage(order.orderStatus);
  const otp = getDeliveryOtp(order);

  // Never display the OTP after the order is delivered or cancelled.
  if (stage === "delivered" || stage === "cancelled") {
    return null;
  }

  if (!otp) {
    return (
      <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Clock3 className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div>
          <h4 className="text-sm font-bold text-amber-900">
            Delivery OTP not available
          </h4>
          <p className="mt-1 text-sm text-amber-800">
            Your delivery verification code will appear here when it is
            provided by the server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
            <ShieldCheck size={23} />
          </div>

          <div>
            <h3 className="font-bold text-gray-900">Your delivery OTP</h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-gray-600">
              Share this code with the delivery person only when your order
              arrives. Keep it private until delivery.
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-5 py-3"
          aria-label="Delivery verification code"
        >
          {otp.split("").map((digit, index) => (
            <span
              key={`${index}-${digit}`}
              className="flex h-10 min-w-8 items-center justify-center rounded-lg bg-orange-50 px-2 text-2xl font-extrabold tracking-wider text-orange-700"
            >
              {digit}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-orange-200/80 bg-orange-100/60 px-4 py-3 text-xs font-medium text-orange-800 sm:px-5">
        <ShieldCheck size={15} />
        OTP is hidden automatically once your order is delivered.
      </div>
    </section>
  );
}

function OrderCard({ order, index }) {
  const items = order.items || [];
  const status = getOrderStage(order.orderStatus);
  const isActive = !["delivered", "cancelled"].includes(status);

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-600">
              <Hash size={14} />
              Order {order.orderNumber || String(order._id || "").slice(-6).toUpperCase()}
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays size={15} />
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ring-1 ${getStatusStyle(
              status
            )}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {titleCase(status)}
          </span>
        </div>

        {isActive && <OrderTimeline status={status} />}
        {!isActive && status === "delivered" && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 size={24} className="shrink-0" />
            <div>
              <h3 className="font-bold">Order delivered successfully</h3>
              <p className="mt-1 text-sm text-emerald-700">
                Thank you for ordering from Maurya Kitchen & Stays!
              </p>
            </div>
          </div>
        )}

        <DeliveryOtp order={order} />
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Items in your order</h3>
          <span className="text-xs text-gray-500">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="space-y-4">
          {items.map((item, itemIndex) => {
            const quantity = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            const total =
              item.total !== undefined && item.total !== null
                ? Number(item.total)
                : price * quantity;

            return (
              <div
                key={item._id || `${order._id}-${itemIndex}`}
                className="flex items-center gap-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <UtensilsCrossed size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {item.name || item.food?.name || "Menu item"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Qty: {quantity}
                    {price > 0 ? ` · ₹${money(price)} each` : ""}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-bold text-gray-900">
                  ₹{money(total)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="my-5 border-t border-dashed border-gray-200" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Payment status</span>
              <span className="font-semibold text-gray-800">
                {titleCase(order.paymentStatus)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-gray-500">
                <ShoppingBag size={15} />
                Order type
              </span>
              <span className="font-semibold text-gray-800">
                {titleCase(order.orderType)}
              </span>
            </div>

            {order.table?.tableNumber && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-gray-500">
                  <MapPin size={15} />
                  Table
                </span>
                <span className="font-semibold text-gray-800">
                  {order.table.tableNumber}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <CreditCard size={15} />
              Order total
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
              ₹{money(order.totalAmount)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {titleCase(order.paymentStatus)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      if (!token) {
        setOrders([]);
        setError("Please sign in to view your orders.");
        return;
      }

      const response = await axios.get(
        `${API}/restaurant-orders/my-orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders(
        Array.isArray(response.data.orders) ? response.data.orders : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your orders right now."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);

    const intervalId = setInterval(() => {
      fetchOrders(false);
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  const activeOrders = orders.filter((order) => {
    const stage = getOrderStage(order.orderStatus);
    return !["delivered", "cancelled"].includes(stage);
  });

  return (
    <main className="min-h-screen bg-[#faf9f6] text-gray-900">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <UtensilsCrossed size={21} />
            </span>
            <span>
              <span className="block text-base font-extrabold tracking-wide">
                MAURYA
              </span>
              <span className="block text-[9px] font-semibold tracking-[0.22em] text-gray-500">
                KITCHEN & STAYS
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
            <Link className="transition hover:text-orange-600" to="/">
              Home
            </Link>
            <Link className="transition hover:text-orange-600" to="/menu">
              Menu
            </Link>
            <Link className="transition hover:text-orange-600" to="/rooms">
              Rooms
            </Link>
            <Link className="transition hover:text-orange-600" to="/contact">
              Contact us
            </Link>
            <Link className="font-bold text-orange-600" to="/my-orders">
              My orders
            </Link>
          </nav>

          <Link
            to="/profile"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold transition hover:border-orange-300 hover:text-orange-600 sm:text-sm"
          >
            My account
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#201c19] text-white">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-orange-300 sm:text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
              YOUR DINING EXPERIENCE
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your orders,
              <br />
              <span className="font-serif italic font-medium text-orange-400">
                all in one place.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-7 text-gray-300 sm:text-base">
              Track your food, follow every delivery step, and find your
              delivery OTP whenever you need it.
            </p>
          </div>

          <div className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 sm:flex lg:h-44 lg:w-44">
            <div className="text-center">
              <ShoppingBag
                className="mx-auto text-orange-400"
                size={52}
                strokeWidth={1.3}
              />
              <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-gray-300">
                MADE WITH CARE
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Orders */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
              YOUR TABLE, YOUR HISTORY
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              My orders
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {loading
                ? "Gathering your orders..."
                : `${orders.length} ${
                    orders.length === 1 ? "order" : "orders"
                  } on your account`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders(false)}
            disabled={refreshing || loading}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh orders"}
          </button>
        </div>

        {!loading && !error && activeOrders.length > 0 && (
          <div className="mb-7 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <Truck className="mt-0.5 shrink-0 text-blue-600" size={22} />
            <div>
              <h3 className="font-bold text-blue-900">
                {activeOrders.length === 1
                  ? "You have an active order"
                  : `You have ${activeOrders.length} active orders`}
              </h3>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Your order status refreshes automatically. Keep your delivery
                OTP ready and share it only when your order arrives.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 shrink-0 text-red-500" size={24} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  We couldn't load your orders
                </h3>
                <p className="mt-2 text-sm text-gray-600">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchOrders(true)}
                  className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-6">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-3xl border border-gray-200 bg-white p-6"
              >
                <div className="h-5 w-40 rounded bg-gray-200" />
                <div className="mt-5 h-3 w-64 max-w-full rounded bg-gray-100" />
                <div className="mt-8 h-36 rounded-2xl bg-gray-100" />
                <div className="mt-5 h-20 rounded-2xl bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <UtensilsCrossed size={30} />
            </div>
            <h3 className="mt-5 text-xl font-extrabold">
              Your next favourite is waiting
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              You haven't placed a food order yet. Explore our menu and order
              something delicious.
            </p>
            <Link
              to="/menu"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Explore the menu
              <ArrowRight size={17} />
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <OrderCard
                key={order._id}
                order={order}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-7 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
              <UtensilsCrossed size={17} />
            </span>
            <span className="text-sm text-gray-500">
              Good food has a way of bringing us back.
            </span>
          </div>

          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 transition hover:text-orange-700"
          >
            Order again
            <ArrowRight size={15} />
          </Link>
        </footer>
      </section>
    </main>
  );
}
