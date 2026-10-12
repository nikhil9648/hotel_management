import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api/menu";

function Menu() {
    const [categories, setCategories] = useState([]);
    const [foods, setFoods] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            setLoading(true);
            setError("");

            const [categoryResponse, foodResponse] =
                await Promise.all([
                    axios.get(`${API_URL}/categories`),
                    axios.get(`${API_URL}/foods`),
                ]);

            setCategories(
                categoryResponse.data.categories || []
            );

            setFoods(
                foodResponse.data.foodItems || []
            );

        } catch (error) {
            console.error("Menu Error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to load menu"
            );
        } finally {
            setLoading(false);
        }
    };

    const filteredFoods =
        selectedCategory === "all"
            ? foods
            : foods.filter(
                  (food) =>
                      food.category?._id ===
                      selectedCategory
              );

    const addToCart = (food) => {
        try {
            const existingCart =
                JSON.parse(
                    localStorage.getItem("cart")
                ) || [];

            const existingItem =
                existingCart.find(
                    (item) =>
                        item._id === food._id
                );

            let updatedCart;

            if (existingItem) {
                updatedCart =
                    existingCart.map((item) =>
                        item._id === food._id
                            ? {
                                  ...item,
                                  quantity:
                                      item.quantity + 1,
                              }
                            : item
                    );
            } else {
                updatedCart = [
                    ...existingCart,
                    {
                        ...food,
                        quantity: 1,
                    },
                ];
            }

            localStorage.setItem(
                "cart",
                JSON.stringify(updatedCart)
            );

            alert(`${food.name} added to cart`);

        } catch (error) {
            console.error(
                "Add To Cart Error:",
                error
            );
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold">
                    Loading Menu...
                </h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">

            {/* HEADER */}

            <div className="flex justify-between items-center mb-8">

                <div>
                    <h1 className="text-4xl font-bold">
                        🍽️ Our Menu
                    </h1>

                    <p className="text-gray-600 mt-2">
                        Delicious food from our restaurant
                    </p>
                </div>

                <Link
                    to="/cart"
                    className="bg-orange-600 text-white px-5 py-3 rounded-lg font-semibold"
                >
                    🛒 View Cart
                </Link>

            </div>


            {/* ERROR */}

            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}


            {/* CATEGORIES */}

            <div className="flex gap-3 flex-wrap mb-8">

                <button
                    onClick={() =>
                        setSelectedCategory("all")
                    }
                    className={`px-5 py-2 rounded-lg font-semibold ${
                        selectedCategory === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700"
                    }`}
                >
                    All
                </button>

                {categories.map((category) => (
                    <button
                        key={category._id}
                        onClick={() =>
                            setSelectedCategory(
                                category._id
                            )
                        }
                        className={`px-5 py-2 rounded-lg font-semibold ${
                            selectedCategory ===
                            category._id
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700"
                        }`}
                    >
                        {category.name}
                    </button>
                ))}

            </div>


            {/* FOOD ITEMS */}

            {filteredFoods.length === 0 ? (
                <div className="bg-white p-10 rounded-xl text-center">
                    <h2 className="text-xl font-semibold">
                        No food items available
                    </h2>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                    {filteredFoods.map((food) => {

                        const finalPrice =
                            food.discountPrice !== null &&
                            food.discountPrice !== undefined
                                ? food.discountPrice
                                : food.price;

                        return (
                            <div
                                key={food._id}
                                className="bg-white rounded-xl shadow-md overflow-hidden"
                            >

                                {/* IMAGE */}

                                <div className="h-48 bg-gray-200">

                                    {food.image ? (
                                        <img
                                            src={food.image}
                                            alt={food.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-6xl">
                                            🍽️
                                        </div>
                                    )}

                                </div>


                                {/* DETAILS */}

                                <div className="p-5">

                                    <div className="flex justify-between items-start">

                                        <h2 className="text-xl font-bold">
                                            {food.name}
                                        </h2>

                                        <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                                            {food.foodType}
                                        </span>

                                    </div>


                                    <p className="text-gray-500 text-sm mt-2">
                                        {food.description}
                                    </p>


                                    <p className="text-sm text-gray-500 mt-2">
                                        Category:{" "}
                                        {food.category?.name ||
                                            "General"}
                                    </p>


                                    <p className="text-sm text-gray-500">
                                        ⏱️{" "}
                                        {food.preparationTime}{" "}
                                        min
                                    </p>


                                    {/* PRICE */}

                                    <div className="mt-4">

                                        {food.discountPrice !==
                                            null &&
                                        food.discountPrice !==
                                            undefined ? (
                                            <div>

                                                <span className="text-gray-400 line-through mr-2">
                                                    ₹
                                                    {food.price}
                                                </span>

                                                <span className="text-2xl font-bold text-green-600">
                                                    ₹
                                                    {finalPrice}
                                                </span>

                                            </div>
                                        ) : (
                                            <span className="text-2xl font-bold">
                                                ₹
                                                {food.price}
                                            </span>
                                        )}

                                    </div>


                                    {/* ADD CART */}

                                    <button
                                        onClick={() =>
                                            addToCart(
                                                food
                                            )
                                        }
                                        disabled={
                                            food.isAvailable ===
                                            false
                                        }
                                        className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
                                    >
                                        {food.isAvailable ===
                                        false
                                            ? "Unavailable"
                                            : "🛒 Add to Cart"}
                                    </button>

                                </div>

                            </div>
                        );
                    })}

                </div>
            )}

        </div>
    );
}

export default Menu;