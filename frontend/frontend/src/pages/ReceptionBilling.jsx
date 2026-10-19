
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
    Html5QrcodeScanner,
    Html5QrcodeSupportedFormats,
} from "html5-qrcode";

const API = "http://localhost:5000/api";

const initialCouponState = {
    code: "",
    coupon: null,
    discountAmount: 0,
    error: "",
};

const styles = {
    page: {
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#f5f6fa",
        minHeight: "100vh",
        color: "#222",
    },
    card: {
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        marginBottom: "22px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    },
    input: {
        padding: "11px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        width: "100%",
        boxSizing: "border-box",
    },
    button: {
        padding: "11px 16px",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "bold",
    },
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

    const token = localStorage.getItem("token");

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    // --------------------------------------------------
    // LOAD TABLES
    // --------------------------------------------------

    const loadTables = useCallback(async () => {
        try {
            setLoading(true);
            setPageError("");

            const response = await axios.get(
                `${API}/tables`,
                { headers }
            );

            const data = response.data;

            const list = Array.isArray(data)
                ? data
                : data.tables || data.data || [];

            // Hide inactive tables.
            setTables(
                list.filter((table) => table.isActive !== false)
            );
        } catch (error) {
            console.error("Load tables:", error.response?.data || error);

            setPageError(
                error.response?.data?.message ||
                "Unable to load restaurant tables."
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    // --------------------------------------------------
    // LOAD SELECTED TABLE ACCOUNT
    // --------------------------------------------------

    const resetCoupon = () => {
        setCouponCode("");
        setAppliedCoupon(null);
        setDiscount(0);
        setCouponError("");
        setScanOpen(false);
    };

    const loadTableAccount = async (tableId) => {
        try {
            setLoading(true);
            setPageError("");

            setSelectedTable(tableId);
            setTableAccount(null);
            setBill(null);
            resetCoupon();

            const response = await axios.get(
                `${API}/restaurant-orders/table/${tableId}`,
                { headers }
            );

            const data = response.data;

            setTableAccount(data);

            const orders = data.orders || [];

            const customerOrder = orders.find(
                (order) =>
                    order.customerName?.trim() ||
                    order.customerPhone?.trim()
            );

            setCustomerName(customerOrder?.customerName || "");
            setCustomerPhone(
                customerOrder?.customerMobile ||
                ""
            );
        } catch (error) {
            console.error(
                "Load table account:",
                error.response?.data || error
            );

            setTableAccount(null);

            setPageError(
                error.response?.data?.message ||
                "Unable to load this table's account."
            );
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------
    // QR / BARCODE COUPON SCANNER
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
            false
        );

        let stopped = false;

        scanner.render(
            (decodedText) => {
                if (stopped) return;

                const scannedCode = decodedText.trim();

                if (scannedCode) {
                    setCouponCode(scannedCode.toUpperCase());
                    setAppliedCoupon(null);
                    setDiscount(0);
                    setCouponError("");
                    setScanOpen(false);
                }
            },
            () => {
                // Scanning failures are normal while looking for a code.
            }
        );

        return () => {
            stopped = true;
            scanner.clear().catch(() => { });
        };
    }, [scanOpen]);

    // --------------------------------------------------
    // APPLY COUPON
    // Requires POST /api/coupons/validate on backend.
    // --------------------------------------------------

    const applyCoupon = async () => {
        const code = couponCode.trim();

        if (!code) {
            setCouponError("Scan or enter a coupon code first.");
            return;
        }

        if (!account) {
            setCouponError("Select a table with an active order.");
            return;
        }

        if (bill?._id) {
            setCouponError(
                "A bill has already been generated. Start a new bill to change its coupon."
            );
            return;
        }

        try {
            setCouponLoading(true);
            setCouponError("");

            const response = await axios.post(
                `${API}/coupons/validate`,
                {
                    code,
                    subtotal: subtotal,
                    tableId: selectedTable,
                },
                { headers }
            );

            const data = response.data;

            if (!data?.success) {
                throw new Error(
                    data?.message || "This coupon is not valid."
                );
            }

            const discountAmount = Number(data.discountAmount);

            if (
                !Number.isFinite(discountAmount) ||
                discountAmount < 0
            ) {
                throw new Error(
                    "The server returned an invalid discount amount."
                );
            }

            if (discountAmount > subtotal + taxAmount) {
                throw new Error(
                    "The discount exceeds the bill amount."
                );
            }

            setAppliedCoupon(
                data.coupon || { code }
            );

            setCouponCode(code.toUpperCase());
            setDiscount(discountAmount);

            alert(
                `Coupon applied successfully!\n` +
                `Code: ${code.toUpperCase()}\n` +
                `Discount: ₹${discountAmount.toFixed(2)}`
            );
        } catch (error) {
            console.error(
                "Apply coupon:",
                error.response?.data || error
            );

            setAppliedCoupon(null);
            setDiscount(0);

            setCouponError(
                error.response?.data?.message ||
                error.message ||
                "Unable to validate coupon."
            );
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        resetCoupon();
    };

    // --------------------------------------------------
    // CREATE BILL
    // --------------------------------------------------

    const createBill = async () => {
        if (!selectedTable) {
            alert("Please select a table first.");
            return;
        }

        if (!account) {
            alert("There is no active table account.");
            return;
        }

        if (bill?._id) {
            alert("A bill has already been generated for this selection.");
            return;
        }

        if (couponCode.trim() && !appliedCoupon) {
            alert("Please apply or remove the entered coupon code.");
            return;
        }

        try {
            setBillLoading(true);
            setPageError("");

            const response = await axios.post(
                `${API}/restaurant-bills/table/${selectedTable}`,
                {
                    discountAmount: appliedCoupon
                        ? Number(discount)
                        : 0,

                    couponCode: appliedCoupon
                        ? couponCode.trim()
                        : null,

                    customerName:
                        customerName.trim() || "Walk-in Customer",

                    customerPhone: customerPhone.trim(),
                },
                { headers }
            );

            if (!response.data?.success || !response.data.bill) {
                throw new Error(
                    response.data?.message || "Bill creation failed."
                );
            }

            setBill(response.data.bill);

            alert(
                "Bill created successfully!\n" +
                `Bill Number: ${response.data.bill.billNumber}\n` +
                `Total: ₹${Number(
                    response.data.bill.totalAmount || 0
                ).toFixed(2)}`
            );
        } catch (error) {
            console.error(
                "Create bill:",
                error.response?.data || error
            );

            setPageError(
                error.response?.data?.message ||
                error.message ||
                "Unable to create restaurant bill."
            );
        } finally {
            setBillLoading(false);
        }
    };

    // --------------------------------------------------
    // PAY BILL
    // --------------------------------------------------

    const payBill = async () => {
        if (!bill?._id) {
            alert("Generate the bill first.");
            return;
        }

        if (bill.paymentStatus === "paid") {
            alert("This bill has already been paid.");
            return;
        }

        if (
            !window.confirm(
                `Confirm payment of ₹${Number(
                    bill.totalAmount || 0
                ).toFixed(2)} by ${paymentMethod}?`
            )
        ) {
            return;
        }

        try {
            setPaymentLoading(true);
            setPageError("");

            const response = await axios.post(
                `${API}/restaurant-bills/${bill._id}/pay`,
                { paymentMethod },
                { headers }
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Payment failed."
                );
            }

            setBill(response.data.bill);

            alert("Restaurant bill paid successfully!");

            // Reload tables after payment.
            await loadTables();

            // If backend has made this table available, clear its
            // active billing selection. The bill remains in history.
            setSelectedTable(null);
            setTableAccount(null);
            setBill(null);
            resetCoupon();
        } catch (error) {
            console.error(
                "Pay bill:",
                error.response?.data || error
            );

            setPageError(
                error.response?.data?.message ||
                error.message ||
                "Unable to process payment."
            );
        } finally {
            setPaymentLoading(false);
        }
    };

    // --------------------------------------------------
    // DOWNLOAD BILL PDF
    // --------------------------------------------------

    const downloadPDF = async () => {
        if (!bill?._id) {
            alert("Generate a bill first.");
            return;
        }

        try {
            const response = await axios.get(
                `${API}/restaurant-bills/${bill._id}/pdf`,
                {
                    headers,
                    responseType: "blob",
                }
            );

            const blob = new Blob(
                [response.data],
                { type: "application/pdf" }
            );

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
            alert("Unable to download the bill PDF.");
        }
    };

    // --------------------------------------------------
    // PRINT RECEIPT
    // --------------------------------------------------

    const printReceipt = () => {
        if (!bill?._id) {
            alert("Generate a bill first.");
            return;
        }

        window.print();
    };

    // --------------------------------------------------
    // INITIAL LOAD
    // --------------------------------------------------

    useEffect(() => {
        loadTables();
    }, [loadTables]);

    // --------------------------------------------------
    // ACCOUNT AND BILL CALCULATIONS
    // --------------------------------------------------

    const account = tableAccount?.account || null;

    const subtotal = Number(account?.subtotal || 0);

    const taxAmount = Number(account?.taxAmount || 0);

    const currentDiscount = bill
        ? Number(bill.discountAmount || 0)
        : Number(discount || 0);

    const calculatedTotal = bill
        ? Number(bill.totalAmount || 0)
        : Math.max(
            0,
            subtotal + taxAmount - currentDiscount
        );

    const selectedTableData = tables.find(
        (table) => table._id === selectedTable
    );

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

            {/* HEADER */}
            <div className="no-print" style={styles.card}>
                <h1 style={{ margin: "0 0 8px" }}>
                    Reception Billing
                </h1>
                <p style={{ color: "#666", margin: 0 }}>
                    Manage restaurant tables, coupons, bills and payments.
                </p>
            </div>

            {pageError && (
                <div
                    className="no-print"
                    style={{
                        ...styles.card,
                        color: "#b71c1c",
                        background: "#ffebee",
                    }}
                >
                    {pageError}
                </div>
            )}

            {/* TABLE LIST */}
            <section className="no-print" style={styles.card}>
                <h2>Restaurant Tables</h2>

                {loading && <p>Loading...</p>}

                {!loading && tables.length === 0 && (
                    <p>No active restaurant tables found.</p>
                )}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(170px, 1fr))",
                        gap: "14px",
                    }}
                >
                    {tables.map((table) => {
                        const isSelected = selectedTable === table._id;
                        const status = String(
                            table.status || "unknown"
                        ).toLowerCase();

                        const isAvailable = status === "available";

                        return (
                            <button
                                type="button"
                                key={table._id}
                                onClick={() =>
                                    loadTableAccount(table._id)
                                }
                                style={{
                                    padding: "18px",
                                    border: isSelected
                                        ? "3px solid #1565c0"
                                        : "1px solid #ddd",
                                    borderRadius: "10px",
                                    background: isAvailable
                                        ? "#e8f5e9"
                                        : "#ffebee",
                                    cursor: "pointer",
                                    textAlign: "left",
                                }}
                            >
                                <h3 style={{ marginTop: 0 }}>
                                    Table {table.tableNumber}
                                </h3>
                                <p>Capacity: {table.capacity}</p>
                                <strong>{table.status}</strong>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* TABLE ACCOUNT */}
            {selectedTable && (
                <section className="no-print" style={styles.card}>
                    <h2>
                        Table Account
                        {selectedTableData
                            ? ` — Table ${selectedTableData.tableNumber}`
                            : ""}
                    </h2>

                    {loading && <p>Loading table account...</p>}

                    {!loading && !account && (
                        <p>
                            No account details found. This table may not
                            have any active orders.
                        </p>
                    )}

                    {!loading && account && (
                        <>
                            <h3>Orders</h3>

                            {tableAccount?.orders?.length > 0 ? (
                                tableAccount.orders.map((order) => (
                                    <div
                                        key={order._id}
                                        style={{
                                            padding: "15px",
                                            background: "#f7f7f7",
                                            borderRadius: "8px",
                                            marginBottom: "12px",
                                        }}
                                    >
                                        <strong>
                                            Order #{String(order._id).slice(-6)}
                                        </strong>

                                        <p>
                                            Status: {order.orderStatus}
                                        </p>

                                        {order.items?.map((item, index) => (
                                            <div key={item._id || index}>
                                                {item.name} × {item.quantity}
                                                {" = ₹"}
                                                {Number(item.total || 0).toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <p>No orders found for this table.</p>
                            )}

                            <hr style={{ margin: "24px 0" }} />

                            {/* CUSTOMER DETAILS */}
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
                                        onChange={(e) =>
                                            setCustomerName(e.target.value)
                                        }
                                        placeholder="Walk-in Customer"
                                        disabled={Boolean(bill?._id)}
                                    />
                                </label>

                                <label>
                                    Customer mobile
                                    <input
                                        style={styles.input}
                                        value={customerPhone}
                                        onChange={(e) =>
                                            setCustomerPhone(e.target.value)
                                        }
                                        placeholder="Enter mobile number"
                                        inputMode="tel"
                                        disabled={Boolean(bill?._id)}
                                    />
                                </label>
                            </div>

                            {/* COUPON */}
                            {!bill && (
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
                                    <h3 style={{ marginTop: 0 }}>
                                        Apply Coupon
                                    </h3>

                                    <p style={{ color: "#666" }}>
                                        Scan a QR/barcode coupon or type
                                        the coupon code manually.
                                    </p>

                                    <input
                                        style={styles.input}
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(
                                                e.target.value.toUpperCase()
                                            );
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
                                            onClick={() =>
                                                setScanOpen((value) => !value)
                                            }
                                            style={{
                                                ...styles.button,
                                                background: "#1565c0",
                                            }}
                                        >
                                            {scanOpen
                                                ? "Close Scanner"
                                                : "Scan Coupon"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={applyCoupon}
                                            disabled={couponLoading}
                                            style={{
                                                ...styles.button,
                                                background: couponLoading
                                                    ? "#999"
                                                    : "#2e7d32",
                                            }}
                                        >
                                            {couponLoading
                                                ? "Validating..."
                                                : "Apply Coupon"}
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
                                                Allow camera access and point
                                                the camera at the coupon code.
                                            </p>
                                            <div id="coupon-reader" />
                                        </div>
                                    )}

                                    {couponError && (
                                        <p style={{ color: "#c62828" }}>
                                            {couponError}
                                        </p>
                                    )}

                                    {appliedCoupon && (
                                        <p style={{ color: "#2e7d32" }}>
                                            ✓ Coupon{" "}
                                            {appliedCoupon.code || couponCode}
                                            {" applied. Discount: ₹"}
                                            {discount.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* BILL SUMMARY */}
                            <div style={{ maxWidth: "650px" }}>
                                <h3>Bill Summary</h3>

                                <p>
                                    <strong>Subtotal:</strong>{" "}
                                    ₹{subtotal.toFixed(2)}
                                </p>

                                <p>
                                    <strong>GST:</strong>{" "}
                                    ₹{taxAmount.toFixed(2)}
                                </p>

                                <p>
                                    <strong>Discount:</strong>{" "}
                                    −₹{currentDiscount.toFixed(2)}
                                </p>

                                <h2>
                                    Total: ₹{calculatedTotal.toFixed(2)}
                                </h2>

                                {!bill && (
                                    <button
                                        type="button"
                                        onClick={createBill}
                                        disabled={billLoading}
                                        style={{
                                            ...styles.button,
                                            background: billLoading
                                                ? "#999"
                                                : "#1565c0",
                                            marginTop: "10px",
                                        }}
                                    >
                                        {billLoading
                                            ? "Generating..."
                                            : "Generate Bill"}
                                    </button>
                                )}
                            </div>
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
                            <strong>Bill No:</strong> {bill.billNumber}
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

                        <p>
                            <strong>Subtotal:</strong>{" "}
                            ₹{Number(bill.subtotal ?? subtotal).toFixed(2)}
                        </p>
                        <p>
                            <strong>GST:</strong>{" "}
                            ₹{Number(bill.taxAmount ?? taxAmount).toFixed(2)}
                        </p>
                        <p>
                            <strong>Discount:</strong>{" "}
                            −₹{Number(bill.discountAmount || 0).toFixed(2)}
                        </p>
                        <h2>
                            Total: ₹{Number(bill.totalAmount || 0).toFixed(2)}
                        </h2>

                        <p>
                            <strong>Payment Status:</strong>{" "}
                            {bill.paymentStatus || "pending"}
                        </p>

                        {bill.paymentMethod && (
                            <p>
                                <strong>Payment Method:</strong>{" "}
                                {bill.paymentMethod}
                            </p>
                        )}
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
                    </div>

                    <div className="no-print">
                        {bill.paymentStatus !== "paid" ? (
                            <div
                                style={{
                                    marginTop: "24px",
                                    padding: "18px",
                                    background: "#f5f5f5",
                                    borderRadius: "8px",
                                }}
                            >
                                <h3>Payment</h3>

                                <label>
                                    Payment method
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) =>
                                            setPaymentMethod(e.target.value)
                                        }
                                        style={{
                                            ...styles.input,
                                            marginTop: "8px",
                                            maxWidth: "250px",
                                        }}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="upi">UPI</option>
                                    </select>
                                </label>

                                <div>
                                    <button
                                        type="button"
                                        onClick={payBill}
                                        disabled={paymentLoading}
                                        style={{
                                            ...styles.button,
                                            background: paymentLoading
                                                ? "#999"
                                                : "#2e7d32",
                                            marginTop: "14px",
                                        }}
                                    >
                                        {paymentLoading
                                            ? "Processing..."
                                            : "Pay Bill"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    marginTop: "20px",
                                    padding: "15px",
                                    background: "#e8f5e9",
                                    color: "#2e7d32",
                                    borderRadius: "8px",
                                }}
                            >
                                <strong>
                                    ✓ Bill Paid Successfully
                                </strong>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
