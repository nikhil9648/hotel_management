import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";
const TAX_RATE = 0.18;

const emptyAddress = {
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

const getFoodId = (item) =>
  item?.foodItem?._id ||
  item?.foodItem ||
  item?.food?._id ||
  item?.food ||
  item?._id ||
  item?.id ||
  "";

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), {
        once: true,
      });
      existing.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);

  const [address, setAddress] = useState(emptyAddress);
  const [savedAddress, setSavedAddress] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(true);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [couponLoading, setCouponLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  const subtotal = useMemo(
    () =>
      Number(
        cart
          .reduce(
            (sum, item) =>
              sum +
              Number(
                item.price || item.food?.price || item.foodItem?.price || 0,
              ) *
                Number(item.quantity || 0),
            0,
          )
          .toFixed(2),
      ),
    [cart],
  );

  const discountAmount = Number(
    Math.min(
      subtotal,
      Math.max(0, Number(appliedCoupon?.discountAmount || 0)),
    ).toFixed(2),
  );

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number((taxableAmount * TAX_RATE).toFixed(2));
  const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

  const loadProfile = useCallback(async () => {
    if (!getToken()) {
      setError("Please log in before checkout.");
      setProfileLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const currentUser =
        response.data?.user ||
        response.data?.data?.user ||
        response.data?.data ||
        response.data;

      setUser(currentUser);

      const userAddress = currentUser?.address;

      if (userAddress) {
        const formattedAddress = {
          street: userAddress.street || userAddress.addressLine || "",
          city: userAddress.city || "",
          state: userAddress.state || "",
          pincode: userAddress.pincode || userAddress.postalCode || "",
          country: userAddress.country || "India",
        };

        setAddress(formattedAddress);

        const hasAddress = Boolean(
          formattedAddress.street &&
          formattedAddress.city &&
          formattedAddress.state &&
          formattedAddress.pincode,
        );

        setSavedAddress(hasAddress);
        setShowAddressForm(!hasAddress);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCart(Array.isArray(storedCart) ? storedCart : []);
    } catch {
      setCart([]);
    }

    loadProfile();
  }, [loadProfile]);

  const updateAddress = (event) => {
    const { name, value } = event.target;

    setAddress((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSavedAddress(false);
  };

  const validateAddress = () => {
    if (
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.pincode.trim() ||
      !address.country.trim()
    ) {
      setError("Please fill in all delivery address fields.");
      return false;
    }

    if (!/^\d{6}$/.test(address.pincode.trim())) {
      setError("Please enter a valid 6-digit Indian PIN code.");
      return false;
    }

    return true;
  };

  const saveAddress = async () => {
    if (!validateAddress()) return false;

    setSavingAddress(true);
    setError("");
    setMessage("");

    try {
      await axios.put(
        `${API}/auth/address`,
        {
          street: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
          country: address.country.trim(),
        },
        authHeaders,
      );

      setSavedAddress(true);
      setShowAddressForm(false);
      setMessage("Delivery address saved successfully.");

      return true;
    } catch (err) {
      setError(`Could not save address: ${getErrorMessage(err)}`);
      return false;
    } finally {
      setSavingAddress(false);
    }
  };

  const useCurrentLocation = () => {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
              params: {
                lat: latitude,
                lon: longitude,
                format: "jsonv2",
              },
            },
          );

          const result = response.data;
          const parts = result?.address || {};

          setAddress({
            street:
              [
                parts.house_number,
                parts.road || parts.residential || parts.pedestrian,
              ]
                .filter(Boolean)
                .join(" ") ||
              result?.display_name ||
              "",
            city:
              parts.city ||
              parts.town ||
              parts.village ||
              parts.municipality ||
              parts.county ||
              "",
            state: parts.state || "",
            pincode: parts.postcode || "",
            country: parts.country || "India",
          });

          setSavedAddress(false);
          setShowAddressForm(true);
          setMessage(
            "Location fetched. Please verify the address before saving.",
          );
        } catch {
          setError("Could not fetch the address. Please enter it manually.");
        } finally {
          setFetchingLocation(false);
        }
      },
      (geoError) => {
        setFetchingLocation(false);

        setError(
          geoError.code === 1
            ? "Location permission was denied. Please enter your address manually."
            : "Unable to get your location. Please enter your address manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      },
    );
  };

  const applyCoupon = async () => {
    setError("");
    setMessage("");

    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setError("Please enter a coupon code.");
      return;
    }

    if (subtotal <= 0) {
      setError("Your cart subtotal must be greater than zero.");
      return;
    }

    setCouponLoading(true);

    try {
      const response = await axios.post(
        `${API}/coupons/validate`,
        {
          code,
          subtotal,
        },
        authHeaders,
      );

      const data = response.data;

      if (!data?.success || !data?.coupon) {
        throw new Error(data?.message || "Coupon could not be applied.");
      }

      const discount = Number(data.discountAmount);

      if (!Number.isFinite(discount) || discount < 0) {
        throw new Error("The server returned an invalid coupon discount.");
      }

      setAppliedCoupon({
        ...data.coupon,
        discountAmount: Math.min(subtotal, discount),
      });

      setCouponInput(data.coupon.code || code);
      setMessage(data.message || "Coupon applied successfully.");
    } catch (err) {
      setAppliedCoupon(null);
      setError(getErrorMessage(err));
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setMessage("Coupon removed.");
    setError("");
  };

  const placeOrder = async () => {
    setError("");
    setMessage("");

    if (!getToken()) {
      navigate("/login");
      return;
    }

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    if (profileLoading) {
      setError("Please wait while your profile loads.");
      return;
    }

    if (!address.street.trim()) {
      setShowAddressForm(true);
    }

    if (!validateAddress()) {
      setShowAddressForm(true);
      return;
    }

    const saved = savedAddress || (await saveAddress());

    if (!saved) return;

    if (!user?.name) {
      setError(
        "Your profile name is missing. Please update your profile before placing the order.",
      );
      return;
    }

    if (!user?.phone && !user?.mobile) {
      setError(
        "Your profile phone number is missing. Please update your profile before placing the order.",
      );
      return;
    }

    const invalidItem = cart.find(
      (item) => !getFoodId(item) || Number(item.quantity) <= 0,
    );

    if (invalidItem) {
      setError(
        "One or more cart items are invalid. Please remove them and add the items again.",
      );
      return;
    }

    setLoading(true);

    let createdOrderId = null;

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          "Razorpay checkout could not be loaded. Please check your internet connection.",
        );
      }

      // Create the order. The backend must calculate prices and discounts
      // using database values; never trust frontend totals for payment.
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
        customerName: user.name,
        customerMobile: user.phone || user.mobile,
        paymentMethod: "razorpay",
        notes: notes.trim(),
        couponCode: appliedCoupon?.code || null,
        items: cart.map((item) => ({
          food: getFoodId(item),
          quantity: Number(item.quantity),
          servingType: "takeaway",
          specialInstructions: item.specialInstructions || "",
        })),
      };

      const orderResponse = await axios.post(
        `${API}/restaurant-orders`,
        orderData,
        authHeaders,
      );

      const order =
        orderResponse.data?.order ||
        orderResponse.data?.data?.order ||
        orderResponse.data?.data ||
        orderResponse.data;

      createdOrderId = order?._id || order?.id;

      if (!createdOrderId) {
        throw new Error(
          "Order was created without an order ID. Please check your orders before retrying.",
        );
      }

      // Razorpay amount is generated by the backend from the saved order total.
      const paymentResponse = await axios.post(
  `${API}/restaurant-payments/create-order`,
  { orderId: createdOrderId },
  authHeaders
);

