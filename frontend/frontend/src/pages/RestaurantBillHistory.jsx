import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function RestaurantBillHistory() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const token = localStorage.getItem("token");

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    // ==========================================
    // LOAD BILLS
    // ==========================================

    const loadBills = async () => {
        try {
            setLoading(true);

            const params = {};

            if (search.trim()) {
                params.search = search.trim();
            }

            if (paymentStatus) {
                params.paymentStatus = paymentStatus;
            }

            if (startDate) {
                params.startDate = startDate;
            }

            if (endDate) {
                params.endDate = endDate;
            }

            const response = await axios.get(
                `${API}/restaurant-bills`,
                {
                    headers,
                    params,
                }
            );

            setBills(response.data.bills || []);

        } catch (error) {
            console.error(
                "Load Restaurant Bills Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to load restaurant bills"
            );

        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    useEffect(() => {
        loadBills();
    }, []);

    // ==========================================
    // VIEW BILL
    // ==========================================

    const viewBill = async (billId) => {
        try {
            const response = await axios.get(
                `${API}/restaurant-bills/${billId}`,
                {
                    headers,
                }
            );

            const bill = response.data.bill;

            alert(
                `Bill: ${bill.billNumber}\n` +
                `Customer: ${bill.customerName}\n` +
                `Subtotal: ₹${bill.subtotal}\n` +
                `GST: ₹${bill.taxAmount}\n` +
                `Discount: ₹${bill.discountAmount}\n` +
                `Total: ₹${bill.totalAmount}\n` +
                `Payment: ${bill.paymentStatus}`
            );

        } catch (error) {
            console.error(
                "View Bill Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to view bill"
            );
        }
    };

    // ==========================================
    // PRINT BILL
    // ==========================================

    const printBill = async (billId) => {
        try {
            const response = await axios.get(
                `${API}/restaurant-bills/${billId}`,
                {
                    headers,
                }
            );

            const bill = response.data.bill;

            const printWindow = window.open(
                "",
                "_blank",
                "width=800,height=900"
            );

            if (!printWindow) {
                alert(
                    "Please allow popups to print the bill."
                );
                return;
            }

            const tableNumber =
                bill.table?.tableNumber || "-";

            const orders = bill.orders || [];

            let itemsHTML = "";

            orders.forEach((order) => {
                (order.items || []).forEach(
                    (item) => {
                        itemsHTML += `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${item.price}</td>
                                <td>₹${item.total}</td>
                            </tr>
                        `;
                    }
                );
            });

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${bill.billNumber}</title>

                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 30px;
                            color: #222;
                        }

                        .header {
                            text-align: center;
                            margin-bottom: 25px;
                        }

                        .header h1 {
                            margin: 0;
                        }

                        .header p {
                            margin: 5px 0;
                        }

                        .info {
                            margin-bottom: 20px;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }

                        th,
                        td {
                            border: 1px solid #ccc;
                            padding: 10px;
                            text-align: left;
                        }

                        th {
                            background: #f5f5f5;
                        }

                        .summary {
                            margin-top: 25px;
                            margin-left: auto;
                            width: 300px;
                        }

                        .summary div {
                            display: flex;
                            justify-content: space-between;
                            margin: 8px 0;
                        }

                        .total {
                            font-size: 20px;
                            font-weight: bold;
                            border-top: 2px solid #222;
                            padding-top: 10px;
                        }

                        .footer {
                            margin-top: 40px;
                            text-align: center;
                        }
                    </style>
                </head>

                <body>

                    <div class="header">
                        <h1>Restaurant Bill</h1>
                        <p>${bill.billNumber}</p>
                    </div>

                    <div class="info">
                        <p>
                            <strong>Customer:</strong>
                            ${bill.customerName || "Walk-in Customer"}
                        </p>

                        <p>
                            <strong>Phone:</strong>
                            ${bill.customerPhone || "-"}
                        </p>

                        <p>
                            <strong>Table:</strong>
                            ${tableNumber}
                        </p>

                        <p>
                            <strong>Date:</strong>
                            ${new Date(
                                bill.createdAt
                            ).toLocaleString()}
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
                            ${itemsHTML}
                        </tbody>
                    </table>

                    <div class="summary">

                        <div>
                            <span>Subtotal</span>
                            <span>₹${bill.subtotal}</span>
                        </div>

                        <div>
                            <span>GST</span>
                            <span>₹${bill.taxAmount}</span>
                        </div>

                        <div>
                            <span>Discount</span>
                            <span>₹${bill.discountAmount}</span>
                        </div>

                        <div class="total">
                            <span>Total</span>
                            <span>₹${bill.totalAmount}</span>
                        </div>

                        <div>
                            <span>Payment</span>
                            <span>
                                ${bill.paymentStatus}
                            </span>
                        </div>

                        <div>
                            <span>Method</span>
                            <span>
                                ${bill.paymentMethod || "-"}
                            </span>
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

        } catch (error) {
            console.error(
                "Print Bill Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to print bill"
            );
        }
    };

    // ==========================================
    // RESET FILTERS
    // ==========================================

    const resetFilters = () => {
        setSearch("");
        setPaymentStatus("");
        setStartDate("");
        setEndDate("");

        setTimeout(() => {
            loadBills();
        }, 0);
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <div
            style={{
                padding: "30px",
                fontFamily: "Arial",
            }}
        >

            <h1>
                Restaurant Bill History
            </h1>

            <p>
                View and manage previous restaurant bills.
            </p>

            {/* ======================================
                FILTERS
            ====================================== */}

            <div
                style={{
                    marginTop: "25px",
                    padding: "20px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    background: "#fafafa",
                }}
            >

                <h3>
                    Search & Filters
                </h3>

                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >

                    <input
                        type="text"
                        placeholder="Search bill/customer..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        style={{
                            padding: "10px",
                            minWidth: "220px",
                        }}
                    />

                    <select
                        value={paymentStatus}
                        onChange={(e) =>
                            setPaymentStatus(
                                e.target.value
                            )
                        }
                        style={{
                            padding: "10px",
                        }}
                    >
                        <option value="">
                            All Payments
                        </option>

                        <option value="paid">
                            Paid
                        </option>

                        <option value="unpaid">
                            Unpaid
                        </option>

                        <option value="partially_paid">
                            Partially Paid
                        </option>
                    </select>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                            setStartDate(
                                e.target.value
                            )
                        }
                        style={{
                            padding: "10px",
                        }}
                    />

                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                            setEndDate(
                                e.target.value
                            )
                        }
                        style={{
                            padding: "10px",
                        }}
                    />

                    <button
                        onClick={loadBills}
                        style={{
                            padding: "10px 18px",
                            background: "#1976d2",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                        }}
                    >
                        Search
                    </button>

                    <button
                        onClick={resetFilters}
                        style={{
                            padding: "10px 18px",
                            background: "#757575",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                        }}
                    >
                        Reset
                    </button>

                </div>

            </div>

            {/* ======================================
                BILL COUNT
            ====================================== */}

            <h3
                style={{
                    marginTop: "30px",
                }}
            >
                Total Bills: {bills.length}
            </h3>

            {/* ======================================
                LOADING
            ====================================== */}

            {loading ? (

                <p>
                    Loading bills...
                </p>

            ) : bills.length === 0 ? (

                <div
                    style={{
                        padding: "30px",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        textAlign: "center",
                    }}
                >
                    <h3>
                        No restaurant bills found
                    </h3>

                    <p>
                        Generate a restaurant bill first.
                    </p>
                </div>

            ) : (

                /* ==================================
                   BILL TABLE
                ================================== */

                <div
                    style={{
                        overflowX: "auto",
                    }}
                >

                    <table
                        style={{
                            width: "100%",
                            borderCollapse:
                                "collapse",
                            marginTop: "15px",
                        }}
                    >

                        <thead>

                            <tr
                                style={{
                                    background:
                                        "#eeeeee",
                                }}
                            >

                                <th style={thStyle}>
                                    Bill No.
                                </th>

                                <th style={thStyle}>
                                    Table
                                </th>

                                <th style={thStyle}>
                                    Customer
                                </th>

                                <th style={thStyle}>
                                    Subtotal
                                </th>

                                <th style={thStyle}>
                                    GST
                                </th>

                                <th style={thStyle}>
                                    Discount
                                </th>

                                <th style={thStyle}>
                                    Total
                                </th>

                                <th style={thStyle}>
                                    Payment
                                </th>

                                <th style={thStyle}>
                                    Status
                                </th>

                                <th style={thStyle}>
                                    Date
                                </th>

                                <th style={thStyle}>
                                    Actions
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {bills.map((bill) => (

                                <tr
                                    key={bill._id}
                                >

                                    <td style={tdStyle}>
                                        {bill.billNumber}
                                    </td>

                                    <td style={tdStyle}>
                                        {bill.table
                                            ?.tableNumber ||
                                            "-"}
                                    </td>

                                    <td style={tdStyle}>
                                        {bill.customerName ||
                                            "Walk-in Customer"}
                                    </td>

                                    <td style={tdStyle}>
                                        ₹
                                        {Number(
                                            bill.subtotal ||
                                                0
                                        ).toFixed(2)}
                                    </td>

                                    <td style={tdStyle}>
                                        ₹
                                        {Number(
                                            bill.taxAmount ||
                                                0
                                        ).toFixed(2)}
                                    </td>

                                    <td style={tdStyle}>
                                        ₹
                                        {Number(
                                            bill.discountAmount ||
                                                0
                                        ).toFixed(2)}
                                    </td>

                                    <td
                                        style={{
                                            ...tdStyle,
                                            fontWeight:
                                                "bold",
                                        }}
                                    >
                                        ₹
                                        {Number(
                                            bill.totalAmount ||
                                                0
                                        ).toFixed(2)}
                                    </td>

                                    <td style={tdStyle}>
                                        {bill.paymentMethod ||
                                            "pending"}
                                    </td>

                                    <td style={tdStyle}>

                                        <span
                                            style={{
                                                padding:
                                                    "5px 10px",
                                                borderRadius:
                                                    "15px",
                                                background:
                                                    bill.paymentStatus ===
                                                    "paid"
                                                        ? "#c8e6c9"
                                                        : "#ffcdd2",
                                            }}
                                        >
                                            {
                                                bill.paymentStatus
                                            }
                                        </span>

                                    </td>

                                    <td style={tdStyle}>
                                        {new Date(
                                            bill.createdAt
                                        ).toLocaleString()}
                                    </td>

                                    <td style={tdStyle}>

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                gap: "6px",
                                                flexWrap:
                                                    "wrap",
                                            }}
                                        >

                                            <button
                                                onClick={() =>
                                                    viewBill(
                                                        bill._id
                                                    )
                                                }
                                                style={
                                                    viewButtonStyle
                                                }
                                            >
                                                View
                                            </button>

                                            <button
                                                onClick={() =>
                                                    printBill(
                                                        bill._id
                                                    )
                                                }
                                                style={
                                                    printButtonStyle
                                                }
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

            )}

        </div>
    );
}

// ==========================================
// STYLES
// ==========================================

const thStyle = {
    border: "1px solid #ddd",
    padding: "12px",
    textAlign: "left",
    whiteSpace: "nowrap",
};

const tdStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    whiteSpace: "nowrap",
};

const viewButtonStyle = {
    padding: "7px 12px",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
};

const printButtonStyle = {
    padding: "7px 12px",
    background: "#388e3c",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
};