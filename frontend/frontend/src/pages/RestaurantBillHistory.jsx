import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const ORDERS_API = `${API}/restaurant-bills`;

export default function RestaurantBillHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);

  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  // ==========================================
  // HELPERS
  // ==========================================

  const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

  const getOrderId = (order) => order?._id || order?.id || "";

  const getCustomerName = (order) =>
    order?.customerName || order?.customer?.name || "Walk-in Customer";

  const getCustomerPhone = (order) =>
    order?.customerMobile ||
    order?.customerPhone ||
    order?.customer?.phone ||
    "-";

  const getTableNumber = (order) =>
    order?.table?.tableNumber ?? order?.tableNumber ?? "-";

  const getOrderDate = (order) => order?.createdAt || order?.orderDate || null;

  const getSubtotal = (order) => {
    if (order?.subtotal != null) {
      return Number(order.subtotal) || 0;
    }

    return (order?.items || []).reduce(
      (sum, item) =>
        sum +
        Number(
          item.total ?? Number(item.price || 0) * Number(item.quantity || 0),
        ),
      0,
    );
  };

  const getTax = (order) => {
    if (order?.taxAmount != null) {
      return Number(order.taxAmount) || 0;
    }

    return 0;
  };

  const getDiscount = (order) =>
    Number(order?.discountAmount ?? order?.couponDiscount ?? 0) || 0;

  const getTotal = (order) => {
    if (order?.totalAmount != null) {
      return Number(order.totalAmount) || 0;
    }

    if (order?.total != null) {
      return Number(order.total) || 0;
    }

    return Math.max(0, getSubtotal(order) + getTax(order) - getDiscount(order));
  };

  const formatStatus = (value) => {
    if (!value) return "N/A";

    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const statusStyle = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "paid") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (["cancelled", "canceled", "failed"].includes(normalized)) {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (["served", "completed", "delivered"].includes(normalized)) {
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  };

  // ==========================================
  // LOAD ORDERS FROM RESTAURANTORDER COLLECTION
  // ==========================================

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await axios.get(ORDERS_API, {
        headers,
      });

      const data = response.data;

      const fetchedOrders = Array.isArray(data)
  ? data
  : data?.bills ||
    data?.orders ||
    data?.restaurantOrders ||
    data?.data?.bills ||
    data?.data?.orders ||
    data?.data ||
    [];

if (!Array.isArray(fetchedOrders)) {
  throw new Error("The restaurant bills API did not return a list.");
}

setOrders(fetchedOrders);

      if (!Array.isArray(fetchedOrders)) {
        throw new Error(
          "The restaurant orders API did not return an order list.",
        );
      }

      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Load Restaurant Orders Error:", error);

      setOrders([]);

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to load restaurant order history.",
      );
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ==========================================
  // FILTER ORDERS
  // ==========================================

  const filteredOrders = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return orders.filter((order) => {
      const searchableText = [
        getOrderId(order),
        order.orderNumber,
        order.billNumber,
        getCustomerName(order),
        getCustomerPhone(order),
        getTableNumber(order),
        order.paymentMethod,
        order.orderStatus,
        order.paymentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (searchText && !searchableText.includes(searchText)) {
        return false;
      }

      if (
        paymentStatus &&
        String(order.paymentStatus || "").toLowerCase() !== paymentStatus
      ) {
        return false;
      }

      if (
        orderStatus &&
        String(order.orderStatus || "").toLowerCase() !== orderStatus
      ) {
        return false;
      }

      const dateValue = getOrderDate(order);

      if (startDate) {
        if (!dateValue) return false;

        const date = new Date(dateValue);
        const start = new Date(`${startDate}T00:00:00`);

        if (date < start) return false;
      }

      if (endDate) {
        if (!dateValue) return false;

        const date = new Date(dateValue);
        const end = new Date(`${endDate}T23:59:59.999`);

        if (date > end) return false;
      }

      return true;
    });
  }, [orders, search, paymentStatus, orderStatus, startDate, endDate]);

  const resetFilters = () => {
    setSearch("");
    setPaymentStatus("");
    setOrderStatus("");
    setStartDate("");
    setEndDate("");
  };

  // ==========================================
  // VIEW ORDER / BILL DETAILS
  // ==========================================

  const viewOrder = (order) => {
    setSelectedOrder(order);
  };

  // ==========================================
  // PRINT ORDER RECEIPT
  // ==========================================

  const printOrder = (order) => {
    const printWindow = window.open("", "_blank", "width=800,height=900");

    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }

    const itemsHTML = (order.items || [])
      .map((item) => {
        const name = escapeHTML(item.name || "Item");
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const total = Number(item.total) || price * quantity;

        return `
                    <tr>
                        <td>${name}</td>
                        <td>${quantity}</td>
                        <td>${money(price)}</td>
                        <td>${money(total)}</td>
                    </tr>
                `;
      })
      .join("");

    const orderNumber =
      order.orderNumber || order.billNumber || getOrderId(order);

    const orderDate = getOrderDate(order);

    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <title>Restaurant Receipt - ${escapeHTML(orderNumber)}</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 25px;
                        color: #222;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 25px;
                    }

                    .header h1 {
                        margin-bottom: 8px;
                    }

                    .info p {
                        margin: 8px 0;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }

                    th, td {
                        border: 1px solid #ccc;
                        padding: 9px;
                        text-align: left;
                    }

                    th {
                        background: #f3f4f6;
                    }

                    .summary {
                        width: 300px;
                        margin: 25px 0 0 auto;
                    }

                    .summary div {
                        display: flex;
                        justify-content: space-between;
                        gap: 15px;
                        margin: 10px 0;
                    }

                    .grand-total {
                        border-top: 2px solid #222;
                        padding-top: 10px;
                        font-size: 19px;
                        font-weight: bold;
                    }

                    .footer {
                        text-align: center;
                        margin-top: 40px;
                    }

                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>

            <body>
                <div class="header">
                    <h1>Restaurant Receipt</h1>
                    <p>${escapeHTML(orderNumber)}</p>
                </div>

                <div class="info">
                    <p>
                        <strong>Customer:</strong>
                        ${escapeHTML(getCustomerName(order))}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(getCustomerPhone(order))}
                    </p>

                    <p>
                        <strong>Table:</strong>
                        ${escapeHTML(getTableNumber(order))}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${
                          orderDate
                            ? escapeHTML(new Date(orderDate).toLocaleString())
                            : "-"
                        }
                    </p>

                    <p>
                        <strong>Order Status:</strong>
                        ${escapeHTML(formatStatus(order.orderStatus))}
                    </p>

                    <p>
                        <strong>Payment Status:</strong>
                        ${escapeHTML(formatStatus(order.paymentStatus))}
                    </p>

                    <p>
                        <strong>Payment Method:</strong>
                        ${escapeHTML(order.paymentMethod || "Pending")}
                    </p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${
                          itemsHTML ||
                          '<tr><td colspan="4">No items found</td></tr>'
                        }
                    </tbody>
                </table>

                <div class="summary">
                    <div>
                        <span>Subtotal</span>
                        <span>${money(getSubtotal(order))}</span>
                    </div>

                    <div>
                        <span>GST</span>
                        <span>${money(getTax(order))}</span>
                    </div>

                    <div>
                        <span>Discount</span>
                        <span>${money(getDiscount(order))}</span>
                    </div>

                    <div class="grand-total">
                        <span>Total</span>
                        <span>${money(getTotal(order))}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for visiting!</p>
                </div>
            </body>
            </html>
        `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ==========================================
  // ESCAPE HTML BEFORE PRINTING
  // ==========================================

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }

  // ==========================================
  // SUMMARY
  // ==========================================

  const paidOrders = filteredOrders.filter(
    (order) => String(order.paymentStatus || "").toLowerCase() === "paid",
  );

  const paidCollection = paidOrders.reduce(
    (sum, order) => sum + getTotal(order),
    0,
  );

  // ==========================================
  // UI
  // ==========================================

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Restaurant Bill History</h1>

          <p style={{ color: "#64748b" }}>
            View restaurant orders, payment details, and print receipts.
          </p>
        </div>

        <button
          onClick={loadOrders}
          style={primaryButtonStyle}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* SUMMARY CARDS */}

      <div style={summaryGridStyle}>
        <SummaryCard title="Total Orders" value={filteredOrders.length} />

        <SummaryCard title="Paid Orders" value={paidOrders.length} />

        <SummaryCard title="Paid Collection" value={money(paidCollection)} />
      </div>

      {/* FILTERS */}

      <section style={filterCardStyle}>
        <h3 style={{ marginTop: 0 }}>Search & Filters</h3>

        <div style={filterGridStyle}>
          <input
            style={inputStyle}
            type="text"
            placeholder="Search customer, table, order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={inputStyle}
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>

          <select
            style={inputStyle}
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
          >
            <option value="">All Order Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            style={inputStyle}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            style={inputStyle}
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <button style={secondaryButtonStyle} onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </section>

      {/* ERROR */}

      {errorMessage && (
        <div style={errorStyle}>
          <strong>Unable to load history.</strong>
          <p>{errorMessage}</p>

          <p style={{ marginBottom: 0 }}>
            Check that the backend has a GET route for{" "}
            <code>/api/restaurant-bills</code>
          </p>

          <button onClick={loadOrders} style={primaryButtonStyle}>
            Try Again
          </button>
        </div>
      )}

      {/* DETAILS MODAL */}

      {selectedOrder && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={headerStyle}>
              <h2 style={{ margin: 0 }}>Order Details</h2>

              <button
                onClick={() => setSelectedOrder(null)}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <p>
              <strong>Order ID:</strong> {getOrderId(selectedOrder)}
            </p>

            <p>
              <strong>Customer:</strong> {getCustomerName(selectedOrder)}
            </p>

            <p>
              <strong>Phone:</strong> {getCustomerPhone(selectedOrder)}
            </p>

            <p>
              <strong>Table:</strong> {getTableNumber(selectedOrder)}
            </p>

            <p>
              <strong>Payment:</strong>{" "}
              {formatStatus(selectedOrder.paymentStatus)}
            </p>

            <p>
              <strong>Order Status:</strong>{" "}
              {formatStatus(selectedOrder.orderStatus)}
            </p>

            <h3>Items</h3>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedOrder.items || []).map((item, index) => (
                    <tr key={item._id || index}>
                      <td style={tdStyle}>{item.name || "Item"}</td>

                      <td style={tdStyle}>{item.quantity || 0}</td>

                      <td style={tdStyle}>{money(item.price)}</td>

                      <td style={tdStyle}>
                        {money(
                          item.total ??
                            Number(item.price || 0) *
                              Number(item.quantity || 0),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={detailTotalsStyle}>
              <p>
                Subtotal: <strong>{money(getSubtotal(selectedOrder))}</strong>
              </p>

              <p>
                GST: <strong>{money(getTax(selectedOrder))}</strong>
              </p>

              <p>
                Discount: <strong>{money(getDiscount(selectedOrder))}</strong>
              </p>

              <h3>Total: {money(getTotal(selectedOrder))}</h3>
            </div>

            <button
              style={primaryButtonStyle}
              onClick={() => printOrder(selectedOrder)}
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}

      {/* ORDERS TABLE */}

      <section style={tableCardStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>Order Records ({filteredOrders.length})</h3>
        </div>

        {loading ? (
          <p style={{ padding: "25px" }}>Loading restaurant orders...</p>
        ) : !errorMessage && filteredOrders.length === 0 ? (
          <div style={emptyStyle}>
            <h3>No orders found</h3>
            <p>
              Try changing the filters or check whether restaurant orders have
              been created.
            </p>
          </div>
        ) : (
          !errorMessage && (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Order ID</th>
                    <th style={thStyle}>Table</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Subtotal</th>
                    <th style={thStyle}>GST</th>
                    <th style={thStyle}>Discount</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Payment Method</th>
                    <th style={thStyle}>Payment Status</th>
                    <th style={thStyle}>Order Status</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={getOrderId(order)}>
                      <td style={tdStyle}>
                        {order.orderNumber ||
                          order.billNumber ||
                          String(getOrderId(order)).slice(-8)}
                      </td>

                      <td style={tdStyle}>{getTableNumber(order)}</td>

                      <td style={tdStyle}>
                        <div>
                          <strong>{getCustomerName(order)}</strong>

                          <div style={mutedTextStyle}>
                            {getCustomerPhone(order)}
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>{money(getSubtotal(order))}</td>

                      <td style={tdStyle}>{money(getTax(order))}</td>

                      <td style={tdStyle}>{money(getDiscount(order))}</td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: "bold",
                        }}
                      >
                        {money(getTotal(order))}
                      </td>

                      <td style={tdStyle}>
                        {formatStatus(order.paymentMethod || "pending")}
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            ...badgeStyle,
                            ...statusStyle(order.paymentStatus),
                          }}
                        >
                          {formatStatus(order.paymentStatus || "unpaid")}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            ...badgeStyle,
                            ...statusStyle(order.orderStatus),
                          }}
                        >
                          {formatStatus(order.orderStatus)}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {getOrderDate(order)
                          ? new Date(getOrderDate(order)).toLocaleString()
                          : "-"}
                      </td>

                      <td style={tdStyle}>
                        <div style={actionStyle}>
                          <button
                            style={smallPrimaryButtonStyle}
                            onClick={() => viewOrder(order)}
                          >
                            View
                          </button>

                          <button
                            style={smallGreenButtonStyle}
                            onClick={() => printOrder(order)}
                          >
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </div>
  );
}

// ==========================================
// REUSABLE SUMMARY CARD
// ==========================================

function SummaryCard({ title, value }) {
  return (
    <div style={summaryCardStyle}>
      <p style={{ color: "#64748b", margin: 0 }}>{title}</p>

      <h2 style={{ marginBottom: 0 }}>{value}</h2>
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================

const pageStyle = {
  padding: "24px",
  fontFamily: "Arial, sans-serif",
  color: "#1e293b",
  background: "#f8fafc",
  minHeight: "100vh",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginTop: "22px",
};

const summaryCardStyle = {
  padding: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  background: "#ffffff",
};

const filterCardStyle = {
  marginTop: "24px",
  padding: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  background: "#ffffff",
};

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const inputStyle = {
  boxSizing: "border-box",
  width: "100%",
  minWidth: 0,
  padding: "11px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  background: "#ffffff",
};

const primaryButtonStyle = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "10px 16px",
  background: "#475569",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const tableCardStyle = {
  marginTop: "24px",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  background: "#ffffff",
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "12px",
};

const thStyle = {
  padding: "12px",
  textAlign: "left",
  whiteSpace: "nowrap",
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
};

const tdStyle = {
  padding: "11px",
  border: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const badgeStyle = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "14px",
  fontSize: "12px",
  fontWeight: "bold",
};

const actionStyle = {
  display: "flex",
  gap: "6px",
};

const smallPrimaryButtonStyle = {
  padding: "7px 10px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const smallGreenButtonStyle = {
  padding: "7px 10px",
  background: "#15803d",
  color: "#ffffff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const mutedTextStyle = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "12px",
};

const emptyStyle = {
  padding: "35px",
  textAlign: "center",
};

const errorStyle = {
  marginTop: "20px",
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  background: "rgba(15, 23, 42, 0.6)",
};

const modalStyle = {
  width: "100%",
  maxWidth: "850px",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "24px",
  borderRadius: "12px",
  background: "#ffffff",
  boxSizing: "border-box",
};

const closeButtonStyle = {
  padding: "7px 11px",
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const detailTotalsStyle = {
  marginTop: "20px",
  textAlign: "right",
};
