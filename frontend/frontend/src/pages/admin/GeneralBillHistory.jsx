
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
// import downloadGeneralBill from "../../utils/downloadGeneralBill";

const API = "http://localhost:5000/api/admin";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

export default function GeneralBillHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const params = {
        page: 1,
        limit: 100,
      };

      if (fromDate) params.from = fromDate;
      if (toDate) params.to = `${toDate}T23:59:59.999`;

      const response = await axios.get(`${API}/general-bills`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      setBills(response.data.bills || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load General POS bill history."
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const filteredBills = bills.filter((bill) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      bill.billNumber,
      bill.customerName,
      bill.customerPhone,
      bill.paymentMethod,
      bill.paymentStatus,
    ].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );
  });

  const paidBills = filteredBills.filter(
    (bill) => bill.paymentStatus === "paid"
  );

  const totalSales = paidBills.reduce(
    (sum, bill) => sum + Number(bill.total || 0),
    0
  );

  const handleDownload = (bill) => {
    downloadGeneralBill(bill);
  };

  const handlePrint = (bill) => {
    const popup = window.open("", "_blank", "width=500,height=700");

    if (!popup) {
      setError("Allow pop-ups in your browser to print bills.");
      return;
    }

    const escapeHTML = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[char];
      });

    const rows = (bill.items || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${Number(item.quantity || 0)}</td>
            <td>${money(item.unitPrice)}</td>
            <td>${money(item.lineTotal)}</td>
          </tr>`
      )
      .join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHTML(bill.billNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2, .center { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; }
            .total { text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h2>General POS Bill</h2>
          <p class="center">Bill No: ${escapeHTML(bill.billNumber)}</p>
          <p class="center">${escapeHTML(
            bill.createdAt
              ? new Date(bill.createdAt).toLocaleString("en-IN")
              : "-"
          )}</p>
          <hr />
          <p>Customer: ${escapeHTML(bill.customerName || "Walk-in Customer")}</p>
          <p>Mobile: ${escapeHTML(bill.customerPhone || "-")}</p>
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">
            <p>Subtotal: ${money(bill.subtotal)}</p>
            <p>Discount: ${money(bill.discount)}</p>
            <p>Tax: ${money(bill.tax)}</p>
            <h3>Total: ${money(bill.total)}</h3>
            <p>Payment: ${escapeHTML(bill.paymentMethod)}</p>
            <p>Status: ${escapeHTML(bill.paymentStatus)}</p>
          </div>
          <p class="center">Thank you for your purchase!</p>
          <script>window.onload = () => window.print();<\/script>
        </body>
      </html>
    `);

    popup.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              General Billing - Bill History
            </h1>
            <p className="mt-2 text-slate-600">
              Search, view, download and print General POS bills.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBills}
            className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Bills Found</p>
            <p className="mt-2 text-2xl font-bold">
              {filteredBills.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid Bills</p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {paidBills.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Sales of Loaded Bills
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {money(totalSales)}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bill number, customer or mobile..."
            className="rounded-lg border p-3 md:col-span-1"
          />

          <label className="text-sm text-slate-600">
            From date
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>

          <label className="text-sm text-slate-600">
            To date
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center">Loading bills...</p>
          ) : filteredBills.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No General POS bills found.
            </p>
          ) : (
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">
                      {bill.billNumber}
                    </td>

                    <td className="p-3">
                      {bill.createdAt
                        ? new Date(bill.createdAt).toLocaleDateString("en-IN")
                        : "-"}
                    </td>

                    <td className="p-3">
                      {bill.customerName || "Walk-in Customer"}
                    </td>

                    <td className="p-3">
                      {bill.customerPhone || "-"}
                    </td>

                    <td className="p-3">
                      {(bill.items || []).reduce(
                        (sum, item) => sum + Number(item.quantity || 0),
                        0
                      )}
                    </td>

                    <td className="p-3 capitalize">
                      {bill.paymentMethod || "-"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          bill.paymentStatus === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {bill.paymentStatus || "unknown"}
                      </span>
                    </td>

                    <td className="p-3 font-semibold">
                      {money(bill.total)}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBill(bill)}
                          className="rounded bg-blue-600 px-3 py-2 text-white"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownload(bill)}
                          className="rounded bg-green-600 px-3 py-2 text-white"
                        >
                          PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrint(bill)}
                          className="rounded bg-slate-700 px-3 py-2 text-white"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Bill Details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="rounded bg-slate-200 px-3 py-2"
                >
                  Close
                </button>
              </div>

              <p><strong>Bill:</strong> {selectedBill.billNumber}</p>
              <p className="mt-2">
                <strong>Customer:</strong>{" "}
                {selectedBill.customerName || "Walk-in Customer"}
              </p>
              <p className="mt-2">
                <strong>Mobile:</strong>{" "}
                {selectedBill.customerPhone || "-"}
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Product</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(selectedBill.items || []).map((item, index) => (
                      <tr
                        key={`${item.product || item.name}-${index}`}
                        className="border-b"
                      >
                        <td className="py-2">{item.name}</td>
                        <td className="py-2">{item.quantity}</td>
                        <td className="py-2">{money(item.unitPrice)}</td>
                        <td className="py-2">{money(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 space-y-2 text-right">
                <p>Subtotal: {money(selectedBill.subtotal)}</p>
                <p>Discount: {money(selectedBill.discount)}</p>
                <p>Tax: {money(selectedBill.tax)}</p>
                <p className="text-xl font-bold">
                  Total: {money(selectedBill.total)}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedBill)}
                  className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white"
                >
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint(selectedBill)}
                  className="rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white"
                >
                  Print Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
