
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/admin";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

const getToken = () => localStorage.getItem("token");

export default function GeneralPOS() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastBill, setLastBill] = useState(null);

  const barcodeRef = useRef(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // Load products.
  const loadProducts = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/general-products`,
        { headers: getHeaders() }
      );

      setProducts(response.data.products || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load products. Check your admin login and backend."
      );
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Add product to cart.
  const addProduct = (product) => {
    setError("");
    setMessage("");

    if (!product || product.stock < 1) {
      setError("Product is out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item._id === product._id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(
            `Only ${product.stock} units of ${product.name} are available.`
          );
          return current;
        }

        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  };

  // Scan barcode and find the product.
  const scanBarcode = async (event) => {
    event.preventDefault();

    const value = barcode.trim();

    if (!value) return;

    setError("");
    setMessage("");

    try {
      const response = await axios.get(
        `${API}/general-products/barcode/${encodeURIComponent(value)}`,
        { headers: getHeaders() }
      );

      addProduct(response.data.product);
      setBarcode("");

      setTimeout(() => barcodeRef.current?.focus(), 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Product not found for this barcode."
      );
    }
  };

  // Update product quantity.
  const updateQuantity = (id, quantity) => {
    const product = products.find(
      (item) => item._id === id
    );

    const nextQuantity = Number(quantity);

    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      setCart((current) =>
        current.filter((item) => item._id !== id)
      );
      return;
    }

    if (product && nextQuantity > product.stock) {
      setError(`Only ${product.stock} units are available.`);
      return;
    }

    setError("");

    setCart((current) =>
      current.map((item) =>
        item._id === id
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );
  };

  // Calculate totals.
  const subtotalPaise = cart.reduce(
    (sum, item) =>
      sum +
      Math.round(Number(item.sellingPrice) * 100) *
        item.quantity,
    0
  );

  const discountValue = Number(discount);
  const taxRateValue = Number(taxRate);
  const received = Number(amountReceived) || 0;

  const discountPaise = Math.round(
    Math.max(
      0,
      Number.isFinite(discountValue) ? discountValue : 0
    ) * 100
  );

  const taxablePaise = Math.max(
    0,
    subtotalPaise - discountPaise
  );

  const safeTaxRate = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(taxRateValue) ? taxRateValue : 0
    )
  );

  const taxPaise = Math.round(
    (taxablePaise * safeTaxRate) / 100
  );

  const totalPaise = taxablePaise + taxPaise;

  const subtotal = subtotalPaise / 100;
  const total = totalPaise / 100;

  const change = Math.max(
    0,
    Math.round((received - total) * 100) / 100
  );

  // Create a bill in MongoDB through the backend.
  const checkout = async () => {
    if (cart.length === 0) {
      setError("Add at least one product.");
      return;
    }

    if (paymentMethod !== "cash") {
      setError(
        "UPI and card payments require payment verification. Choose cash for now."
      );
      return;
    }

    if (!Number.isFinite(received) || received < total) {
      setError(
        "Cash received must be at least the total bill amount."
      );
      return;
    }

    if (
      !Number.isFinite(discountValue) ||
      discountValue < 0 ||
      discountPaise > subtotalPaise
    ) {
      setError(
        "Discount must be valid and cannot exceed the subtotal."
      );
      return;
    }

    if (
      !Number.isFinite(taxRateValue) ||
      taxRateValue < 0 ||
      taxRateValue > 100
    ) {
      setError("Tax rate must be between 0 and 100.");
      return;
    }

    if (
      customerName.trim().length > 100 ||
      customerPhone.trim().length > 20
    ) {
      setError("Customer name or phone number is too long.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/general-bills`,
        {
          items: cart.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
          })),
          discount: discountValue,
          taxRate: taxRateValue,
          paymentMethod: "cash",
          amountReceived: received,
          customerName:
            customerName.trim() || "Walk-in Customer",
          customerPhone: customerPhone.trim(),
        },
        { headers: getHeaders() }
      );

      const bill = response.data.bill;

      setLastBill({
        ...bill,
        customerName:
          bill.customerName ||
          customerName.trim() ||
          "Walk-in Customer",
        customerPhone:
          bill.customerPhone || customerPhone.trim(),
      });

      setMessage("Bill created successfully.");

      setCart([]);
      setAmountReceived("");
      setDiscount("0");
      setTaxRate("0");

      await loadProducts();

      setTimeout(() => barcodeRef.current?.focus(), 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the bill. Check the backend terminal."
      );
    } finally {
      setLoading(false);
    }
  };

  // Print the bill.
  const printBill = (bill) => {
    if (!bill) return;

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
          </tr>
        `
      )
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=500,height=700"
    );

    if (!printWindow) {
      setError(
        "Allow pop-ups in your browser to print the bill."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill ${escapeHTML(bill.billNumber)}</title>
          <meta charset="UTF-8" />

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #111;
            }

            h2, .center {
              text-align: center;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th, td {
              border-bottom: 1px solid #ddd;
              padding: 8px 4px;
              text-align: left;
              font-size: 12px;
            }

            .total {
              text-align: right;
              margin-top: 18px;
            }

            @media print {
              body { padding: 0; }
            }
          </style>
        </head>

        <body>
          <h2>General POS Bill</h2>

          <p class="center">
            Bill No: ${escapeHTML(bill.billNumber)}
          </p>

          <p class="center">
            Date: ${escapeHTML(
              bill.createdAt
                ? new Date(bill.createdAt).toLocaleString("en-IN")
                : new Date().toLocaleString("en-IN")
            )}
          </p>

          <hr />

          <p>Customer: ${escapeHTML(
            bill.customerName || "Walk-in Customer"
          )}</p>

          <p>Mobile: ${escapeHTML(
            bill.customerPhone || "-"
          )}</p>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>${rows}</tbody>
          </table>

          <div class="total">
            <p>Subtotal: ${money(bill.subtotal)}</p>
            <p>Discount: ${money(bill.discount)}</p>
            <p>Tax: ${money(bill.tax)}</p>
            <h3>Total: ${money(bill.total)}</h3>
            <p>Cash received: ${money(bill.amountReceived)}</p>
            <p>Change: ${money(
              Number(bill.amountReceived || 0) -
                Number(bill.total || 0)
            )}</p>
            <p>Payment: ${escapeHTML(bill.paymentMethod)}</p>
            <p>Status: ${escapeHTML(bill.paymentStatus)}</p>
          </div>

          <p class="center">Thank you for your purchase!</p>

          <script>
            window.onload = () => window.print();
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Search products.
  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category} ${product.barcode || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              General POS Billing
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Scan products, manage the cart, and print bills.
            </p>
          </div>

          <button
            type="button"
            onClick={loadProducts}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
          >
            Refresh products
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Product section */}
          <section className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">Products</h2>

            <form
              onSubmit={scanBarcode}
              className="mb-4 flex gap-2"
            >
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={(event) =>
                  setBarcode(event.target.value)
                }
                placeholder="Scan barcode and press Enter"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
                autoComplete="off"
              />

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Scan
              </button>
            </form>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, category, or barcode..."
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={product.stock < 1}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="font-semibold text-slate-900">
                    {product.name}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {product.category}
                  </div>

                  <div className="mt-3 text-lg font-bold text-blue-700">
                    {money(product.sellingPrice)}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Barcode: {product.barcode || "-"}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Stock: {product.stock} {product.unit}
                  </div>
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No products found. Add products before billing.
              </p>
            )}
          </section>

          {/* Cart and checkout */}
          <section className="h-fit rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">
              Current Bill
            </h2>

            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item._id}
                  className="border-b border-slate-100 pb-3"
                >
                  <div className="font-medium">{item.name}</div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(
                          item._id,
                          event.target.value
                        )
                      }
                      className="w-20 rounded border border-slate-300 p-2"
                    />

                    <span className="font-semibold">
                      {money(item.sellingPrice * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.filter(
                            (product) => product._id !== item._id
                          )
                        )
                      }
                      className="text-sm font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <p className="py-6 text-center text-slate-500">
                  Your cart is empty.
                </p>
              )}
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
              {/* Customer details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">
                  Customer Details
                </h3>

                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(event.target.value)
                  }
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />

                <input
                  type="tel"
                  placeholder="Customer mobile number"
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(event.target.value)
                  }
                  maxLength={20}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between">
                <label htmlFor="discount">Discount (₹)</label>

                <input
                  id="discount"
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={discount}
                  onChange={(event) =>
                    setDiscount(event.target.value)
                  }
                  className="w-28 rounded border border-slate-300 p-2"
                />
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between">
                <label htmlFor="tax">Tax (%)</label>

                <input
                  id="tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) =>
                    setTaxRate(event.target.value)
                  }
                  className="w-28 rounded border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Discount</span>
                <span>{money(discountPaise / 100)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{money(taxPaise / 100)}</span>
              </div>

              <div className="flex justify-between border-t pt-3 text-xl font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>

              {/* Payment method */}
              <label className="block text-sm font-medium">
                Payment method

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (not enabled)</option>
                  <option value="card">Card (not enabled)</option>
                </select>
              </label>

              {/* Cash received */}
              {paymentMethod === "cash" && (
                <>
                  <label className="block text-sm font-medium">
                    Cash received (₹)

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountReceived}
                      onChange={(event) =>
                        setAmountReceived(event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                    />
                  </label>

                  <div className="flex justify-between text-sm">
                    <span>Change due</span>
                    <span>{money(change)}</span>
                  </div>
                </>
              )}

              {/* Complete sale */}
              <button
                type="button"
                onClick={checkout}
                disabled={loading || cart.length === 0}
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Processing..." : "Complete Cash Sale"}
              </button>

              {/* Print last bill */}
              {lastBill && (
                <button
                  type="button"
                  onClick={() => printBill(lastBill)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-50"
                >
                  Print Last Bill
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
