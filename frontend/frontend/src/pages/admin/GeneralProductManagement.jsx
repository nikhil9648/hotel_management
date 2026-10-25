
import { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/admin";

const initialForm = {
  name: "",
  barcode: "",
  category: "General",
  unit: "piece",
  purchasePrice: "",
  sellingPrice: "",
  stock: "",
  lowStockAlert: "5",
  expiryDate: "",
};

export default function GeneralProductManagement() {
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.name.trim() ||
      !form.category.trim() ||
      form.purchasePrice === "" ||
      form.sellingPrice === "" ||
      form.stock === ""
    ) {
      setError("Please fill all required fields.");
      return;
    }

    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);
    const stock = Number(form.stock);
    const lowStockAlert = Number(form.lowStockAlert);

    if (
      !Number.isFinite(purchasePrice) ||
      !Number.isFinite(sellingPrice) ||
      purchasePrice < 0 ||
      sellingPrice < 0 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !Number.isFinite(lowStockAlert) ||
      lowStockAlert < 0
    ) {
      setError("Enter valid prices and stock quantities.");
      return;
    }

    if (
      !Number.isInteger(lowStockAlert)
    ) {
      setError("Low-stock alert must be a whole number.");
      return;
    }

    if (
      form.barcode.trim() &&
      !/^[a-zA-Z0-9-]+$/.test(form.barcode.trim())
    ) {
      setError(
        "Barcode can contain letters, numbers, and hyphens only."
      );
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const payload = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || undefined,
        category: form.category.trim(),
        unit: form.unit,
        purchasePrice,
        sellingPrice,
        stock,
        lowStockAlert,
        expiryDate: form.expiryDate || null,
      };

      const response = await axios.post(
        `${API}/general-products`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        response.data.message || "Product added successfully."
      );

      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add product. Check your admin login and backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:border-blue-500";

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">General POS Products</h1>
            <p className="mt-2 text-slate-600">Register products and barcodes for your separate POS billing system.</p>
          </div>
          <button type="button" className="add-form-trigger" onClick={() => setShowForm((open) => !open)}>
            {showForm ? "Close form" : "+ Add Product"}
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {showForm && <form
          onSubmit={handleSubmit}
          className="add-form-panel rounded-xl bg-white p-5 shadow-sm md:p-8"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="text-sm font-medium">
              Product Name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Parle-G Biscuit"
                maxLength={150}
                required
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium">
              Barcode
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                placeholder="Scan or enter barcode"
                autoComplete="off"
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium">
              Category *
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Biscuits, Drinks, Grocery"
                maxLength={100}
                required
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium">
              Unit
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="piece">Piece</option>
                <option value="bottle">Bottle</option>
                <option value="packet">Packet</option>
                <option value="kg">Kilogram</option>
                <option value="gram">Gram</option>
                <option value="litre">Litre</option>
                <option value="ml">Millilitre</option>
                <option value="box">Box</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Purchase Price (₹) *
              <input
                name="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium">
              Selling Price (₹) *
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium">
              Opening Stock *
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium">
              Low Stock Alert
              <input
                name="lowStockAlert"
                type="number"
                min="0"
                step="1"
                value={form.lowStockAlert}
                onChange={handleChange}
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Expiry Date (optional)
              <input
                name="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={handleChange}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving Product..." : "Add Product"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setError("");
                setMessage("");
              }}
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50"
            >
              Clear Form
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}
