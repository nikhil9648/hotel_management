import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

const API = "http://localhost:5000/api";
const TAX_RATE = 0.18;

const styles = {
  page: {
    padding: "24px",
    fontFamily: "DM Sans, sans-serif",
    background: "var(--canvas)",
    minHeight: "100vh",
    color: "var(--text)",
  },
  card: {
    background: "var(--surface)",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "22px",
    boxShadow: "var(--shadow)",
  },
  input: {
    padding: "11px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    padding: "11px 16px",
    border: "none",
    borderRadius: "10px",
    color: "var(--gold-button-text)",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const isCancelled = (order) =>
  ["cancelled", "canceled"].includes(
    String(order?.orderStatus || "").toLowerCase(),
  );

const normalizeWhatsAppPhone = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const hasInternationalPrefix = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && /^[6-9]/.test(digits)) digits = `91${digits}`;
  else if (digits.length === 12 && digits.startsWith("91")) {
    // Already in India country-code format.
  } else if (
    !hasInternationalPrefix &&
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    digits = `91${digits.slice(1)}`;
  }

  return digits.length >= 8 && digits.length <= 15 && /^[1-9]\d+$/.test(digits)
    ? digits
    : "";
};

const buildWhatsAppReceipt = (bill) => {
  const lines = [
    `Hello ${bill.customerName || "Customer"},`,
    "",
    "Thank you for visiting Hotel & Restaurant!",
    "",
    "Here is your payment receipt:",
  ];

  const tableName = bill.table?.tableNumber || bill.table?.name;
  if (tableName) lines.push(`Table: ${tableName}`);
  if (bill.billNumber) lines.push(`Bill/Receipt ID: ${bill.billNumber}`);

  const billDate = bill.paidAt || bill.updatedAt || bill.createdAt;
  if (billDate && !Number.isNaN(new Date(billDate).getTime())) {
    lines.push(`Bill Date: ${new Date(billDate).toLocaleString()}`);
  }

  const items = (bill.orders || []).flatMap((order) => order.items || []);
  if (items.length) {
    lines.push("Items:");
    items.forEach((item) => {
      const name = item.name || item.food?.name;
      const quantity = Number(item.quantity);
      const amount = Number(item.total ?? Number(item.price) * quantity);
      if (!name) return;
      const details =
        Number.isFinite(quantity) && quantity > 0
          ? `${quantity} × ${name}`
          : name;
      lines.push(
        Number.isFinite(amount)
          ? `- ${details}: ${money(amount)}`
          : `- ${details}`,
      );
    });
  }

  if (bill.subtotal != null) lines.push(`Subtotal: ${money(bill.subtotal)}`);
  if (bill.taxAmount != null) lines.push(`Tax: ${money(bill.taxAmount)}`);
  if (bill.discountAmount != null)
    lines.push(`Discount: ${money(bill.discountAmount)}`);
  if (bill.totalAmount != null)
    lines.push(`Total Amount: ${money(bill.totalAmount)}`);
  if (bill.paidAmount != null)
    lines.push(`Amount Paid: ${money(bill.paidAmount)}`);
  if (bill.paymentMethod && bill.paymentMethod !== "pending") {
    lines.push(`Payment Method: ${bill.paymentMethod}`);
  }
  lines.push(
    "Payment Status: PAID",
    "",
    "Thank you for your visit. We look forward to serving you again!",
  );

  return lines.join("\n");
};

