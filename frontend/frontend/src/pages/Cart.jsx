import React, { useEffect, useState } from "react";

const Cart = () => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const data =
      JSON.parse(localStorage.getItem("cart")) || [];

    setCart(data);
  };

  const updateQuantity = (index, quantity) => {
    if (quantity < 1) return;

    const updated = [...cart];

    updated[index].quantity = quantity;

    setCart(updated);

    localStorage.setItem(
      "cart",
      JSON.stringify(updated)
    );
  };

  const removeItem = (index) => {
    const updated = cart.filter(
      (_, i) => i !== index
    );

    setCart(updated);

    localStorage.setItem(
      "cart",
      JSON.stringify(updated)
    );
  };

  const subtotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const tax = Math.round(subtotal * 0.05);

  const total = subtotal + tax;

  if (cart.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-10 text-center">

        <div className="text-7xl mb-5">
          🛒
        </div>

        <h1 className="text-3xl font-bold">
          Your Cart is Empty
        </h1>

        <p className="text-gray-500 mt-2">
          Add some delicious food to continue.
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

      <h1 className="text-4xl font-bold mb-8">
        Your Cart
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* Cart Items */}

        <div className="lg:col-span-2 space-y-4">

          {cart.map((item, index) => (

            <div
              key={item.foodItem}
              className="bg-white border rounded-xl p-4 flex gap-5 items-center"
            >

              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">

                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-3xl">
                    🍽️
                  </div>
                )}

              </div>

              <div className="flex-1">

                <h2 className="font-bold text-lg">
                  {item.name}
                </h2>

                <p className="text-gray-600">
                  ₹{item.price}
                </p>

                <div className="flex items-center gap-3 mt-3">

                  <button
                    onClick={() =>
                      updateQuantity(
                        index,
                        item.quantity - 1
                      )
                    }
                    className="w-8 h-8 bg-gray-200 rounded"
                  >
                    -
                  </button>

                  <span className="font-bold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      updateQuantity(
                        index,
                        item.quantity + 1
                      )
                    }
                    className="w-8 h-8 bg-gray-200 rounded"
                  >
                    +
                  </button>

                </div>

              </div>

              <div className="text-right">

                <p className="font-bold">
                  ₹{item.price * item.quantity}
                </p>

                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 mt-3"
                >
                  Remove
                </button>

              </div>

            </div>

          ))}

        </div>

        {/* Summary */}

        <div className="bg-gray-50 border rounded-xl p-6 h-fit">

          <h2 className="text-2xl font-bold mb-6">
            Order Summary
          </h2>

          <div className="flex justify-between mb-3">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="flex justify-between mb-3">
            <span>Tax (5%)</span>
            <span>₹{tax}</span>
          </div>

          <hr className="my-4" />

          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

          <a
            href="/checkout"
            className="block text-center bg-orange-500 text-white py-3 rounded-lg mt-6"
          >
            Proceed to Checkout
          </a>

        </div>

      </div>

    </div>
  );
};

export default Cart;