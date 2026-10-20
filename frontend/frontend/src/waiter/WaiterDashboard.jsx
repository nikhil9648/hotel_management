
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/restaurant-orders/my-orders";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  "";

const getOrderStatus = (order) =>
  order.orderStatus || order.status || "pending";

const formatStatus = (status) =>
  String(status).replaceAll("_", " ");

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusClass = (status) => {
  const value = String(status).toLowerCase();

  if (value === "ready" || value === "completed" || value === "served") {
    return "bg-green-100 text-green-800";
  }

  if (value === "preparing") {
    return "bg-blue-100 text-blue-800";
  }

  if (value === "cancelled") {
    return "bg-red-100 text-red-800";
  }

  return "bg-yellow-100 text-yellow-800";
};

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchOrders = useCallback(async (initial = false) => {
    const token = getToken();

    if (!token) {
      setError("Please log in to access the waiter dashboard.");
      setLoading(false);
      return;
    }

    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await axios.get(API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data.orders || data.data || [];

      // Hide online delivery orders in the waiter interface.
      const waiterOrders = list.filter(
        (order) => order.orderType !== "delivery"
      );

      waiterOrders.sort(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setOrders(waiterOrders);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load orders. Check your login and backend API."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);

    const timer = setInterval(() => {
      fetchOrders(false);
    }, 5000);

    return () => clearInterval(timer);
  }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus) => {
    const token = getToken();

    try {
      setUpdatingId(orderId);

      // This endpoint must exist in your backend.
      await axios.patch(
        `http://localhost:5000/api/restaurant-orders/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchOrders(false);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Could not update the order status. Check your backend route."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const visibleOrders = orders.filter((order) => {
    const status = getOrderStatus(order).toLowerCase();

    if (filter === "active") {
      return !["served", "completed", "cancelled"].includes(status);
    }

    if (filter === "ready") {
      return status === "ready";
    }

    if (filter === "completed") {
      return ["served", "completed"].includes(status);
    }

    return true;
  });

  const activeCount = orders.filter((order) =>
    !["served", "completed", "cancelled"].includes(
      getOrderStatus(order).toLowerCase()
    )
  ).length;

  const readyCount = orders.filter(
    (order) => getOrderStatus(order).toLowerCase() === "ready"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center">
        Loading waiter dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Waiter Dashboard
            </h1>
            <p className="mt-1 text-gray-500">
              Manage dine-in and takeaway service orders.
            </p>
          </div>

          <button
            onClick={() => fetchOrders(false)}
            disabled={refreshing}
            className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Orders" value={orders.length} />
          <StatCard title="Active Orders" value={activeCount} />
          <StatCard title="Ready to Serve" value={readyCount} />
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["all", "All Orders"],
            ["active", "Active"],
            ["ready", "Ready"],
            ["completed", "Completed"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleOrders.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              No orders found
            </h2>
            <p className="mt-2 text-gray-500">
              Orders assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {visibleOrders.map((order) => {
              const status = getOrderStatus(order).toLowerCase();
              const items = order.items || [];
              const table = order.table;

              return (
                <article
                  key={order._id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Order #{String(order._id).slice(-6).toUpperCase()}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt || Date.now()).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <div>
                      <p className="text-gray-500">Order Type</p>
                      <p className="font-semibold capitalize">
                        {order.orderType || "dine-in"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Table</p>
                      <p className="font-semibold">
                        {typeof table === "object"
                          ? table?.tableNumber || table?.name || "Not assigned"
                          : table || order.tableNumber || "Not assigned"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Customer</p>
                      <p className="font-semibold">
                        {order.customerName || "Walk-in customer"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Payment</p>
                      <p className="font-semibold capitalize">
                        {order.paymentStatus || "unpaid"}
                      </p>
                    </div>
                  </div>

                  <h3 className="mb-2 mt-5 font-semibold text-gray-800">
                    Order Items
                  </h3>

                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={item._id || index}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span className="text-gray-700">
                          {item.name ||
                            item.foodName ||
                            item.food?.name ||
                            "Food item"}{" "}
                          × {item.quantity || 1}
                        </span>

                        <span className="font-medium">
                          {formatMoney(
                            Number(item.price || 0) *
                              Number(item.quantity || 1)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <span className="font-semibold text-gray-700">
                      Total
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {status === "ready" && (
                      <button
                        onClick={() => updateStatus(order._id, "served")}
                        disabled={updatingId === order._id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {updatingId === order._id
                          ? "Updating..."
                          : "Mark as Served"}
                      </button>
                    )}

                    {status === "pending" && (
                      <button
                        onClick={() =>
                          updateStatus(order._id, "confirmed")
                        }
                        disabled={updatingId === order._id}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Accept Order
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
