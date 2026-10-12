import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const Checkout = () => {
    const [cart, setCart] = useState([]);

    const [form, setForm] = useState({
        orderType: "dine-in",
        tableNumber: "",
        deliveryAddress: "",
        paymentMethod: "cash",
        notes: "",
    });

    const [loading, setLoading] = useState(false);

    // =====================================================
    // LOAD CART
    // =====================================================

    useEffect(() => {
        const data =
            JSON.parse(
                localStorage.getItem("cart")
            ) || [];

        console.log("CART:", data);

        setCart(data);
    }, []);

    // =====================================================
    // CALCULATE
    // =====================================================

    const subtotal = cart.reduce(
        (total, item) =>
            total +
            Number(item.price || 0) *
                Number(item.quantity || 0),
        0
    );

    const tax =
        Math.round(
            subtotal * 0.18 * 100
        ) / 100;

    const total = subtotal + tax;

    // =====================================================
    // HANDLE CHANGE
    // =====================================================

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]:
                e.target.value,
        });
    };

    // =====================================================
    // PLACE ORDER
    // =====================================================

    const placeOrder = async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            alert("Cart is empty");
            return;
        }

        // =================================================
        // CHECK FOOD IDs
        // =================================================

        for (const item of cart) {
            const foodId =
                item.foodItem ||
                item.food ||
                item._id ||
                item.id;

            if (!foodId) {
                console.error(
                    "Invalid cart item:",
                    item
                );

                alert(
                    "Food item ID is missing from cart. Please remove this item and add it again."
                );

                return;
            }
        }

        // =================================================
        // DINE IN VALIDATION
        // =================================================

        if (
            form.orderType ===
                "dine-in" &&
            !form.tableNumber.trim()
        ) {
            alert(
                "Please enter table number"
            );

            return;
        }

        // =================================================
        // DELIVERY VALIDATION
        // =================================================

        if (
            form.orderType ===
                "delivery" &&
            !form.deliveryAddress.trim()
        ) {
            alert(
                "Please enter delivery address"
            );

            return;
        }

        try {
            setLoading(true);

            const token =
                localStorage.getItem(
                    "token"
                ) ||
                localStorage.getItem(
                    "accessToken"
                );

            if (!token) {
                alert(
                    "Please login first"
                );

                return;
            }

            // =================================================
            // PREPARE ITEMS
            // =================================================

            const orderItems =
                cart.map((item) => {
                    const foodId =
                        item.foodItem ||
                        item.food ||
                        item._id ||
                        item.id;

                    return {
                        food: foodId,

                        quantity:
                            Number(
                                item.quantity
                            ),
                    };
                });

            // =================================================
            // REQUEST DATA
            // =================================================

            const orderData = {
                items: orderItems,

                orderType:
                    form.orderType,

                tableNumber:
                    form.orderType ===
                    "dine-in"
                        ? form.tableNumber.trim()
                        : null,

                deliveryAddress:
                    form.orderType ===
                    "delivery"
                        ? form.deliveryAddress.trim()
                        : "",

                paymentMethod:
                    form.paymentMethod,

                notes:
                    form.notes.trim(),
            };

            console.log(
                "ORDER DATA:",
                orderData
            );

            // =================================================
            // API
            // =================================================

            const response =
                await axios.post(
                    `${API}/restaurant-orders`,
                    orderData,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                        },
                    }
                );

            console.log(
                "ORDER RESPONSE:",
                response.data
            );

            // =================================================
            // SUCCESS
            // =================================================

            if (
                response.data.success
            ) {
                localStorage.removeItem(
                    "cart"
                );

                alert(
                    `Order placed successfully!\n\nOrder Number: ${response.data.order.orderNumber}`
                );

                window.location.href =
                    "/my-orders";
            }
        } catch (error) {
            console.error(
                "Place Order Error:",
                error
            );

            console.error(
                "Backend Response:",
                error.response?.data
            );

            alert(
                error.response?.data
                    ?.message ||
                    "Unable to place order"
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-4xl font-bold mb-8">
                Checkout
            </h1>

            <form
                onSubmit={placeOrder}
                className="grid lg:grid-cols-3 gap-8"
            >
                {/* =================================================
                    CHECKOUT FORM
                ================================================= */}

                <div className="lg:col-span-2 bg-white border rounded-xl p-6">
                    <h2 className="text-2xl font-bold mb-6">
                        Order Details
                    </h2>

                    {/* ORDER TYPE */}

                    <label className="block font-semibold mb-2">
                        Order Type
                    </label>

                    <select
                        name="orderType"
                        value={
                            form.orderType
                        }
                        onChange={
                            handleChange
                        }
                        className="w-full border rounded-lg p-3 mb-5"
                    >
                        <option value="dine-in">
                            Dine In
                        </option>

                        <option value="takeaway">
                            Takeaway
                        </option>

                        <option value="delivery">
                            Delivery
                        </option>
                    </select>

                    {/* TABLE */}

                    {form.orderType ===
                        "dine-in" && (
                        <>
                            <label className="block font-semibold mb-2">
                                Table Number
                            </label>

                            <input
                                type="text"
                                name="tableNumber"
                                value={
                                    form.tableNumber
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Example: T02"
                                className="w-full border rounded-lg p-3 mb-5"
                            />
                        </>
                    )}

                    {/* DELIVERY */}

                    {form.orderType ===
                        "delivery" && (
                        <>
                            <label className="block font-semibold mb-2">
                                Delivery Address
                            </label>

                            <textarea
                                name="deliveryAddress"
                                value={
                                    form.deliveryAddress
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter delivery address"
                                rows="4"
                                className="w-full border rounded-lg p-3 mb-5"
                            />
                        </>
                    )}

                    {/* PAYMENT */}

                    <label className="block font-semibold mb-2">
                        Payment Method
                    </label>

                    <select
                        name="paymentMethod"
                        value={
                            form.paymentMethod
                        }
                        onChange={
                            handleChange
                        }
                        className="w-full border rounded-lg p-3 mb-5"
                    >
                        <option value="cash">
                            Cash
                        </option>

                        <option value="upi">
                            UPI
                        </option>

                        <option value="card">
                            Card
                        </option>

                        <option value="razorpay">
                            Razorpay
                        </option>
                    </select>

                    {/* NOTES */}

                    <label className="block font-semibold mb-2">
                        Special Instructions
                    </label>

                    <textarea
                        name="notes"
                        value={
                            form.notes
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="Example: Less spicy"
                        rows="3"
                        className="w-full border rounded-lg p-3"
                    />
                </div>

                {/* =================================================
                    SUMMARY
                ================================================= */}

                <div className="bg-gray-50 border rounded-xl p-6 h-fit">
                    <h2 className="text-2xl font-bold mb-5">
                        Summary
                    </h2>

                    {cart.map(
                        (
                            item,
                            index
                        ) => (
                            <div
                                key={
                                    item.foodItem ||
                                    item.food ||
                                    item._id ||
                                    index
                                }
                                className="flex justify-between mb-3"
                            >
                                <span>
                                    {
                                        item.name
                                    }{" "}
                                    ×{" "}
                                    {
                                        item.quantity
                                    }
                                </span>

                                <span>
                                    ₹
                                    {Number(
                                        item.price ||
                                            0
                                    ) *
                                        Number(
                                            item.quantity ||
                                                0
                                        )}
                                </span>
                            </div>
                        )
                    )}

                    <hr className="my-4" />

                    <div className="flex justify-between">
                        <span>
                            Subtotal
                        </span>

                        <span>
                            ₹
                            {subtotal.toFixed(
                                2
                            )}
                        </span>
                    </div>

                    <div className="flex justify-between mt-2">
                        <span>
                            Tax (18%)
                        </span>

                        <span>
                            ₹
                            {tax.toFixed(
                                2
                            )}
                        </span>
                    </div>

                    <div className="flex justify-between text-xl font-bold mt-5">
                        <span>
                            Total
                        </span>

                        <span>
                            ₹
                            {total.toFixed(
                                2
                            )}
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={
                            loading
                        }
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 rounded-lg mt-6"
                    >
                        {loading
                            ? "Placing Order..."
                            : "Place Order"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Checkout;