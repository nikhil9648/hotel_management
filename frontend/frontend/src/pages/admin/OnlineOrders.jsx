import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedBoys, setSelectedBoys] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch all online delivery orders
  const fetchOrders = useCallback(async () => {
    try {
      setError("");

      const response = await axios.get(
        `${API_URL}/restaurant-orders/all`,
        getHeaders()
      );

      const data = response.data;
      const allOrders = Array.isArray(data)
        ? data
        : data.orders || data.data || [];

      const onlineOrders = allOrders.filter(
        (order) =>
          order.orderType?.toLowerCase() === "delivery" &&
          !["cancelled", "delivered"].includes(
            order.status?.toLowerCase()
          ) &&
          order.billGenerated !== true
      );

      setOrders(onlineOrders);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setError(
        err.response?.data?.message || "Unable to load online orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch active delivery boys
  const fetchDeliveryBoys = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/delivery-boys`,
        getHeaders()
      );

      const data = response.data;

      setDeliveryBoys(
        Array.isArray(data)
          ? data
          : data.deliveryBoys || data.data || []
      );
    } catch (err) {
      console.error("Fetch delivery boys error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load delivery boys. Check the API route."
      );
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrders, fetchDeliveryBoys]);

  // Select delivery boy for an order
  const handleBoyChange = (orderId, deliveryBoyId) => {
    setSelectedBoys((previous) => ({
      ...previous,
      [orderId]: deliveryBoyId,
    }));
  };

  // Assign delivery boy
  const handleAssign = async (order) => {
    const deliveryBoyId = selectedBoys[order._id];

    if (!deliveryBoyId) {
      setError("Please select a delivery boy first.");
      setSuccess("");
      return;
    }

    try {
      setAssigningId(order._id);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_URL}/restaurant-orders/${order._id}/assign-delivery`,
        { deliveryBoyId },
        getHeaders()
      );

      setSuccess(
        `Delivery boy assigned successfully to order ${
          order.orderNumber || order._id
        }.`
      );

      await fetchOrders();
    } catch (err) {
      console.error("Assign delivery boy error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to assign delivery boy."
      );
    } finally {
      setAssigningId(null);
    }
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b",
      confirmed: "#2563eb",
      preparing: "#9333ea",
      ready: "#0891b2",
      out_for_delivery: "#ea580c",
    };

    return colors[status?.toLowerCase()] || "#64748b";
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
        <p>Loading online orders...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Online Delivery Orders</h1>
          <p style={styles.subtitle}>
            Manage customer orders and assign delivery partners.
          </p>
        </div>

        <button
          type="button"
          style={styles.refreshButton}
          onClick={() => {
            fetchOrders();
            fetchDeliveryBoys();
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Active Orders</span>
          <strong style={styles.statValue}>{orders.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Available Delivery Boys</span>
          <strong style={styles.statValue}>
            {deliveryBoys.length}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Awaiting Assignment</span>
          <strong style={styles.statValue}>
            {
              orders.filter(
                (order) =>
                  !order.deliveryBoy?._id &&
                  !order.deliveryBoy
              ).length
            }
          </strong>
        </div>
      </div>

      {error && (
        <div role="alert" style={styles.error}>
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            style={styles.closeButton}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div role="status" style={styles.success}>
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
            style={styles.closeButton}
            aria-label="Dismiss success"
          >
            ×
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🛵</div>
          <h2>No Active Online Orders</h2>
          <p>New customer delivery orders will appear here.</p>
        </div>
      ) : (
        <div style={styles.orderGrid}>
          {orders.map((order) => {
            const assignedBoy =
              typeof order.deliveryBoy === "object"
                ? order.deliveryBoy
                : null;

            const items = order.items || order.orderItems || [];

            return (
              <article key={order._id} style={styles.orderCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.orderLabel}>ORDER</span>
                    <h3 style={styles.orderNumber}>
                      #{order.orderNumber || order._id.slice(-6)}
                    </h3>
                  </div>

                  <span
                    style={{
                      ...styles.status,
                      backgroundColor: getStatusColor(order.status),
                    }}
                  >
                    {(order.status || "pending").replaceAll("_", " ")}
                  </span>
                </div>

                <div style={styles.divider} />

                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>
                    Customer Details
                  </h4>

                  <p style={styles.detail}>
                    <strong>Name:</strong>{" "}
                    {order.customer?.name ||
                      order.customerName ||
                      order.customer?.fullName ||
                      "N/A"}
                  </p>

                  <p style={styles.detail}>
                    <strong>Phone:</strong>{" "}
                    {order.customer?.phone ||
                      order.customerPhone ||
                      order.phone ||
                      "N/A"}
                  </p>

                  <p style={styles.detail}>
                    <strong>Address:</strong>{" "}
                    {order.deliveryAddress?.address ||
                      order.deliveryAddress ||
                      order.address?.address ||
                      order.address ||
                      "N/A"}
                  </p>
                </div>

                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Order Items</h4>

                  {items.length === 0 ? (
                    <p style={styles.muted}>No items available.</p>
                  ) : (
                    <div style={styles.itemsList}>
                      {items.map((item, index) => (
                        <div
                          key={item._id || index}
                          style={styles.itemRow}
                        >
                          <span>
                            {item.food?.name ||
                              item.name ||
                              item.foodName ||
                              "Food item"}{" "}
                            × {item.quantity || 1}
                          </span>

                          <span>
                            {formatCurrency(
                              (item.price || item.food?.price || 0) *
                                (item.quantity || 1)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.totalRow}>
                  <span>Total Amount</span>
                  <strong style={styles.totalAmount}>
                    {formatCurrency(
                      order.totalAmount ??
                        order.grandTotal ??
                        order.total ??
                        0
                    )}
                  </strong>
                </div>

                <div style={styles.assignmentBox}>
                  <h4 style={styles.sectionTitle}>
                    Delivery Assignment
                  </h4>

                  {assignedBoy ? (
                    <div style={styles.assignedBox}>
                      <span style={styles.assignedIcon}>✓</span>
                      <div>
                        <strong>
                          {assignedBoy.name || "Delivery boy assigned"}
                        </strong>
                        <p style={styles.muted}>
                          {assignedBoy.phone ||
                            assignedBoy.email ||
                            ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={styles.unassigned}>
                      No delivery boy assigned yet.
                    </p>
                  )}

                  <div style={styles.assignControls}>
                    <select
                      value={selectedBoys[order._id] || ""}
                      onChange={(event) =>
                        handleBoyChange(order._id, event.target.value)
                      }
                      style={styles.select}
                      disabled={assigningId === order._id}
                    >
                      <option value="">Select delivery boy</option>

                      {deliveryBoys.map((boy) => (
                        <option key={boy._id} value={boy._id}>
                          {boy.name}
                          {boy.phone ? ` — ${boy.phone}` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      style={{
                        ...styles.assignButton,
                        opacity:
                          assigningId === order._id ? 0.6 : 1,
                      }}
                      disabled={
                        assigningId === order._id ||
                        !selectedBoys[order._id] ||
                        deliveryBoys.length === 0
                      }
                      onClick={() => handleAssign(order)}
                    >
                      {assigningId === order._id
                        ? "Assigning..."
                        : assignedBoy
                        ? "Reassign"
                        : "Assign"}
                    </button>
                  </div>

                  {deliveryBoys.length === 0 && (
                    <p style={styles.warning}>
                      No active delivery boys found.
                    </p>
                  )}
                </div>

                <p style={styles.dateText}>
                  Created:{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("en-IN")
                    : "N/A"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    padding: "24px",
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
  },
  heading: { margin: 0, fontSize: "28px", fontWeight: 700 },
  subtitle: { color: "#64748b", margin: "8px 0 0" },
  refreshButton: {
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  statLabel: { display: "block", color: "#64748b", fontSize: "14px" },
  statValue: { display: "block", fontSize: "28px", marginTop: "10px" },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  closeButton: {
    background: "transparent",
    border: 0,
    fontSize: "20px",
    cursor: "pointer",
  },
  orderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    alignItems: "start",
  },
  orderCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.04)",
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  orderLabel: { fontSize: "11px", color: "#64748b", letterSpacing: "1px" },
  orderNumber: { margin: "5px 0 0", fontSize: "18px" },
  status: {
    color: "#fff",
    borderRadius: "20px",
    padding: "6px 10px",
    fontSize: "12px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  divider: { height: "1px", background: "#e2e8f0", margin: "16px 0" },
  section: { marginBottom: "18px" },
  sectionTitle: { fontSize: "14px", margin: "0 0 10px", fontWeight: 700 },
  detail: {
    fontSize: "13px",
    lineHeight: 1.6,
    margin: "5px 0",
    overflowWrap: "anywhere",
  },
  itemsList: { display: "flex", flexDirection: "column", gap: "9px" },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "13px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    gap: "10px",
  },
  totalAmount: { fontSize: "18px", color: "#0f766e" },
  assignmentBox: { marginTop: "18px" },
  assignedBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
    overflowWrap: "anywhere",
  },
  assignedIcon: {
    background: "#059669",
    color: "#fff",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  unassigned: { color: "#b45309", fontSize: "13px" },
  assignControls: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
    flexWrap: "wrap",
  },
  select: {
    flex: "1 1 160px",
    minWidth: 0,
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#fff",
  },
  assignButton: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
  warning: { color: "#b45309", fontSize: "12px", marginTop: "8px" },
  muted: { color: "#64748b", fontSize: "12px", margin: "5px 0 0" },
  dateText: { color: "#94a3b8", fontSize: "11px", marginTop: "18px" },
  empty: {
    background: "#fff",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "50px 20px",
    textAlign: "center",
    color: "#64748b",
  },
  emptyIcon: { fontSize: "42px" },
  center: {
    minHeight: "60vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  loader: {
    width: "30px",
    height: "30px",
    border: "3px solid #cbd5e1",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export default OnlineOrders;

