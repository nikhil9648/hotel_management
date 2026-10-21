import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  "";

const getOrderStatus = (order) =>
  order.orderStatus || order.status || "pending";

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusClass = (status) => {
  const value = String(status).toLowerCase();

  if (value === "ready") {
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

// Order mode
const orderTypeLabel = (orderType) => {
  if (orderType === "delivery") return "ONLINE";
  if (orderType === "takeaway") return "TAKEAWAY";
  return "DINE-IN";
};

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [filter, setFilter] = useState("active");

  const fetchOrders = useCallback(async (initial = false) => {
    const token = getToken();

    if (!token) {
      setError("Please log in to access the kitchen dashboard.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await axios.get(
        `${API}/restaurant-orders/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : data.orders || data.data || [];

      // Hide billed orders from the kitchen UI as well.
      // Backend should also filter billGenerated orders.
      const kitchenOrders = list.filter(
        (order) => order.billGenerated !== true
      );

      kitchenOrders.sort(
        (a, b) =>
          new Date(a.createdAt || 0) -
          new Date(b.createdAt || 0)
      );

      setOrders(kitchenOrders);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load kitchen orders. Check backend permissions."
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

    if (!token) {
      setError("Please log in again.");
      return;
    }

    try {
      setUpdatingId(orderId);

      await axios.patch(
        `${API}/restaurant-orders/${orderId}/status`,
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
          "Could not update order status. Check the backend route and allowed statuses."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const visibleOrders = orders.filter((order) => {
    const status = getOrderStatus(order).toLowerCase();

    if (filter === "active") {
      return ["pending", "confirmed", "preparing"].includes(status);
    }

    if (filter === "ready") {
      return status === "ready";
    }

    if (filter === "completed") {
      return ["served", "completed"].includes(status);
    }

    if (filter === "delivery") {
      return order.orderType === "delivery";
    }

    return true;
  });

  const activeCount = orders.filter((order) =>
    ["pending", "confirmed", "preparing"].includes(
      getOrderStatus(order).toLowerCase()
    )
  ).length;

  const readyCount = orders.filter(
    (order) => getOrderStatus(order).toLowerCase() === "ready"
  ).length;

  const deliveryCount = orders.filter(
    (order) => order.orderType === "delivery"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center">
        Loading kitchen dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Kitchen Dashboard
            </h1>

            <p className="mt-1 text-gray-500">
              Manage preparation and ready-to-serve orders.
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

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Active Orders" value={activeCount} />
          <StatCard title="Ready Orders" value={readyCount} />
          <StatCard title="Online Deliveries" value={deliveryCount} />
        </section>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["active", "Active"],
            ["ready", "Ready"],
            ["delivery", "Online Delivery"],
            ["all", "All Orders"],
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

        {/* Orders */}
        {visibleOrders.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              No orders found
            </h2>

            <p className="mt-2 text-gray-500">
              New restaurant and online delivery orders will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {visibleOrders.map((order) => {
              const status = getOrderStatus(order).toLowerCase();
              const items = order.items || [];
              const table = order.table;
              const isDelivery = order.orderType === "delivery";

              return (
                <article
                  key={order._id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                >
                  {/* Order heading */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Order #
                        {order.orderNumber ||
                          String(order._id).slice(-6).toUpperCase()}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(
                          order.createdAt || Date.now()
                        ).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}
                    >
                      {status.replaceAll("_", " ")}
                    </span>
                  </div>

                  {/* Mode only: no payment status */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-md px-3 py-1 text-sm font-semibold ${
                        isDelivery
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      Mode: {orderTypeLabel(order.orderType)}
                    </span>
                  </div>

                  {/* Online delivery details */}
                  {isDelivery && (
                    <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 p-4">
                      <h3 className="mb-2 font-semibold text-purple-900">
                        Delivery Details
                      </h3>

                      <p className="text-sm text-gray-700">
                        <strong>Customer:</strong>{" "}
                        {order.customerName || "Not available"}
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        <strong>Mobile:</strong>{" "}
                        {order.customerMobile || "Not available"}
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        <strong>Address:</strong>{" "}
                        {typeof order.deliveryAddress === "string"
                          ? order.deliveryAddress || "Address not available"
                          : order.deliveryAddress?.address ||
                            order.deliveryAddress?.formattedAddress ||
                            "Address not available"}
                      </p>
                    </div>
                  )}

                  {/* Dine-in / takeaway details */}
                  {!isDelivery && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
                      <span className="text-gray-500">Table: </span>

                      <strong>
                        {typeof table === "object"
                          ? table?.tableNumber ||
                            table?.name ||
                            "Not assigned"
                          : table || order.tableNumber || "Not assigned"}
                      </strong>
                    </div>
                  )}

                  {/* Items */}
                  <h3 className="mb-3 mt-5 font-semibold text-gray-800">
                    Items to Prepare
                  </h3>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item._id || index}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name ||
                              item.foodName ||
                              item.food?.name ||
                              "Food item"}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            Quantity: {item.quantity || 1}
                          </p>

                          {item.specialInstructions && (
                            <p className="mt-1 text-sm text-orange-700">
                              Note: {item.specialInstructions}
                            </p>
                          )}

                          {item.notes && (
                            <p className="mt-1 text-sm text-orange-700">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>

                        <span className="text-sm font-semibold text-gray-700">
                          {formatMoney(
                            Number(item.price || 0) *
                              Number(item.quantity || 1)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order total */}
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <span className="font-semibold text-gray-700">
                      Order Total
                    </span>

                    <span className="text-lg font-bold text-gray-900">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>

                  {/* Kitchen actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["pending", "confirmed"].includes(status) && (
                      <button
                        onClick={() =>
                          updateStatus(order._id, "preparing")
                        }
                        disabled={updatingId === order._id}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {updatingId === order._id
                          ? "Updating..."
                          : "Start Preparing"}
                      </button>
                    )}

                    {status === "preparing" && (
                      <button
                        onClick={() => updateStatus(order._id, "ready")}
                        disabled={updatingId === order._id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {updatingId === order._id
                          ? "Updating..."
                          : "Mark Ready"}
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

