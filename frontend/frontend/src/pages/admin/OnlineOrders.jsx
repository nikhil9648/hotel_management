
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    "";

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const normalizeStatus = (order) =>
  String(order?.status || order?.orderStatus || "pending")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");

const isDelivered = (order) =>
  normalizeStatus(order) === "delivered";

const isCancelled = (order) =>
  ["cancelled", "canceled"].includes(normalizeStatus(order));

const getOrderItems = (order) =>
  order?.items || order?.orderItems || [];

const getCustomerName = (order) =>
  order?.customer?.name ||
  order?.customerName ||
  order?.customer?.fullName ||
  "N/A";

const getCustomerPhone = (order) =>
  order?.customer?.phone ||
  order?.customerPhone ||
  order?.customerMobile ||
  order?.phone ||
  "N/A";

const getAddress = (order) => {
  const address = order?.deliveryAddress || order?.address;

  if (typeof address === "string") return address;

  if (address && typeof address === "object") {
    return [
      address.address,
      address.street,
      address.area,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(", ") || "N/A";
  }

  return "N/A";
};

const getAmount = (order) =>
  Number(
    order?.totalAmount ??
      order?.grandTotal ??
      order?.total ??
      0
  );

const getPartnerId = (order) => {
  const partner = order?.deliveryBoy || order?.deliveryPartner;

  if (partner && typeof partner === "object") {
    return partner._id || partner.id || "";
  }

  return partner || "";
};

const getPartnerDetails = (order, deliveryBoys) => {
  const partner = order?.deliveryBoy || order?.deliveryPartner;

  if (partner && typeof partner === "object") {
    return partner;
  }

  const partnerId = getPartnerId(order);

  return (
    deliveryBoys.find(
      (boy) => String(boy._id) === String(partnerId)
    ) || null
  );
};

const getOrderDate = (order) =>
  order?.deliveredAt ||
  order?.deliveryCompletedAt ||
  order?.updatedAt ||
  order?.createdAt ||
  null;

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleString("en-IN");
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
  statLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "14px",
  },
  statValue: {
    display: "block",
    fontSize: "28px",
    marginTop: "10px",
  },
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
  orderLabel: {
    fontSize: "11px",
    color: "#64748b",
    letterSpacing: "1px",
  },
  orderNumber: { margin: "5px 0 0", fontSize: "18px" },
  status: {
    color: "#fff",
    borderRadius: "20px",
    padding: "6px 10px",
    fontSize: "12px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  divider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "16px 0",
  },
  section: { marginBottom: "18px" },
  sectionTitle: {
    fontSize: "14px",
    margin: "0 0 10px",
    fontWeight: 700,
  },
  detail: {
    fontSize: "13px",
    lineHeight: 1.6,
    margin: "5px 0",
    overflowWrap: "anywhere",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },
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
  warning: {
    color: "#b45309",
    fontSize: "12px",
    marginTop: "8px",
  },
  muted: {
    color: "#64748b",
    fontSize: "12px",
    margin: "5px 0 0",
  },
  dateText: {
    color: "#94a3b8",
    fontSize: "11px",
    marginTop: "18px",
  },
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
  deliveredSection: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    marginTop: "32px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.04)",
  },
  deliveredHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },
  deliveredCount: {
    background: "#dcfce7",
    color: "#166534",
    padding: "8px 12px",
    borderRadius: "20px",
    fontSize: "13px",
  },
  emptyDelivered: {
    padding: "24px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "8px",
  },
  tableWrapper: { width: "100%", overflowX: "auto" },
  deliveredTable: {
    width: "100%",
    minWidth: "1050px",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "12px",
    fontSize: "13px",
    borderBottom: "1px solid #cbd5e1",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px",
    fontSize: "13px",
    color: "#334155",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "top",
  },
  deliveredBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 9px",
    borderRadius: "14px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedBoys, setSelectedBoys] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAllDelivered, setShowAllDelivered] = useState(false);

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

    return colors[String(status || "").toLowerCase()] || "#64748b";
  };

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
        : data?.orders || data?.data?.orders || data?.data || [];

      const deliveryOrders = allOrders.filter(
        (order) =>
          String(order.orderType || "").toLowerCase() === "delivery"
      );

      const activeOrders = deliveryOrders.filter(
        (order) =>
          !isDelivered(order) &&
          !isCancelled(order) &&
          order.billGenerated !== true
      );

      const completedOrders = deliveryOrders
        .filter(isDelivered)
        .sort((a, b) => {
          const dateA = new Date(getOrderDate(a) || 0).getTime();
          const dateB = new Date(getOrderDate(b) || 0).getTime();
          return dateB - dateA;
        });

      setOrders(activeOrders);
      setDeliveredOrders(completedOrders);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setError(
        err.response?.data?.message || "Unable to load online orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeliveryBoys = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/delivery-boys`,
        getHeaders()
      );

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data?.deliveryBoys || data?.data?.deliveryBoys || data?.data || [];

      setDeliveryBoys(list);
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

  const handleBoyChange = (orderId, deliveryBoyId) => {
    setSelectedBoys((previous) => ({
      ...previous,
      [orderId]: deliveryBoyId,
    }));
  };

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
        `Delivery partner assigned successfully to order ${
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

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
        <p>Loading online orders...</p>
      </div>
    );
  }

  const awaitingAssignment = orders.filter(
    (order) => !getPartnerId(order)
  ).length;

  const visibleDeliveredOrders = showAllDelivered
    ? deliveredOrders
    : deliveredOrders.slice(0, 10);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Online Delivery Orders</h1>
          <p style={styles.subtitle}>
            Active deliveries and completed delivery history.
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
          <strong style={styles.statValue}>{deliveryBoys.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Awaiting Assignment</span>
          <strong style={styles.statValue}>{awaitingAssignment}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Delivered Orders</span>
          <strong style={styles.statValue}>{deliveredOrders.length}</strong>
        </div>
      </div>

      {error && (
        <div role="alert" style={styles.error}>
          <span>{error}</span>
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
          <span>{success}</span>
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

      <section>
        <h2 style={{ marginBottom: "16px" }}>Current Delivery Orders</h2>

        {orders.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🛵</div>
            <h2>No Active Online Orders</h2>
            <p>New, non-delivered customer orders will appear here.</p>
          </div>
        ) : (
          <div style={styles.orderGrid}>
            {orders.map((order) => {
              const assignedBoy = getPartnerDetails(order, deliveryBoys);
              const items = getOrderItems(order);
              const status = normalizeStatus(order);

              return (
                <article key={order._id} style={styles.orderCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.orderLabel}>ORDER</span>
                      <h3 style={styles.orderNumber}>
                        #{order.orderNumber || order._id?.slice(-6)}
                      </h3>
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        backgroundColor: getStatusColor(status),
                      }}
                    >
                      {status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div style={styles.divider} />

                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Customer Details</h4>

                    <p style={styles.detail}>
                      <strong>Name:</strong> {getCustomerName(order)}
                    </p>

                    <p style={styles.detail}>
                      <strong>Phone:</strong> {getCustomerPhone(order)}
                    </p>

                    <p style={styles.detail}>
                      <strong>Address:</strong> {getAddress(order)}
                    </p>
                  </div>

                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Order Items</h4>

                    {items.length === 0 ? (
                      <p style={styles.muted}>No items available.</p>
                    ) : (
                      <div style={styles.itemsList}>
                        {items.map((item, index) => {
                          const quantity = Number(item.quantity || 1);
                          const price = Number(
                            item.price ?? item.food?.price ?? 0
                          );

                          return (
                            <div
                              key={item._id || index}
                              style={styles.itemRow}
                            >
                              <span>
                                {item.food?.name ||
                                  item.name ||
                                  item.foodName ||
                                  "Food item"}{" "}
                                × {quantity}
                              </span>

                              <span>
                                {formatCurrency(price * quantity)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={styles.totalRow}>
                    <span>Total Amount</span>
                    <strong style={styles.totalAmount}>
                      {formatCurrency(getAmount(order))}
                    </strong>
                  </div>

                  <div style={styles.assignmentBox}>
                    <h4 style={styles.sectionTitle}>Delivery Assignment</h4>

                    {assignedBoy ? (
                      <div style={styles.assignedBox}>
                        <span style={styles.assignedIcon}>✓</span>
                        <div>
                          <strong>{assignedBoy.name || "Delivery partner assigned"}</strong>
                          <p style={styles.muted}>
                            {assignedBoy.phone || assignedBoy.email || ""}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p style={styles.unassigned}>
                        No delivery partner assigned yet.
                      </p>
                    )}

                    <div style={styles.assignControls}>
                      <select
                        value={
                          selectedBoys[order._id] ||
                          getPartnerId(order) ||
                          ""
                        }
                        onChange={(event) =>
                          handleBoyChange(order._id, event.target.value)
                        }
                        style={styles.select}
                        disabled={assigningId === order._id}
                      >
                        <option value="">Select delivery partner</option>

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
                          opacity: assigningId === order._id ? 0.6 : 1,
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
                        No active delivery partners found.
                      </p>
                    )}
                  </div>

                  <p style={styles.dateText}>
                    Created: {formatDate(order.createdAt)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.deliveredSection}>
        <div style={styles.deliveredHeader}>
          <div>
            <h2 style={{ margin: 0 }}>Delivered Orders</h2>
            <p style={styles.subtitle}>
              Completed orders with their delivery partner details.
            </p>
          </div>

          <strong style={styles.deliveredCount}>
            {deliveredOrders.length} Delivered
          </strong>
        </div>

        {deliveredOrders.length === 0 ? (
          <div style={styles.emptyDelivered}>
            No delivered orders found.
          </div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.deliveredTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Order ID</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Address</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Delivery Partner</th>
                    <th style={styles.th}>Partner Phone</th>
                    <th style={styles.th}>Delivered At</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleDeliveredOrders.map((order) => {
                    const partner = getPartnerDetails(order, deliveryBoys);

                    return (
                      <tr key={order._id}>
                        <td style={styles.td}>
                          #{order.orderNumber || order._id?.slice(-6)}
                        </td>

                        <td style={styles.td}>{getCustomerName(order)}</td>

                        <td style={styles.td}>{getCustomerPhone(order)}</td>

                        <td style={styles.td}>{getAddress(order)}</td>

                        <td style={styles.td}>
                          {formatCurrency(getAmount(order))}
                        </td>

                        <td style={styles.td}>
                          {partner?.name || "Partner details unavailable"}
                        </td>

                        <td style={styles.td}>
                          {partner?.phone || "N/A"}
                        </td>

                        <td style={styles.td}>
                          {formatDate(getOrderDate(order))}
                        </td>

                        <td style={styles.td}>
                          <span style={styles.deliveredBadge}>Delivered</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {deliveredOrders.length > 10 && (
              <button
                type="button"
                style={{ ...styles.refreshButton, marginTop: "16px" }}
                onClick={() => setShowAllDelivered((value) => !value)}
              >
                {showAllDelivered
                  ? "Show Latest 10"
                  : `Show All ${deliveredOrders.length} Orders`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default OnlineOrders;