const responseData = paymentResponse.data || {};
const paymentData = responseData.data || responseData;
const razorpayOrder = paymentData.order || {};

const razorpayOrderId =
  paymentData.razorpayOrderId ||
  razorpayOrder.id ||
  paymentData.id;

const amount = Number(
  paymentData.amount ?? razorpayOrder.amount
);

const currency =
  paymentData.currency ||
  razorpayOrder.currency ||
  "INR";

const key =
  paymentData.key ||
  paymentData.keyId ||
  paymentData.key_id;

if (!razorpayOrderId || !Number.isFinite(amount) || amount <= 0) {
  console.error("Unexpected payment API response:", paymentResponse.data);
  throw new Error(
    "Invalid Razorpay order details. Check the backend create-order response."
  );
}

if (!key) {
  console.error("Razorpay Key ID missing:", paymentResponse.data);
  throw new Error(
    "Razorpay Key ID missing. Check RAZORPAY_KEY_ID in backend .env."
  );
}

      const razorpayOptions = {
        key,
        amount,
        currency: paymentData?.currency || "INR",
        name: "Hotel & Restaurant",
        description: `Order ${createdOrderId}`,
        order_id: razorpayOrderId,

        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || user.mobile || "",
        },

        notes: {
          orderId: createdOrderId,
        },

        theme: {
          color: "#ea580c",
        },

        handler: async (paymentResult) => {
          try {
            setError("");
            setMessage("Verifying your payment...");

            await axios.post(
              `${API}/restaurant-payments/verify`,
              {
                orderId: createdOrderId,
                razorpay_order_id: paymentResult.razorpay_order_id,
                razorpay_payment_id: paymentResult.razorpay_payment_id,
                razorpay_signature: paymentResult.razorpay_signature,
              },
              authHeaders,
            );

            localStorage.removeItem("cart");

            // Notify any cart components listening for changes.
            window.dispatchEvent(new Event("cartUpdated"));

            navigate(
              `/order-success?orderId=${encodeURIComponent(createdOrderId)}`,
            );
          } catch (verifyError) {
            setError(
              `Payment was submitted, but verification did not complete: ${getErrorMessage(verifyError)}. Do not pay again until you check your order status.`,
            );
            setMessage("");
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setMessage(
              "Payment window closed. Your order may still be pending payment; check your orders before retrying.",
            );
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);

      razorpay.on("payment.failed", (response) => {
        setLoading(false);
        setError(
          response?.error?.description ||
            "Payment failed. Please check your order status before trying again.",
        );
      });

      razorpay.open();
    } catch (err) {
      setError(getErrorMessage(err));

      if (createdOrderId) {
        setMessage(
          `Order ID: ${createdOrderId}. If payment was not completed, check this order before creating another one.`,
        );
      }
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="mb-8 text-gray-600">
          Confirm your delivery address, apply a coupon, and complete your
          payment.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {!cart.length ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h2 className="mb-2 text-xl font-semibold">Your cart is empty</h2>
            <p className="mb-5 text-gray-600">
              Add some delicious food before checking out.
            </p>
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Delivery Address</h2>

                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(true);
                        setError("");
                        setMessage("");
                      }}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Change
                    </button>
                  )}
                </div>

                {!showAddressForm && savedAddress ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="font-medium text-gray-900">
                      {user?.name || "Customer"}
                    </p>
                    <p className="mt-1 text-gray-600">
                      {address.street}, {address.city}, {address.state},{" "}
                      {address.pincode}, {address.country}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      Phone: {user?.phone || user?.mobile || "Not provided"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={fetchingLocation}
                      className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60"
                    >
                      {fetchingLocation
                        ? "Fetching location..."
                        : "Use Current Location"}
                    </button>

                    <div>
                      <label
                        htmlFor="street"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        House / Street Address
                      </label>
                      <input
                        id="street"
                        name="street"
                        value={address.street}
                        onChange={updateAddress}
                        autoComplete="street-address"
                        placeholder="House number, street, area"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="city"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          City
                        </label>
                        <input
                          id="city"
                          name="city"
                          value={address.city}
                          onChange={updateAddress}
                          autoComplete="address-level2"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="state"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          State
                        </label>
                        <input
                          id="state"
                          name="state"
                          value={address.state}
                          onChange={updateAddress}
                          autoComplete="address-level1"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pincode"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          PIN Code
                        </label>
                        <input
                          id="pincode"
                          name="pincode"
                          value={address.pincode}
                          onChange={updateAddress}
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="postal-code"
                          placeholder="6-digit PIN code"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="country"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Country
                        </label>
                        <input
                          id="country"
                          name="country"
                          value={address.country}
                          onChange={updateAddress}
                          autoComplete="country-name"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveAddress}
                        disabled={savingAddress}
                        className="rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                      >
                        {savingAddress ? "Saving..." : "Save Address"}
                      </button>

                      {savedAddress && (
                        <button
                          type="button"
                          onClick={() => setShowAddressForm(false)}
                          className="rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  Order Items ({cart.length})
                </h2>

                <div className="divide-y divide-gray-100">
                  {cart.map((item, index) => {
                    const itemPrice = Number(
                      item.price ||
                        item.food?.price ||
                        item.foodItem?.price ||
                        0,
                    );
                    const quantity = Number(item.quantity || 0);
                    const itemName =
                      item.name ||
                      item.food?.name ||
                      item.foodItem?.name ||
                      "Food item";

                    return (
                      <div
                        key={getFoodId(item) || index}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">
                            {itemName}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {money(itemPrice)} × {quantity}
                          </p>
                        </div>

                        <p className="shrink-0 font-semibold text-gray-900">
                          {money(itemPrice * quantity)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="notes"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Order Instructions (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Any special instructions for your order..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500"
                  />
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-xl bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <h2 className="mb-5 text-xl font-semibold">Order Summary</h2>

              <div className="mb-5">
                <label
                  htmlFor="coupon"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Coupon Code
                </label>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-green-800">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-sm text-green-700">
                        Discount: {money(discountAmount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="shrink-0 text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="coupon"
                      type="text"
                      value={couponInput}
                      onChange={(event) =>
                        setCouponInput(event.target.value.toUpperCase())
                      }
                      placeholder="Enter coupon"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                    />

                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      className="rounded-lg border border-orange-500 px-3 py-2 font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-60"
                    >
                      {couponLoading ? "Applying..." : "Apply"}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-b border-gray-200 pb-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{money(subtotal)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-green-700">
                    − {money(discountAmount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Tax (18%)</span>
                  <span className="font-medium">{money(taxAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between gap-4 py-4 text-lg font-bold">
                <span>Total</span>
                <span>{money(totalAmount)}</span>
              </div>

              <p className="mb-4 text-xs leading-5 text-gray-500">
                Final amount is calculated by the server using saved menu prices
                and the validated coupon.
              </p>

              <button
                type="button"
                onClick={placeOrder}
                disabled={loading || couponLoading || !cart.length}
                className="w-full rounded-lg bg-orange-600 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : `Pay ${money(totalAmount)}`}
              </button>

              <p className="mt-3 text-center text-xs text-gray-500">
                Secure payment powered by Razorpay
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
