
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = "http://localhost:5000/api/restaurant-orders";

const dashboardCards = [
  {
    title: "Assigned Tables",
    description: "Tables assigned to you",
    icon: "🪑",
    color: "bg-blue-50 text-blue-700",
    path: "/waiter/tables",
  },
  {
    title: "Active Orders",
    description: "Orders currently in progress",
    icon: "📋",
    color: "bg-orange-50 text-orange-700",
    path: "/waiter/orders",
  },
  {
    title: "Ready to Serve",
    description: "Orders ready from the kitchen",
    icon: "🍽️",
    color: "bg-green-50 text-green-700",
    path: "/waiter/orders",
  },
  {
    title: "Available Tables",
    description: "Tables available for customers",
    icon: "🪑",
    color: "bg-purple-50 text-purple-700",
    path: "/waiter/tables",
  },
];

const formatDateTime = (date) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function WaiterDashboard() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(API, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        });

        if (!active) return;

        // Supports APIs returning either an array or an object.
        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : data.orders || data.restaurantOrders || [];

        setOrders(
          [...list].sort(
            (a, b) =>
              new Date(b.createdAt || 0) -
              new Date(a.createdAt || 0)
          )
        );
        setError("");
      } catch (err) {
        console.error("Waiter dashboard orders error:", err);

        if (active) {
          setError(
            err.response?.data?.message ||
              "Orders could not be loaded. Check your orders API route."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  const firstName =
    user?.name?.trim()?.split(/\s+/)[0] || "Waiter";

  const activeOrders = orders.filter((order) =>
    ["pending", "confirmed", "preparing"].includes(
      order.orderStatus
    )
  );

  const readyOrders = orders.filter(
    (order) => order.orderStatus === "ready"
  );

  const cards = dashboardCards.map((card) => {
    let value = "—";

    if (card.title === "Active Orders") {
      value = activeOrders.length;
    } else if (card.title === "Ready to Serve") {
      value = readyOrders.length;
    }

    return { ...card, value };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            RESTAURANT OPERATIONS
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-800">
            Welcome, {firstName}! 👋
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your tables, create orders, and serve customers.
          </p>
        </div>

        <Link
          to="/waiter/create-order"
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          + Create New Order
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.path}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {card.title}
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-800">
                  {card.value}
                </p>
              </div>

              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${card.color}`}
              >
                {card.icon}
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Recent Orders
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Customer details and order creation time
            </p>
          </div>

          <Link
            to="/waiter/orders"
            className="font-medium text-blue-600 hover:underline"
          >
            View All Orders
          </Link>
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500">
            Loading orders...
          </p>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            No orders found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Mobile Number</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 10).map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {order.orderNumber || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {order.customerName || "Not provided"}
                    </td>

                    <td className="px-4 py-3">
                      {order.customerMobile || "Not provided"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      ₹{Number(order.totalAmount || 0).toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                        {order.orderStatus || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-800">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Link
            to="/waiter/tables"
            className="rounded-2xl border bg-white p-6 hover:border-blue-400 hover:shadow-md"
          >
            <span className="text-3xl">🪑</span>
            <h3 className="mt-4 font-semibold">View Tables</h3>
            <p className="mt-2 text-sm text-slate-500">
              Check table availability and assignments.
            </p>
          </Link>

          <Link
            to="/waiter/create-order"
            className="rounded-2xl border bg-white p-6 hover:border-blue-400 hover:shadow-md"
          >
            <span className="text-3xl">🍽️</span>
            <h3 className="mt-4 font-semibold">Create Order</h3>
            <p className="mt-2 text-sm text-slate-500">
              Add customer details and food items.
            </p>
          </Link>

          <Link
            to="/waiter/orders"
            className="rounded-2xl border bg-white p-6 hover:border-blue-400 hover:shadow-md"
          >
            <span className="text-3xl">🔔</span>
            <h3 className="mt-4 font-semibold">Track Orders</h3>
            <p className="mt-2 text-sm text-slate-500">
              Monitor kitchen progress and serve ready orders.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