export default function RestaurantBilling() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableAccount, setTableAccount] = useState(null);
  const [bill, setBill] = useState(null);

  const [loading, setLoading] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  const paymentLockRef = useRef(false);

  const token =
    localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

  const headers = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  // --------------------------------------------------
  // LOAD TABLES
  // --------------------------------------------------

  const loadTables = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await axios.get(`${API}/tables`, headers);

      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : data?.tables || data?.data?.tables || data?.data || [];

      setTables(list.filter((table) => table?.isActive !== false));
    } catch (error) {
      console.error("Load tables:", error.response?.data || error);

      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [headers]);

  // --------------------------------------------------
  // RESET COUPON
  // --------------------------------------------------

  const resetCoupon = useCallback(() => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponError("");
    setScanOpen(false);
  }, []);

  // --------------------------------------------------
  // LOAD SELECTED TABLE ACCOUNT
  // --------------------------------------------------

  const loadTableAccount = async (tableId) => {
    try {
      setLoading(true);
      setPageError("");
      setPageMessage("");
      setWhatsAppUrl("");

      setSelectedTable(tableId);
      setTableAccount(null);
      setBill(null);
      resetCoupon();

      const response = await axios.get(
        `${API}/restaurant-orders/table/${tableId}`,
        headers,
      );

      const data = response.data?.data || response.data;

      setTableAccount(data);

const activeBillResponse = await axios.get(
    `${API}/restaurant-bills/table/${tableId}/active`,
    headers
);

const pendingBill =
    activeBillResponse.data?.bill ||
    activeBillResponse.data?.data?.bill ||
    null;

if (
    pendingBill?._id &&
    pendingBill.paymentStatus !== "paid" &&
    pendingBill.status !== "paid"
) {
    setBill(pendingBill);
} else {
    setBill(null);
}


      // Support both response formats:
      // { orders: [...] } and { account: { orders: [...] } }
      const orders = data?.orders || data?.account?.orders || [];

      const customerOrder = orders.find(
        (order) =>
          order?.customerName?.trim() ||
          order?.customerMobile?.trim() ||
          order?.customerPhone?.trim(),
      );

      setCustomerName(customerOrder?.customerName || "");

      setCustomerPhone(
        customerOrder?.customerMobile || customerOrder?.customerPhone || "",
      );

      // Some table endpoints include the active bill.
      // Reuse it only if the backend explicitly returns it.
      const activeBill =
        data?.activeBill || data?.bill || data?.account?.bill || null;

      if (
        activeBill?._id &&
        activeBill?.paymentStatus !== "paid" &&
        activeBill?.status !== "paid"
      ) {
        setBill(activeBill);
      }
    } catch (error) {
      console.error("Load table account:", error.response?.data || error);

      setTableAccount(null);
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // COUPON QR / BARCODE SCANNER
  // --------------------------------------------------

  useEffect(() => {
    if (!scanOpen) return;

    const scanner = new Html5QrcodeScanner(
      "coupon-reader",
      {
        fps: 10,
        qrbox: { width: 240, height: 160 },
        rememberLastUsedCamera: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      },
      false,
    );

    let stopped = false;

    scanner.render(
      (decodedText) => {
        if (stopped) return;

        const code = decodedText.trim();

        if (code) {
          stopped = true;
          setCouponCode(code.toUpperCase());
          setAppliedCoupon(null);
          setDiscount(0);
          setCouponError("");
          setScanOpen(false);
        }
      },
      () => {
        // Normal while scanner is looking for a code.
      },
    );

    return () => {
      stopped = true;
      scanner.clear().catch(() => {});
    };
  }, [scanOpen]);

  // --------------------------------------------------
  // CURRENT UNBILLED ORDERS
  // --------------------------------------------------

  const allTableOrders =
    tableAccount?.orders || tableAccount?.account?.orders || [];

  const currentOrders = useMemo(() => {
    const unpaidOrders = allTableOrders.filter(
      (order) => order?.paymentStatus !== "paid" && !isCancelled(order),
    );

    // Include orders already attached to the current unpaid bill.
    const billOrders = Array.isArray(bill?.orders) ? bill.orders : [];

    const combined = [...unpaidOrders, ...billOrders];
    const uniqueOrders = new Map();

    combined.forEach((order) => {
      if (order?._id && order.paymentStatus !== "paid" && !isCancelled(order)) {
        uniqueOrders.set(String(order._id), order);
      }
    });

    return Array.from(uniqueOrders.values());
  }, [allTableOrders, bill]);

  const account =
    tableAccount?.account || (currentOrders.length > 0 ? {} : null);

  const subtotal = useMemo(
    () =>
      Number(
        currentOrders
          .reduce((sum, order) => sum + Number(order.subtotal || 0), 0)
          .toFixed(2),
      ),
    [currentOrders],
  );

  const taxAmount = Number((subtotal * TAX_RATE).toFixed(2));

  const currentDiscount = bill
    ? Number(bill.discountAmount || 0)
    : Number(discount || 0);

  const calculatedTotal = bill
    ? Number(bill.totalAmount || 0)
    : Math.max(0, Number((subtotal + taxAmount - currentDiscount).toFixed(2)));

  const selectedTableData = tables.find((table) => table._id === selectedTable);

  // --------------------------------------------------
  // APPLY COUPON
  // --------------------------------------------------

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();

    setCouponError("");
    setPageError("");

    if (!selectedTable) {
      setCouponError("Please select a table first.");
      return;
    }

    if (!currentOrders.length || subtotal <= 0) {
      setCouponError("No current unbilled orders found.");
      return;
    }

    if (!code) {
      setCouponError("Enter or scan a coupon code.");
      return;
    }

    if (bill?._id) {
      setCouponError(
        "A bill already exists. A new coupon cannot be applied to it.",
      );
      return;
    }

    try {
      setCouponLoading(true);

      const response = await axios.post(
        `${API}/coupons/validate`,
        {
          code,
          subtotal,
          tableId: selectedTable,
        },
        headers,
      );

      const data = response.data;

      if (!data?.success || !data?.coupon) {
        throw new Error(data?.message || "Coupon could not be applied.");
      }

      const amount = Number(data.discountAmount);

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Invalid discount returned by server.");
      }

      setAppliedCoupon(data.coupon);
      setCouponCode(data.coupon.code || code);
      setDiscount(Number(Math.min(amount, subtotal).toFixed(2)));

      setPageMessage("Coupon applied successfully.");
    } catch (error) {
      console.error("Apply coupon:", error.response?.data || error);

      setAppliedCoupon(null);
      setDiscount(0);
      setCouponError(getErrorMessage(error));
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    resetCoupon();
    setPageMessage("Coupon removed.");
    setPageError("");
  };

  // --------------------------------------------------
  // CREATE BILL
  // --------------------------------------------------

  const createBill = async () => {
    setPageError("");
    setPageMessage("");

    if (!selectedTable) {
      setPageError("Please select a table first.");
      return;
    }

    if (!currentOrders.length) {
      setPageError("No current unbilled orders found for this table.");
      return;
    }

    if (bill?._id) {
      setPageError(
        "A bill is already selected. Pay or reload it before generating another bill.",
      );
      return;
    }

    if (couponCode.trim() && !appliedCoupon) {
      setPageError(
        "Apply the coupon or remove its code before generating the bill.",
      );
      return;
    }

    try {
      setBillLoading(true);

      // The server independently finds unbilled orders for this table.
      const response = await axios.post(
        `${API}/restaurant-bills/table/${selectedTable}`,
        {
          couponCode: appliedCoupon?.code || null,
          discountAmount: appliedCoupon ? discount : 0,
          customerName: customerName.trim() || "Walk-in Customer",
          customerPhone: customerPhone.trim(),
        },
        headers,
      );

      const data = response.data?.data || response.data;

      if (!data?.success || !data?.bill?._id) {
        throw new Error(data?.message || "Bill creation failed.");
      }

      setBill(data.bill);

      setPageMessage(`Bill ${data.bill.billNumber} generated successfully.`);
    } catch (error) {
      console.error("Create bill:", error.response?.data || error);

      setPageError(getErrorMessage(error));
    } finally {
      setBillLoading(false);
    }
  };

  // --------------------------------------------------
  // PAY BILL
  // --------------------------------------------------

  const payBill = async () => {
    if (paymentLockRef.current) return;

    if (!bill?._id) {
      setPageError("Generate a bill first.");
      return;
    }

    if (bill.paymentStatus === "paid" || bill.status === "paid") {
      setPageError("This bill has already been paid.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm payment of ${money(bill.totalAmount)} by ${paymentMethod}?`,
    );

    if (!confirmed) return;

    paymentLockRef.current = true;
    setPaymentLoading(true);

    // Reserve a user-gesture-authorized tab before the payment request yields.
    let whatsappTab = null;
    try {
      whatsappTab = window.open("about:blank", "_blank");
    } catch {
      // Payment must still proceed when the browser blocks popups.
    }

    let data;
    try {
      setPageError("");
      setPageMessage("");
      setWhatsAppUrl("");

      const response = await axios.post(
        `${API}/restaurant-bills/${bill._id}/pay`,
        { paymentMethod },
        headers,
      );

      data = response.data?.data || response.data;
      if (!data?.success) {
        throw new Error(data?.message || "Payment failed.");
      }
    } catch (error) {
      try {
        whatsappTab?.close();
      } catch {
        /* Ignore popup cleanup errors. */
      }
      console.error("Pay bill:", error.response?.data || error);
      setPageError(getErrorMessage(error));
      paymentLockRef.current = false;
      setPaymentLoading(false);
      return;
    }

    // The payment is confirmed. WhatsApp opening is a separate best-effort
    // action and must never make a successful payment appear to have failed.
    const paidBill = data.bill || {
      ...bill,
      paymentStatus: "paid",
      status: "paid",
      paymentMethod,
    };
    setBill(paidBill);

    const receiptBill = data.bill;
    const recipient = normalizeWhatsAppPhone(receiptBill?.customerPhone);
    if (!receiptBill) {
      try {
        whatsappTab?.close();
      } catch {
        /* Ignore popup cleanup errors. */
      }
      setPageMessage(
        "Bill payment completed successfully, but the backend did not return receipt details to share.",
      );
    } else if (!recipient) {
      try {
        whatsappTab?.close();
      } catch {
        /* Ignore popup cleanup errors. */
      }
      setPageMessage(
        "Bill payment completed successfully. WhatsApp receipt was not opened because this bill has no valid customer phone number.",
      );
    } else {
      const url = `https://wa.me/${recipient}?text=${encodeURIComponent(buildWhatsAppReceipt(receiptBill))}`;
      let opened = false;
      try {
        if (whatsappTab && !whatsappTab.closed) {
          whatsappTab.location.href = url;
          opened = true;
        }
      } catch {
        // Fall through to the explicit link below after payment.
      }

      if (opened) {
        setPageMessage(
          "Bill payment completed successfully. Review the receipt in WhatsApp and press Send to share it.",
        );
      } else {
        try {
          whatsappTab?.close();
        } catch {
          /* Ignore popup cleanup errors. */
        }
        setWhatsAppUrl(url);
        setPageMessage(
          "Bill payment completed successfully. Your browser blocked the WhatsApp tab; use the link below to review the receipt.",
        );
      }
    }
await loadTables();

setBill(null);
setTableAccount(null);
setSelectedTable(null);
setCustomerName("");
setCustomerPhone("");
resetCoupon();
    // Refresh table availability and order state.
    await loadTables();
    paymentLockRef.current = false;
    setPaymentLoading(false);
  };

  // --------------------------------------------------
  // DOWNLOAD PDF
  // --------------------------------------------------

  const downloadPDF = async () => {
    if (!bill?._id) {
      setPageError("Generate a bill first.");
      return;
    }

    try {
      const response = await axios.get(
        `${API}/restaurant-bills/${bill._id}/pdf`,
        {
          ...headers,
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${bill.billNumber || "restaurant-bill"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download:", error);
      setPageError("Unable to download bill PDF.");
    }
  };

  // --------------------------------------------------
  // PRINT
  // --------------------------------------------------

  const printReceipt = () => {
    if (!bill?._id) {
      setPageError("Generate a bill first.");
      return;
    }

    window.print();
  };

  // --------------------------------------------------
  // START A NEW BILLING SESSION
  // --------------------------------------------------

  const startNewBilling = async () => {
    const tableId = selectedTable;

    setBill(null);
    resetCoupon();
    setPageError("");
    setPageMessage("");
    setWhatsAppUrl("");

    if (tableId) {
      await loadTableAccount(tableId);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div style={styles.page}>
      <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }

                    .receipt-print,
                    .receipt-print * {
                        visibility: visible !important;
                    }

                    .receipt-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        color: #000;
                        background: #fff;
                    }

                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

      <div className="no-print" style={styles.card}>
        <h1 style={{ margin: "0 0 8px" }}>Reception Billing</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Bill only current unbilled table orders.
        </p>
      </div>

      {pageError && (
        <div
          className="no-print"
          role="alert"
          style={{
            ...styles.card,
            color: "#b71c1c",
            background: "#ffebee",
          }}
        >
          {pageError}
        </div>
      )}

      {pageMessage && (
        <div
          className="no-print"
          role="status"
          style={{
            ...styles.card,
            color: "#1b5e20",
            background: "#e8f5e9",
          }}
        >
          {pageMessage}
          {whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                marginTop: "10px",
                color: "#075e54",
                fontWeight: "bold",
              }}
            >
              Open WhatsApp receipt
            </a>
          )}
        </div>
      )}

      {/* TABLES */}
      <section className="no-print" style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h2>Restaurant Tables</h2>

          <button
            type="button"
            onClick={loadTables}
            disabled={loading}
            style={{
              ...styles.button,
              background: "#455a64",
            }}
          >
            Refresh Tables
          </button>
        </div>

        {loading && <p>Loading...</p>}

        {!loading && tables.length === 0 && (
          <p>No active restaurant tables found.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: "14px",
          }}
        >
          {tables.map((table) => {
            const isSelected = selectedTable === table._id;

            const status = String(table.status || "unknown").toLowerCase();

            const isAvailable = status === "available";

            return (
              <button
                type="button"
                key={table._id}
                onClick={() => loadTableAccount(table._id)}
                style={{
                  padding: "18px",
                  border: isSelected ? "3px solid #1565c0" : "1px solid #ddd",
                  borderRadius: "10px",
                  background: isAvailable ? "#e8f5e9" : "#ffebee",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Table {table.tableNumber}</h3>
                <p>Capacity: {table.capacity}</p>
                <strong>{table.status}</strong>
              </button>
            );
          })}
        </div>
      </section>

      {/* SELECTED TABLE */}
      {selectedTable && (
        <section className="no-print" style={styles.card}>
          <h2>
            Current Table
            {selectedTableData
              ? ` — Table ${selectedTableData.tableNumber}`
              : ""}
          </h2>

          {loading && <p>Loading table account...</p>}

          {!loading && !account && (
            <p>No current unbilled orders were found for this table.</p>
          )}

          {!loading && account && (
            <>
              <h3>Current Unbilled Orders</h3>

              {currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <div
                    key={order._id}
                    style={{
                      padding: "15px",
                      background: "#f7f7f7",
                      borderRadius: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <strong>Order #{String(order._id).slice(-6)}</strong>

                    <p>Status: {order.orderStatus}</p>

                    {(order.items || []).map((item, index) => (
                      <div key={item._id || index}>
                        {item.name || item.food?.name || "Item"} ×{" "}
                        {item.quantity}
                        {" = "}
                        {money(
                          item.total ??
                            Number(item.price || 0) *
                              Number(item.quantity || 0),
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p>
                  No current unbilled orders. Old billed, paid and cancelled
                  orders are excluded.
                </p>
              )}

              {!bill && currentOrders.length > 0 && (
                <>
                  <hr style={{ margin: "24px 0" }} />

                  <h3>Customer Details</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "12px",
                      maxWidth: "650px",
                    }}
                  >
                    <label>
                      Customer name
                      <input
                        style={styles.input}
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(event.target.value)
                        }
                        placeholder="Walk-in Customer"
                      />
                    </label>

                    <label>
                      Customer mobile
                      <input
                        style={styles.input}
                        value={customerPhone}
                        onChange={(event) =>
                          setCustomerPhone(event.target.value)
                        }
                        placeholder="Mobile number"
                        inputMode="tel"
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      marginTop: "24px",
                      padding: "18px",
                      border: "1px solid #dce2ff",
                      borderRadius: "10px",
                      background: "#f8f9ff",
                      maxWidth: "650px",
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Apply Coupon</h3>

                    <input
                      style={styles.input}
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        setAppliedCoupon(null);
                        setDiscount(0);
                        setCouponError("");
                      }}
                      placeholder="Enter coupon code"
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setScanOpen((value) => !value)}
                        style={{
                          ...styles.button,
                          background: "#1565c0",
                        }}
                      >
                        {scanOpen ? "Close Scanner" : "Scan Coupon"}
                      </button>

                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading}
                        style={{
                          ...styles.button,
                          background: "#2e7d32",
                        }}
                      >
                        {couponLoading ? "Validating..." : "Apply Coupon"}
                      </button>

                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={removeCoupon}
                          style={{
                            ...styles.button,
                            background: "#c62828",
                          }}
                        >
                          Remove Coupon
                        </button>
                      )}
                    </div>

                    {scanOpen && (
                      <div style={{ marginTop: "15px" }}>
                        <p>
                          Allow camera access and scan the coupon QR/barcode.
                        </p>
                        <div id="coupon-reader" />
                      </div>
                    )}

                    {couponError && (
                      <p style={{ color: "#c62828" }}>{couponError}</p>
                    )}

                    {appliedCoupon && (
                      <p style={{ color: "#2e7d32" }}>
                        Coupon {appliedCoupon.code} applied.
                        {" Discount: "}
                        {money(discount)}
                      </p>
                    )}
                  </div>

                  <div style={{ maxWidth: "650px" }}>
                    <h3>Bill Summary</h3>
                    <p>Subtotal: {money(subtotal)}</p>
                    <p>GST (18%): {money(taxAmount)}</p>
                    <p>Discount: −{money(discount)}</p>
                    <h2>Total: {money(calculatedTotal)}</h2>

                    <button
                      type="button"
                      onClick={createBill}
                      disabled={billLoading}
                      style={{
                        ...styles.button,
                        background: "#1565c0",
                        marginTop: "10px",
                      }}
                    >
                      {billLoading ? "Generating..." : "Generate Bill"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* GENERATED BILL */}
      {bill && (
        <section style={styles.card}>
          <div className="receipt-print">
            <h2>Restaurant Receipt</h2>

            <p>
              <strong>Bill Number:</strong> {bill.billNumber}
            </p>

            <p>
              <strong>Table:</strong>{" "}
              {bill.table?.tableNumber ||
                selectedTableData?.tableNumber ||
                "N/A"}
            </p>

            <p>
              <strong>Customer:</strong>{" "}
              {bill.customerName || customerName || "Walk-in Customer"}
            </p>

            <p>
              <strong>Mobile:</strong>{" "}
              {bill.customerPhone || customerPhone || "—"}
            </p>

            <hr />

            <p>Subtotal: {money(bill.subtotal ?? subtotal)}</p>

            <p>GST: {money(bill.taxAmount ?? taxAmount)}</p>

            <p>Discount: −{money(bill.discountAmount || 0)}</p>

            {bill.couponCode && <p>Coupon: {bill.couponCode}</p>}

            <h2>Total: {money(bill.totalAmount)}</h2>

            <p>Payment Status: {bill.paymentStatus}</p>

            <p>Payment Method: {bill.paymentMethod || "pending"}</p>
          </div>

          <div
            className="no-print"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <button
              type="button"
              onClick={downloadPDF}
              style={{
                ...styles.button,
                background: "#6a1b9a",
              }}
            >
              Download PDF
            </button>

            <button
              type="button"
              onClick={printReceipt}
              style={{
                ...styles.button,
                background: "#455a64",
              }}
            >
              Print Receipt
            </button>

            {bill.paymentStatus !== "paid" && bill.status !== "paid" && (
              <>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  style={{
                    ...styles.input,
                    width: "auto",
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="razorpay">Razorpay</option>
                </select>

                <button
                  type="button"
                  onClick={payBill}
                  disabled={paymentLoading}
                  style={{
                    ...styles.button,
                    background: "#2e7d32",
                  }}
                >
                  {paymentLoading ? "Processing..." : "Pay Bill"}
                </button>
              </>
            )}

            {(bill.paymentStatus === "paid" || bill.status === "paid") && (
              <button
                type="button"
                onClick={startNewBilling}
                style={{
                  ...styles.button,
                  background: "#1565c0",
                }}
              >
                Refresh Table for New Orders
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

