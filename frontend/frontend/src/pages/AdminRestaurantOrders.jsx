
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "cancelled",
  "out_for_delivery",
  "delivered",
];

const PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid"];

const CURRENT_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

const getOrderId = (order) => order?._id || order?.id;
const getOrderNumber = (order) => order?.orderNumber || getOrderId(order);
const getCustomerName = (order) =>
  order?.customerName || order?.customer?.name || "Walk-in customer";

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isBillGenerated = (order) =>
  Boolean(order?.billGenerated || order?.invoiceNumber);

const isPaid = (order) => order?.paymentStatus === "paid";

const isCurrentOrder = (order) =>
  CURRENT_STATUSES.includes(order?.orderStatus);

const isEditable = (order) =>
  isCurrentOrder(order) &&
  !isBillGenerated(order) &&
  !isPaid(order);

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const emptyPackedForm = {
  customerName: "",
  customerMobile: "",
  paymentMethod: "cash",
  notes: "",
};

export default function AdminRestaurantOrders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    "";

  const authConfig = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const [orders, setOrders] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cart, setCart] = useState([]);
  const [foodSearch, setFoodSearch] = useState("");

  const [showPackedForm, setShowPackedForm] = useState(false);
  const [packedForm, setPackedForm] = useState(emptyPackedForm);
  const [packedCart, setPackedCart] = useState([]);
  const [packedSearch, setPackedSearch] = useState("");

  const showError = (error, fallback) => {
    setErrorMessage(getErrorMessage(error, fallback));
    setMessage("");
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await axios.get(
        `${API}/restaurant-orders/all`,
        authConfig
      );

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data?.orders ||
          data?.restaurantOrders ||
          data?.data ||
          [];

      setOrders(Array.isArray(list) ? list : []);
    } catch (error) {
      showError(error, "Unable to load restaurant orders.");
    } finally {
      setLoading(false);
    }
  }, [authConfig]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadFoods = async () => {
    try {
      const response = await axios.get(
        `${API}/menu/foods?isAvailable=true`,
        authConfig
      );

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data?.foodItems || data?.foods || data?.data || [];

      setFoods(Array.isArray(list) ? list : []);
    } catch (error) {
      showError(error, "Unable to load food items.");
    }
  };

  const getTableName = (order) => {
    if (order?.table?.tableNumber != null) {
      return `Table ${order.table.tableNumber}`;
    }

    if (order?.table?.name) {
      return order.table.name;
    }

    if (order?.tableNumber != null) {
      return `Table ${order.tableNumber}`;
    }

    if (order?.orderType === "takeaway") {
      return "Packed / Takeaway";
    }

    if (order?.orderType === "delivery") {
      return "Delivery Orders";
    }

    return "Table Not Assigned";
  };

  // Only paid orders and currently running orders are shown.
  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const paid = isPaid(order);
      const current = isCurrentOrder(order);

      if (!paid && !current) return false;

      const matchesSearch = [
        getOrderNumber(order),
        getCustomerName(order),
        order.customerMobile,
        getTableName(order),
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "all" ||
        order.orderStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Group orders by table. Paid orders stay visible alongside current orders.
  const groupedOrders = useMemo(() => {
    const groups = new Map();

    visibleOrders.forEach((order) => {
      const tableName = getTableName(order);

      if (!groups.has(tableName)) {
        groups.set(tableName, []);
      }

      groups.get(tableName).push(order);
    });

    return [...groups.entries()]
      .map(([tableName, tableOrders]) => ({
        tableName,
        orders: tableOrders.sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        ),
      }))
      .sort((a, b) => a.tableName.localeCompare(b.tableName));
  }, [visibleOrders]);

  const getFoodPrice = (food) => {
    const discount = Number(food.discountPrice);
    const price = Number(food.price || 0);

    return discount > 0 && discount < price ? discount : price;
  };

  const addFood = (food, setTargetCart) => {
    setTargetCart((current) => {
      const existing = current.find((item) => item.food === food._id);

      if (existing) {
        return current.map((item) =>
          item.food === food._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          food: food._id,
          name: food.name,
          price: getFoodPrice(food),
          quantity: 1,
          servingType: "takeaway",
          specialInstructions: "",
        },
      ];
    });
  };

  const updateCartItem = (setTargetCart, foodId, field, value) => {
    setTargetCart((current) =>
      current.map((item) =>
        item.food === foodId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeCartItem = (setTargetCart, foodId) => {
    setTargetCart((current) =>
      current.filter((item) => item.food !== foodId)
    );
  };

  const openAddItems = async (order) => {
    if (!isEditable(order)) {
      setErrorMessage(
        "Only current, unpaid orders without a generated bill can be edited."
      );
      return;
    }

    setSelectedOrder(order);
    setCart([]);
    setFoodSearch("");
    setMessage("");
    setErrorMessage("");
    await loadFoods();
  };

  const submitAdditionalItems = async () => {
    if (!selectedOrder || cart.length === 0) {
      setErrorMessage("Please add at least one food item.");
      return;
    }

    if (!isEditable(selectedOrder)) {
      setErrorMessage("This order is locked and cannot be edited.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      await axios.put(
        `${API}/restaurant-orders/${getOrderId(selectedOrder)}/items`,
        {
          items: cart.map((item) => ({
            food: item.food,
            quantity: Number(item.quantity),
            servingType: item.servingType,
            specialInstructions: item.specialInstructions,
          })),
        },
        authConfig
      );

      setMessage("Items added successfully.");
      setSelectedOrder(null);
      setCart([]);
      await loadOrders();
    } catch (error) {
      showError(error, "Unable to add items to this order.");
    } finally {
      setSaving(false);
    }
  };

  const createPackedOrder = async (event) => {
    event.preventDefault();

    if (!packedForm.customerName.trim()) {
      setErrorMessage("Customer name is required.");
      return;
    }

    if (!packedForm.customerMobile.trim()) {
      setErrorMessage("Customer mobile number is required.");
      return;
    }

    if (packedCart.length === 0) {
      setErrorMessage("Please add at least one food item.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      const payload = {
        customerName: packedForm.customerName.trim(),
        customerMobile: packedForm.customerMobile.trim(),
        orderType: "takeaway",
        paymentMethod: packedForm.paymentMethod,
        notes: packedForm.notes.trim(),
        items: packedCart.map((item) => ({
          food: item.food,
          quantity: Number(item.quantity),
          servingType: "takeaway",
          specialInstructions: item.specialInstructions,
        })),
      };

      const response = await axios.post(
        `${API}/restaurant-orders`,
        payload,
        authConfig
      );

      const createdOrder =
        response.data?.order || response.data?.data || response.data;

      setMessage(
        `Packed order ${getOrderNumber(createdOrder || {})} created successfully.`
      );

      setShowPackedForm(false);
      setPackedForm(emptyPackedForm);
      setPackedCart([]);
      setPackedSearch("");

      await loadOrders();
    } catch (error) {
      showError(error, "Unable to create packed order.");
    } finally {
      setSaving(false);
    }
  };

  const removeOrderItem = async (order, item) => {
    if (!isEditable(order)) {
      setErrorMessage("This order is locked and cannot be edited.");
      return;
    }

    if (!item._id) {
      setErrorMessage("This item has no ID and cannot be removed.");
      return;
    }

    if (order.items?.length <= 1) {
      setErrorMessage("The last item cannot be removed.");
      return;
    }

    if (!window.confirm(`Remove "${item.name}" from this order?`)) {
      return;
    }

    try {
      setErrorMessage("");
      setMessage("");

      await axios.delete(
        `${API}/restaurant-orders/${getOrderId(order)}/items/${item._id}`,
        authConfig
      );

      setMessage("Order item removed.");
      await loadOrders();
    } catch (error) {
      showError(error, "Unable to remove this item.");
    }
  };

  const updateOrderField = async (
    order,
    endpoint,
    payload,
    successText
  ) => {
    try {
      setErrorMessage("");
      setMessage("");

      await axios.put(
        `${API}/restaurant-orders/${getOrderId(order)}/${endpoint}`,
        payload,
        authConfig
      );

      setMessage(successText);
      await loadOrders();
    } catch (error) {
      showError(error, "Unable to update the order.");
    }
  };

  const filteredFoods = foods.filter((food) =>
    food.name?.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const filteredPackedFoods = foods.filter((food) =>
    food.name?.toLowerCase().includes(packedSearch.toLowerCase())
  );

  const cartTotal = (items) =>
    items.reduce(
      (sum, item) =>
        sum + item.price * Number(item.quantity || 0),
      0
    );

  const renderFoodPicker = (list, query, setQuery, targetCart) => (
    <>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search food..."
        className="mt-4 w-full rounded-lg border p-3"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((food) => (
          <div key={food._id} className="rounded-lg border p-3">
            {food.image && (
              <img
                src={food.image}
                alt={food.name}
                className="mb-3 h-32 w-full rounded-lg object-cover"
              />
            )}

            <h3 className="font-semibold">{food.name}</h3>

            <p className="mt-1 text-sm text-gray-600">
              {formatMoney(getFoodPrice(food))}
            </p>

            <button
              type="button"
              onClick={() => addFood(food, targetCart)}
              className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
            >
              + Add Item
            </button>
          </div>
        ))}

        {list.length === 0 && (
          <p className="text-sm text-gray-500">No food items found.</p>
        )}
      </div>
    </>
  );

  const renderCart = (items, setTargetCart) => (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-bold">
        Selected Items ({items.length})
      </h3>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No items selected.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div
              key={item.food}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-4"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {formatMoney(item.price)} each
                </p>
              </div>

              <label className="text-sm">
                Quantity
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateCartItem(
                      setTargetCart,
                      item.food,
                      "quantity",
                      Math.max(1, Number(event.target.value) || 1)
                    )
                  }
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="text-sm">
                Special instructions
                <input
                  value={item.specialInstructions}
                  onChange={(event) =>
                    updateCartItem(
                      setTargetCart,
                      item.food,
                      "specialInstructions",
                      event.target.value
                    )
                  }
                  placeholder="Less spicy, etc."
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <button
                type="button"
                onClick={() => removeCartItem(setTargetCart, item.food)}
                className="self-end rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xl font-bold">
        Subtotal: {formatMoney(cartTotal(items))}
      </p>

      <p className="text-xs text-gray-500">
        Final total and tax are calculated by the server.
      </p>
    </div>
  );

  const renderOrderCard = (order) => {
    const editable = isEditable(order);
    const paid = isPaid(order);

    return (
      <article
        key={getOrderId(order)}
        className="overflow-hidden rounded-xl border bg-white shadow-sm"
      >
        <div className="flex flex-col justify-between gap-4 border-b bg-gray-50 p-5 md:flex-row">
          <div>
            <h3 className="text-lg font-bold">
              Order #{getOrderNumber(order)}
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Customer: {getCustomerName(order)}
            </p>

            <p className="text-sm text-gray-600">
              Mobile: {order.customerMobile || "—"}
            </p>

            <p className="text-sm text-gray-600">
              Type: {order.orderType || "dine-in"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString("en-IN")
                : ""}
            </p>

            {isBillGenerated(order) && (
              <p className="mt-2 inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                Bill generated · Editing locked
              </p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-2xl font-bold">
              {formatMoney(order.totalAmount)}
            </p>

            <p className="text-sm">
              Payment: {order.paymentStatus || "unpaid"}
            </p>

            <p className="text-sm">
              Status: {order.orderStatus || "pending"}
            </p>

            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                paid
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {paid ? "Payment Completed" : "Running Order"}
            </span>

            {order.invoiceNumber && (
              <p className="text-xs text-gray-500">
                Invoice: {order.invoiceNumber}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <h4 className="font-semibold">Order Items</h4>

          {(order.items || []).map((item) => (
            <div
              key={item._id || `${item.food}-${item.name}`}
              className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium">
                  {item.name || item.food?.name || "Food item"}
                </p>

                <p className="text-sm text-gray-500">
                  Qty: {item.quantity} × {formatMoney(item.price)} ={" "}
                  {formatMoney(
                    item.total ??
                      Number(item.price || 0) *
                        Number(item.quantity || 0)
                  )}
                </p>

                <p className="text-xs text-gray-500">
                  {item.servingType || "dine-in"}
                </p>

                {item.specialInstructions && (
                  <p className="text-sm text-gray-500">
                    Note: {item.specialInstructions}
                  </p>
                )}
              </div>

              {!paid && (
                <button
                  type="button"
                  onClick={() => removeOrderItem(order, item)}
                  disabled={
                    !editable ||
                    order.items?.length <= 1 ||
                    !item._id
                  }
                  title={
                    !editable
                      ? "This order is locked"
                      : "Remove item"
                  }
                  className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove Item
                </button>
              )}
            </div>
          ))}

          {!paid && (
            <div className="grid gap-3 border-t pt-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Order Status
                <select
                  value={order.orderStatus || "pending"}
                  onChange={(event) =>
                    updateOrderField(
                      order,
                      "status",
                      { orderStatus: event.target.value },
                      "Order status updated."
                    )
                  }
                  className="mt-1 block w-full rounded-lg border p-2"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Payment Status
                <select
                  value={order.paymentStatus || "unpaid"}
                  onChange={(event) =>
                    updateOrderField(
                      order,
                      "payment",
                      { paymentStatus: event.target.value },
                      "Payment status updated."
                    )
                  }
                  className="mt-1 block w-full rounded-lg border p-2"
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {editable && (
            <button
              type="button"
              onClick={() => openAddItems(order)}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              + Add More Items
            </button>
          )}

          {paid && (
            <p className="text-sm font-medium text-green-700">
              Payment completed. This order is read-only.
            </p>
          )}

          {!paid && !editable && (
            <p className="text-sm text-gray-500">
              This order cannot be edited because it is completed or its bill
              has been generated.
            </p>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-xl bg-slate-900 p-6 text-white">
        <h1 className="text-2xl font-bold md:text-3xl">
          Restaurant Orders Management
        </h1>

        <p className="mt-2 text-slate-300">
          View paid orders and running orders table-wise. Add food to eligible
          running orders before billing.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadOrders}
            className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700"
          >
            ↻ Refresh Orders
          </button>

          <button
            type="button"
            onClick={async () => {
              setShowPackedForm(true);
              setSelectedOrder(null);
              setPackedForm(emptyPackedForm);
              setPackedCart([]);
              setPackedSearch("");
              setMessage("");
              setErrorMessage("");
              await loadFoods();
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-700"
          >
            + Create Packed Order
          </button>
        </div>
      </header>

      {message && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Displayed Orders</p>
          <p className="mt-2 text-3xl font-bold">{visibleOrders.length}</p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Running Orders</p>
          <p className="mt-2 text-3xl font-bold">
            {orders.filter(isCurrentOrder).length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Paid Orders</p>
          <p className="mt-2 text-3xl font-bold">
            {orders.filter(isPaid).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow md:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order, customer, mobile or table..."
          className="min-w-0 flex-1 rounded-lg border p-3"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border p-3"
        >
          <option value="all">Paid + current orders</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center">
          Loading restaurant orders...
        </div>
      ) : groupedOrders.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500">
          No paid or current orders found.
        </div>
      ) : (
        <div className="space-y-8">
          {groupedOrders.map(({ tableName, orders: tableOrders }) => {
            const paidOrders = tableOrders.filter(isPaid);
            const runningOrders = tableOrders.filter(
              (order) => isCurrentOrder(order) && !isPaid(order)
            );

            return (
              <section
                key={tableName}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {tableName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {paidOrders.length} paid · {runningOrders.length} running
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                    {tableOrders.length} order(s)
                  </span>
                </div>

                {runningOrders.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <h3 className="font-bold text-blue-800">
                      Current Running Orders
                    </h3>
                    {runningOrders.map(renderOrderCard)}
                  </div>
                )}

                {paidOrders.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-green-800">
                      Paid Orders / History
                    </h3>
                    {paidOrders.map(renderOrderCard)}
                  </div>
                )}

                {runningOrders.length === 0 && paidOrders.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No current or paid orders for this table.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Add items to an existing running order */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Add Items to Order #{getOrderNumber(selectedOrder)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Table: {getTableName(selectedOrder)} · Only current unpaid
                  orders can be edited before billing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg bg-gray-100 px-3 py-2 hover:bg-gray-200"
              >
                ✕ Close
              </button>
            </div>

            {renderFoodPicker(
              filteredFoods,
              foodSearch,
              setFoodSearch,
              setCart
            )}

            {renderCart(cart, setCart)}

            <button
              type="button"
              onClick={submitAdditionalItems}
              disabled={saving || cart.length === 0}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Items to Existing Order"}
            </button>
          </div>
        </div>
      )}

      {/* Create new packed / takeaway order */}
      {showPackedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <form
            onSubmit={createPackedOrder}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Create Packed Order</h2>
                <p className="mt-1 text-sm text-gray-500">
                  New takeaway order · no table required.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPackedForm(false)}
                className="rounded-lg bg-gray-100 px-3 py-2 hover:bg-gray-200"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Customer Name *
                <input
                  required
                  maxLength={100}
                  value={packedForm.customerName}
                  onChange={(event) =>
                    setPackedForm((prev) => ({
                      ...prev,
                      customerName: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="Customer name"
                />
              </label>

              <label className="text-sm font-medium">
                Customer Mobile *
                <input
                  required
                  maxLength={20}
                  type="tel"
                  value={packedForm.customerMobile}
                  onChange={(event) =>
                    setPackedForm((prev) => ({
                      ...prev,
                      customerMobile: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="Mobile number"
                />
              </label>

              <label className="text-sm font-medium">
                Payment Method
                <select
                  value={packedForm.paymentMethod}
                  onChange={(event) =>
                    setPackedForm((prev) => ({
                      ...prev,
                      paymentMethod: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="pending">Payment pending</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Order Notes
                <input
                  value={packedForm.notes}
                  onChange={(event) =>
                    setPackedForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="Packing instructions, etc."
                />
              </label>
            </div>

            {renderFoodPicker(
              filteredPackedFoods,
              packedSearch,
              setPackedSearch,
              setPackedCart
            )}

            {renderCart(packedCart, setPackedCart)}

            <button
              type="submit"
              disabled={saving || packedCart.length === 0}
              className="mt-5 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Creating Order..." : "Create Packed Order"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
