
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const emptyAddress = {
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

const Checkout = () => {
  const [cart, setCart] = useState([]);
  const [address, setAddress] = useState(emptyAddress);
  const [savedAddress, setSavedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // Load cart and customer profile
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("cart") || "[]");
      setCart(Array.isArray(data) ? data : []);
    } catch {
      setCart([]);
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    if (!token) {
      setError("Please log in to continue checkout.");
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: authHeaders,
      });

      const user = response.data.user;
      const existing = {
        street: user?.address?.street || "",
        city: user?.address?.city || "",
        state: user?.address?.state || "",
        pincode: user?.address?.pincode || "",
        country: user?.address?.country || "India",
      };

      const hasAddress = Boolean(
        existing.street ||
          existing.city ||
          existing.state ||
          existing.pincode
      );

      if (hasAddress) {
        setSavedAddress(existing);
        setAddress(existing);
        setShowAddressForm(false);
      } else {
        setAddress(emptyAddress);
        setSavedAddress(null);
        setShowAddressForm(true);
      }
    } catch (err) {
      console.error("Load profile error:", err);
      setError(
        err.response?.data?.message ||
          "Could not load your profile address."
      );
    }
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const handleAddressChange = (event) => {
    const { name, value } = event.target;

    setAddress((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // Fetch approximate readable address using browser location
  const useCurrentLocation = () => {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    setFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Reverse address lookup failed.");
          }

          const data = await response.json();
          const place = data.address || {};

          const detected = {
            street:
              [
                place.house_number,
                place.road || place.pedestrian || place.suburb,
              ]
                .filter(Boolean)
                .join(", ") ||
              data.display_name ||
              "",
            city:
              place.city ||
              place.town ||
              place.village ||
              place.municipality ||
              "",
            state: place.state || "",
            pincode: place.postcode || "",
            country: place.country || "India",
          };

          setAddress(detected);
          setShowAddressForm(true);
          setMessage(
            "Location address fetched. Verify the details before saving."
          );
        } catch (err) {
          console.error("Location address error:", err);
          setError(
            "Could not fetch the address. Please enter it manually."
          );
        } finally {
          setFetchingLocation(false);
        }
      },
      (geoError) => {
        setFetchingLocation(false);

        setError(
          geoError.code === 1
            ? "Location permission denied. Allow location access in your browser."
            : "Could not determine your location. Please enter your address manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const validateAddress = () => {
    if (
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !/^[0-9]{6}$/.test(address.pincode.trim()) ||
      !address.country.trim()
    ) {
      setError(
        "Enter street, city, state, a valid 6-digit PIN code and country."
      );
      return false;
    }

    return true;
  };

  // Save address to the logged-in user's profile
  const saveAddress = async () => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return false;
    }

    if (!validateAddress()) {
      return false;
    }

    try {
      setSavingAddress(true);

      const normalized = {
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        country: address.country.trim(),
      };

      await axios.put(`${API}/auth/address`, normalized, {
        headers: authHeaders,
      });

      setAddress(normalized);
      setSavedAddress(normalized);
      setShowAddressForm(false);
      setMessage("Delivery address saved successfully.");

      return true;
    } catch (err) {
      console.error("Save address error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save address. Check that PUT /api/auth/address exists in your backend."
      );

      return false;
    } finally {
      setSavingAddress(false);
    }
  };

  const getFoodId = (item) =>
    item.foodItem || item.food || item._id || item.id;

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const placeOrder = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in before placing an order.");
      return;
    }

    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!validateAddress()) {
      setShowAddressForm(true);
      return;
    }

    for (const item of cart) {
      if (!getFoodId(item)) {
        setError(
          "A food item ID is missing. Remove that item and add it again."
        );
        return;
      }

      if (
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
      ) {
        setError("One or more cart quantities are invalid.");
        return;
      }
    }

    try {
      setLoading(true);

      // Save the latest address first
      const addressSaved = await saveAddress();

      if (!addressSaved) {
        return;
      }

      // Create delivery order; payment remains pending until verified
      const orderData = {
        orderType: "delivery",
        deliveryAddress: [
          address.street,
          address.city,
          address.state,
          address.pincode,
          address.country,
        ]
          .filter(Boolean)
          .join(", "),
        customerName: "",
        customerMobile: "",
        paymentMethod: "razorpay",
        notes: notes.trim(),
        items: cart.map((item) => ({
          food: getFoodId(item),
          quantity: Number(item.quantity),
          servingType: "takeaway",
          specialInstructions: "",
        })),
      };

      // The backend currently requires customerName and customerMobile.
      // Use the logged-in profile instead of inventing customer details.
      const profileResponse = await axios.get(`${API}/auth/me`, {
        headers: authHeaders,
      });

      const user = profileResponse.data.user;

      if (!user?.name || !user?.phone) {
        setError(
          "Please add your name and phone number to your profile before ordering."
        );
        return;
      }

      orderData.customerName = user.name;
      orderData.customerMobile = user.phone;

      const orderResponse = await axios.post(
        `${API}/restaurant-orders`,
        orderData,
        { headers: authHeaders }
      );

      const order = orderResponse.data.order;

      if (!order?._id) {
        throw new Error("The backend did not return an order ID.");
      }

      // IMPORTANT:
      // These endpoints must be implemented for restaurant orders.
      // Do not use the room-booking payment API with this order ID.
      const paymentOrderResponse = await axios.post(
        `${API}/restaurant-payments/create-order`,
        { orderId: order._id },
        { headers: authHeaders }
      );

      const paymentData = paymentOrderResponse.data;
      const razorpayOrder = paymentData.order;

      if (!razorpayOrder?.id || !paymentData.key) {
        throw new Error(
          "Restaurant payment API did not return a Razorpay order and key."
        );
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const razorpay = new window.Razorpay({
        key: paymentData.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Hotel & Restaurant",
        description: `Food order ${order.orderNumber || ""}`,
        order_id: razorpayOrder.id,

        handler: async (paymentResult) => {
          try {
            const verifyResponse = await axios.post(
              `${API}/restaurant-payments/verify`,
              {
                orderId: order._id,
                razorpay_order_id:
                  paymentResult.razorpay_order_id,
                razorpay_payment_id:
                  paymentResult.razorpay_payment_id,
                razorpay_signature:
                  paymentResult.razorpay_signature,
              },
              { headers: authHeaders }
            );

            if (!verifyResponse.data.success) {
              throw new Error("Payment verification failed.");
            }

            localStorage.removeItem("cart");
            setCart([]);

            window.location.href =
              `/order-success?orderId=${order._id}`;
          } catch (error) {
  console.error("Payment verification failed:", {
    status: error.response?.status,
    response: error.response?.data,
    message: error.message,
  });

  alert(
    error.response?.data?.message ||
    "Payment verification failed. Check the browser console."
  );
}
        },

        modal: {
          ondismiss: () => {
            setMessage(
              "Payment was not completed. Your order may still be pending."
            );
          },
        },

        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },

        theme: {
          color: "#f97316",
        },
      });

      razorpay.open();
    } catch (err) {
      console.error("Place order error:", err);
      console.error("Backend response:", err.response?.data);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to continue checkout."
      );
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-3xl font-bold">Your Cart Is Empty</h1>
        <p className="text-gray-500 mt-3">
          Add food items to continue.
        </p>
        <a
          href="/menu"
          className="inline-block mt-6 bg-orange-500 text-white px-6 py-3 rounded-lg"
        >
          Browse Menu
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
          {message}
        </div>
      )}

      <form
        onSubmit={placeOrder}
        className="grid lg:grid-cols-3 gap-8"
      >
        <section className="lg:col-span-2 bg-white border rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-5">
            Delivery Details
          </h2>

          {savedAddress && !showAddressForm && (
            <div className="border rounded-xl bg-orange-50 p-4 mb-5">
              <h3 className="font-bold mb-2">Saved Address</h3>
              <p>{savedAddress.street}</p>
              <p>
                {savedAddress.city}, {savedAddress.state}
              </p>
              <p>
                {savedAddress.pincode}, {savedAddress.country}
              </p>

              <button
                type="button"
                onClick={() => {
                  setAddress(savedAddress);
                  setShowAddressForm(true);
                  setMessage("");
                  setError("");
                }}
                className="mt-4 text-orange-700 underline"
              >
                Edit Address
              </button>
            </div>
          )}

          {(!savedAddress || showAddressForm) && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={fetchingLocation}
                  className="bg-orange-500 text-white px-4 py-3 rounded-lg disabled:bg-gray-400"
                >
                  {fetchingLocation
                    ? "Fetching Location..."
                    : "Use Current Location"}
                </button>

                {savedAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddress(savedAddress);
                      setShowAddressForm(false);
                      setError("");
                    }}
                    className="border px-4 py-3 rounded-lg"
                  >
                    Use Saved Address
                  </button>
                )}
              </div>

              {[
                ["street", "House number, street and area"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "6-digit PIN code"],
                ["country", "Country"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="block font-semibold mb-2">
                    {label}
                  </label>

                  <input
                    name={name}
                    value={address[name]}
                    onChange={handleAddressChange}
                    required
                    maxLength={name === "pincode" ? 6 : 150}
                    pattern={
                      name === "pincode"
                        ? "[0-9]{6}"
                        : undefined
                    }
                    inputMode={
                      name === "pincode" ? "numeric" : undefined
                    }
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={saveAddress}
                disabled={savingAddress}
                className="border border-orange-500 text-orange-700 px-4 py-3 rounded-lg disabled:opacity-50"
              >
                {savingAddress ? "Saving..." : "Save Address"}
              </button>
            </div>
          )}

          <label className="block font-semibold mb-2">
            Special Instructions (Optional)
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Example: Less spicy, call on arrival"
            className="w-full border rounded-lg p-3"
          />

          <div className="mt-5 rounded-lg bg-gray-50 border p-4">
            <p className="font-semibold">Order Type: Delivery</p>
            <p className="font-semibold mt-2">
              Payment Method: Razorpay (Online Payment Only)
            </p>
          </div>
        </section>

        <aside className="bg-gray-50 border rounded-xl p-6 h-fit">
          <h2 className="text-2xl font-bold mb-5">
            Order Summary
          </h2>

          {cart.map((item, index) => (
            <div
              key={getFoodId(item) || index}
              className="flex justify-between gap-3 mb-3"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="whitespace-nowrap">
                ₹
                {(
                  Number(item.price || 0) *
                  Number(item.quantity || 0)
                ).toFixed(2)}
              </span>
            </div>
          ))}

          <hr className="my-4" />

          <div className="flex justify-between mb-3">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between mb-3">
            <span>Tax (18%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>

          <hr className="my-4" />

          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            disabled={loading || fetchingLocation || savingAddress}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 rounded-lg mt-6"
          >
            {loading
              ? "Processing..."
              : "Pay Now with Razorpay"}
          </button>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
