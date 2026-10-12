import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function RestaurantBilling() {
    // ==========================================
    // STATES
    // ==========================================

    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableAccount, setTableAccount] = useState(null);
    const [bill, setBill] = useState(null);

    const [loading, setLoading] = useState(false);
    const [billLoading, setBillLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");

    // ==========================================
    // TOKEN
    // ==========================================

    const token = localStorage.getItem("token");

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    // ==========================================
    // LOAD TABLES
    // ==========================================

    const loadTables = async () => {
        try {
            setLoading(true);

            const response = await axios.get(
                `${API}/tables`,
                {
                    headers,
                }
            );

            console.log("TABLES RESPONSE:", response.data);

            setTables(
                response.data.tables ||
                response.data.data ||
                []
            );
        } catch (error) {
            console.error(
                "Load Tables Error:",
                error.response?.data || error
            );

            alert(
                error.response?.data?.message ||
                "Unable to load restaurant tables"
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // LOAD TABLE ACCOUNT
    // ==========================================

    const loadTableAccount = async (tableId) => {
        try {
            setLoading(true);

            setSelectedTable(tableId);

            setBill(null);

            const response = await axios.get(
                `${API}/restaurant-orders/table/${tableId}`,
                {
                    headers,
                }
            );

            console.log(
                "TABLE ACCOUNT RESPONSE:",
                response.data
            );

            setTableAccount(response.data);
        } catch (error) {
            console.error(
                "Load Table Account Error:",
                error.response?.data || error
            );

            setTableAccount(null);

            alert(
                error.response?.data?.message ||
                "Unable to load table account"
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // CREATE BILL
    // ==========================================

    const createBill = async () => {
        try {
            if (!selectedTable) {
                alert("Please select a table first.");
                return;
            }

            setBillLoading(true);

            const response = await axios.post(
                `${API}/restaurant-bills/table/${selectedTable}`,
                {
                    discountAmount:
                        Number(discount) || 0,

                    customerName:
                        "Walk-in Customer",

                    customerPhone:
                        "",
                },
                {
                    headers,
                }
            );

            console.log(
                "CREATE BILL RESPONSE:",
                response.data
            );

            if (
                response.data &&
                response.data.success
            ) {
                const generatedBill =
                    response.data.bill;

                setBill(generatedBill);

                alert(
                    `Bill created successfully!\n\nBill Number: ${generatedBill.billNumber}\nTotal: ₹${generatedBill.totalAmount}`
                );
            } else {
                alert(
                    response.data?.message ||
                    "Bill creation failed"
                );
            }
        } catch (error) {
            console.error(
                "Create Bill Error:",
                error.response?.data || error
            );

            alert(
                error.response?.data?.message ||
                "Unable to create restaurant bill"
            );
        } finally {
            setBillLoading(false);
        }
    };

    // ==========================================
    // PAY BILL
    // ==========================================

    const payBill = async () => {
        try {
            if (!bill?._id) {
                alert("Please generate the bill first.");
                return;
            }

            setPaymentLoading(true);

            const response = await axios.post(
                `${API}/restaurant-bills/${bill._id}/pay`,
                {
                    paymentMethod,
                },
                {
                    headers,
                }
            );

            console.log(
                "PAY BILL RESPONSE:",
                response.data
            );

            if (response.data?.success) {
                setBill(response.data.bill);

                alert(
                    "Restaurant bill paid successfully!"
                );

                // Reload tables so table status updates
                await loadTables();
            } else {
                alert(
                    response.data?.message ||
                    "Payment failed"
                );
            }
        } catch (error) {
            console.error(
                "Pay Bill Error:",
                error.response?.data || error
            );

            alert(
                error.response?.data?.message ||
                "Unable to pay restaurant bill"
            );
        } finally {
            setPaymentLoading(false);
        }
    };

    // ==========================================
    // DOWNLOAD PDF
    // ==========================================

    const downloadPDF = async () => {
        try {
            if (!bill?._id) {
                alert(
                    "Please generate the bill first."
                );
                return;
            }

            const response = await axios.get(
                `${API}/restaurant-bills/${bill._id}/pdf`,
                {
                    headers,
                    responseType: "blob",
                }
            );

            const blob = new Blob(
                [response.data],
                {
                    type: "application/pdf",
                }
            );

            const url =
                window.URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                `${bill.billNumber}.pdf`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(
                "PDF Download Error:",
                error
            );

            alert(
                "Unable to download bill PDF"
            );
        }
    };

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    useEffect(() => {
        loadTables();
    }, []);

    // ==========================================
    // ACCOUNT
    // ==========================================

    const account =
        tableAccount?.account || null;

    // ==========================================
    // CALCULATIONS
    // ==========================================

    const subtotal =
        Number(account?.subtotal || 0);

    const taxAmount =
        Number(account?.taxAmount || 0);

    const discountAmount =
        Number(discount || 0);

    const calculatedTotal =
        Math.max(
            0,
            subtotal +
            taxAmount -
            discountAmount
        );

    // ==========================================
    // UI
    // ==========================================

    return (
        <div
            style={{
                padding: "30px",
                fontFamily: "Arial, sans-serif",
                background: "#f5f6fa",
                minHeight: "100vh",
            }}
        >

            {/* =====================================
                HEADER
            ====================================== */}

            <div
                style={{
                    background: "white",
                    padding: "25px",
                    borderRadius: "12px",
                    marginBottom: "25px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)",
                }}
            >
                <h1
                    style={{
                        margin: 0,
                        marginBottom: "8px",
                    }}
                >
                    Reception Billing
                </h1>

                <p
                    style={{
                        margin: 0,
                        color: "#666",
                    }}
                >
                    Manage restaurant table bills,
                    payments and invoices
                </p>
            </div>

            {/* =====================================
                TABLES
            ====================================== */}

            <div
                style={{
                    background: "white",
                    padding: "25px",
                    borderRadius: "12px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)",
                }}
            >
                <h2>
                    Restaurant Tables
                </h2>

                {loading && (
                    <p>
                        Loading tables...
                    </p>
                )}

                {!loading &&
                    tables.length === 0 && (
                        <p>
                            No restaurant tables found.
                        </p>
                    )}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: "15px",
                    }}
                >
                    {tables.map((table) => {

                        const isSelected =
                            selectedTable ===
                            table._id;

                        const isAvailable =
                            table.status ===
                            "available";

                        return (
                            <button
                                type="button"
                                key={table._id}
                                onClick={() =>
                                    loadTableAccount(
                                        table._id
                                    )
                                }
                                style={{
                                    padding: "20px",
                                    border:
                                        isSelected
                                            ? "3px solid #1976d2"
                                            : "1px solid #ccc",
                                    borderRadius:
                                        "10px",
                                    cursor:
                                        "pointer",

                                    background:
                                        isAvailable
                                            ? "#e8f5e9"
                                            : "#ffebee",

                                    textAlign:
                                        "left",
                                }}
                            >
                                <h3
                                    style={{
                                        marginTop: 0,
                                    }}
                                >
                                    Table{" "}
                                    {
                                        table.tableNumber
                                    }
                                </h3>

                                <p>
                                    Capacity:{" "}
                                    {
                                        table.capacity
                                    }
                                </p>

                                <strong>
                                    {
                                        table.status
                                    }
                                </strong>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* =====================================
                SELECTED TABLE
            ====================================== */}

            {selectedTable && (
                <div
                    style={{
                        marginTop: "25px",
                        background: "white",
                        padding: "25px",
                        borderRadius: "12px",
                        boxShadow:
                            "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                >
                    <h2>
                        Table Account
                    </h2>

                    {loading ? (
                        <p>
                            Loading account...
                        </p>
                    ) : account ? (
                        <>
                            {/* =================================
                                ORDERS
                            ================================== */}

                            <h3>
                                Orders
                            </h3>

                            {tableAccount.orders
                                ?.length > 0 ? (
                                tableAccount.orders.map(
                                    (order) => (
                                        <div
                                            key={
                                                order._id
                                            }
                                            style={{
                                                marginBottom:
                                                    "15px",

                                                padding:
                                                    "15px",

                                                background:
                                                    "#f5f5f5",

                                                borderRadius:
                                                    "8px",
                                            }}
                                        >
                                            <strong>
                                                Order #
                                                {order._id.slice(
                                                    -6
                                                )}
                                            </strong>

                                            <p>
                                                Status:{" "}
                                                {
                                                    order.orderStatus
                                                }
                                            </p>

                                            {order.items?.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <div
                                                        key={
                                                            index
                                                        }
                                                        style={{
                                                            marginBottom:
                                                                "5px",
                                                        }}
                                                    >
                                                        {item.name}
                                                        {" × "}
                                                        {
                                                            item.quantity
                                                        }
                                                        {" = ₹"}
                                                        {
                                                            item.total
                                                        }
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )
                                )
                            ) : (
                                <p>
                                    No orders found
                                    for this table.
                                </p>
                            )}

                            {/* =================================
                                BILL SUMMARY
                            ================================== */}

                            <hr />

                            <h3>
                                Bill Summary
                            </h3>

                            <div
                                style={{
                                    maxWidth:
                                        "500px",
                                }}
                            >
                                <p>
                                    <strong>
                                        Subtotal:
                                    </strong>{" "}
                                    ₹
                                    {subtotal.toFixed(
                                        2
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        GST:
                                    </strong>{" "}
                                    ₹
                                    {taxAmount.toFixed(
                                        2
                                    )}
                                </p>

                                {/* DISCOUNT */}

                                <div
                                    style={{
                                        marginTop:
                                            "15px",
                                        marginBottom:
                                            "15px",
                                    }}
                                >
                                    <label>
                                        <strong>
                                            Discount:
                                        </strong>
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            discount
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setDiscount(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        style={{
                                            marginLeft:
                                                "10px",
                                            padding:
                                                "8px",
                                            width:
                                                "150px",
                                            border:
                                                "1px solid #ccc",
                                            borderRadius:
                                                "5px",
                                        }}
                                    />
                                </div>

                                <p>
                                    <strong>
                                        Discount Amount:
                                    </strong>{" "}
                                    ₹
                                    {discountAmount.toFixed(
                                        2
                                    )}
                                </p>

                                <h2>
                                    Total: ₹
                                    {calculatedTotal.toFixed(
                                        2
                                    )}
                                </h2>
                            </div>

                            {/* =================================
                                GENERATE BILL
                            ================================== */}

                            {!bill && (
                                <button
                                    type="button"
                                    onClick={
                                        createBill
                                    }
                                    disabled={
                                        billLoading
                                    }
                                    style={{
                                        padding:
                                            "12px 25px",

                                        background:
                                            billLoading
                                                ? "#999"
                                                : "#1976d2",

                                        color: "white",

                                        border: "none",

                                        borderRadius:
                                            "6px",

                                        cursor:
                                            billLoading
                                                ? "not-allowed"
                                                : "pointer",

                                        marginTop:
                                            "10px",
                                    }}
                                >
                                    {billLoading
                                        ? "Generating..."
                                        : "Generate Bill"}
                                </button>
                            )}
                        </>
                    ) : (
                        <p>
                            No account found.
                        </p>
                    )}
                </div>
            )}

            {/* =====================================
                GENERATED BILL
            ====================================== */}

            {bill && (
                <div
                    style={{
                        marginTop: "25px",
                        background: "white",
                        padding: "30px",
                        borderRadius: "12px",
                        boxShadow:
                            "0 2px 8px rgba(0,0,0,0.08)",
                        border:
                            "2px solid #4caf50",
                    }}
                >
                    <h2
                        style={{
                            color: "#2e7d32",
                        }}
                    >
                        Bill Generated Successfully
                    </h2>

                    <hr />

                    <p>
                        <strong>
                            Bill Number:
                        </strong>{" "}
                        {bill.billNumber}
                    </p>

                    <p>
                        <strong>
                            Customer:
                        </strong>{" "}
                        {bill.customerName}
                    </p>

                    <p>
                        <strong>
                            Customer Phone:
                        </strong>{" "}
                        {bill.customerPhone ||
                            "-"}
                    </p>

                    <p>
                        <strong>
                            Subtotal:
                        </strong>{" "}
                        ₹
                        {Number(
                            bill.subtotal || 0
                        ).toFixed(2)}
                    </p>

                    <p>
                        <strong>
                            GST:
                        </strong>{" "}
                        ₹
                        {Number(
                            bill.taxAmount || 0
                        ).toFixed(2)}
                    </p>

                    <p>
                        <strong>
                            Discount:
                        </strong>{" "}
                        ₹
                        {Number(
                            bill.discountAmount ||
                            0
                        ).toFixed(2)}
                    </p>

                    <h2>
                        Total: ₹
                        {Number(
                            bill.totalAmount || 0
                        ).toFixed(2)}
                    </h2>

                    <p>
                        <strong>
                            Payment Status:
                        </strong>{" "}
                        {bill.paymentStatus}
                    </p>

                    <p>
                        <strong>
                            Payment Method:
                        </strong>{" "}
                        {bill.paymentMethod}
                    </p>

                    {/* =================================
                        PDF
                    ================================== */}

                    <button
                        type="button"
                        onClick={downloadPDF}
                        style={{
                            padding:
                                "12px 20px",

                            background:
                                "#6a1b9a",

                            color: "white",

                            border: "none",

                            borderRadius:
                                "6px",

                            cursor:
                                "pointer",

                            marginRight:
                                "10px",

                            marginTop:
                                "10px",
                        }}
                    >
                        Download PDF
                    </button>

                    {/* =================================
                        PAYMENT
                    ================================== */}

                    {bill.paymentStatus !==
                        "paid" && (
                        <div
                            style={{
                                marginTop:
                                    "25px",
                                padding:
                                    "20px",
                                background:
                                    "#f5f5f5",
                                borderRadius:
                                    "8px",
                            }}
                        >
                            <h3>
                                Payment
                            </h3>

                            <select
                                value={
                                    paymentMethod
                                }
                                onChange={(
                                    e
                                ) =>
                                    setPaymentMethod(
                                        e
                                            .target
                                            .value
                                    )
                                }
                                style={{
                                    padding:
                                        "10px",
                                    marginRight:
                                        "10px",
                                    border:
                                        "1px solid #ccc",
                                    borderRadius:
                                        "5px",
                                }}
                            >
                                <option value="cash">
                                    Cash
                                </option>

                                <option value="card">
                                    Card
                                </option>

                                <option value="upi">
                                    UPI
                                </option>
                            </select>

                            <button
                                type="button"
                                onClick={payBill}
                                disabled={
                                    paymentLoading
                                }
                                style={{
                                    padding:
                                        "12px 20px",

                                    background:
                                        paymentLoading
                                            ? "#999"
                                            : "#2e7d32",

                                    color: "white",

                                    border: "none",

                                    borderRadius:
                                        "6px",

                                    cursor:
                                        paymentLoading
                                            ? "not-allowed"
                                            : "pointer",
                                }}
                            >
                                {paymentLoading
                                    ? "Processing..."
                                    : "Pay Bill"}
                            </button>
                        </div>
                    )}

                    {/* =================================
                        PAID
                    ================================== */}

                    {bill.paymentStatus ===
                        "paid" && (
                        <div
                            style={{
                                marginTop:
                                    "20px",
                                padding:
                                    "15px",
                                background:
                                    "#e8f5e9",
                                borderRadius:
                                    "8px",
                                color:
                                    "#2e7d32",
                            }}
                        >
                            <strong>
                                ✓ Bill Paid Successfully
                            </strong>

                            <p>
                                Payment Method:{" "}
                                {
                                    bill.paymentMethod
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}