import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/menu";

function AdminMenu() {
    const [categories, setCategories] = useState([]);
    const [foods, setFoods] = useState([]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
        sortOrder: 0,
    });

    const [foodForm, setFoodForm] = useState({
        name: "",
        description: "",
        category: "",
        price: "",
        discountPrice: "",
        image: "",
        foodType: "veg",
        preparationTime: 15,
        stock: 0,
        isFeatured: false,
    });

    const token = localStorage.getItem("token");

    const authConfig = {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    };

    // ==============================
    // LOAD DATA
    // ==============================

    const loadData = async () => {
        try {
            setLoading(true);

            const categoryRes = await axios.get(
                `${API}/categories`
            );

            const foodRes = await axios.get(
                `${API}/foods`
            );

            setCategories(categoryRes.data.categories || []);
            setFoods(foodRes.data.foodItems || []);

        } catch (error) {
            console.error(error);
            setMessage("Unable to load menu data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ==============================
    // CATEGORY FORM
    // ==============================

    const handleCategoryChange = (e) => {
        setCategoryForm({
            ...categoryForm,
            [e.target.name]: e.target.value,
        });
    };

    const createCategory = async (e) => {
        e.preventDefault();

        try {
            await axios.post(
                `${API}/categories`,
                categoryForm,
                authConfig
            );

            setMessage("Category created successfully");

            setCategoryForm({
                name: "",
                description: "",
                sortOrder: 0,
            });

            loadData();

        } catch (error) {
            console.error(error);

            setMessage(
                error.response?.data?.message ||
                "Failed to create category"
            );
        }
    };

    // ==============================
    // FOOD FORM
    // ==============================

    const handleFoodChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFoodForm({
            ...foodForm,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        });
    };

    const createFood = async (e) => {
        e.preventDefault();

        try {
            await axios.post(
                `${API}/foods`,
                {
                    ...foodForm,
                    price: Number(foodForm.price),
                    discountPrice:
                        foodForm.discountPrice === ""
                            ? null
                            : Number(foodForm.discountPrice),
                    preparationTime:
                        Number(foodForm.preparationTime),
                    stock: Number(foodForm.stock),
                },
                authConfig
            );

            setMessage("Food item created successfully");

            setFoodForm({
                name: "",
                description: "",
                category: "",
                price: "",
                discountPrice: "",
                image: "",
                foodType: "veg",
                preparationTime: 15,
                stock: 0,
                isFeatured: false,
            });

            loadData();

        } catch (error) {
            console.error(error);

            setMessage(
                error.response?.data?.message ||
                "Failed to create food item"
            );
        }
    };

    // ==============================
    // DELETE CATEGORY
    // ==============================

    const deleteCategory = async (id) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this category?"
            )
        ) {
            return;
        }

        try {
            await axios.delete(
                `${API}/categories/${id}`,
                authConfig
            );

            setMessage("Category deleted successfully");

            loadData();

        } catch (error) {
            console.error(error);

            setMessage(
                error.response?.data?.message ||
                "Cannot delete category"
            );
        }
    };

    // ==============================
    // DELETE FOOD
    // ==============================

    const deleteFood = async (id) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this food item?"
            )
        ) {
            return;
        }

        try {
            await axios.delete(
                `${API}/foods/${id}`,
                authConfig
            );

            setMessage("Food deleted successfully");

            loadData();

        } catch (error) {
            console.error(error);

            setMessage(
                error.response?.data?.message ||
                "Failed to delete food"
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}

                <div className="bg-gray-900 text-white p-5 rounded-xl mb-6">

                    <h1 className="text-3xl font-bold">
                        Admin Menu Management
                    </h1>

                    <p className="text-gray-300 mt-1">
                        Manage restaurant categories and food items
                    </p>

                </div>

                {/* MESSAGE */}

                {message && (
                    <div className="bg-blue-100 border border-blue-300 text-blue-800 p-3 rounded-lg mb-6">
                        {message}
                    </div>
                )}

                {/* ==============================
                    CATEGORY SECTION
                ============================== */}

                <div className="grid md:grid-cols-2 gap-6">

                    {/* CREATE CATEGORY */}

                    <div className="bg-white p-6 rounded-xl shadow">

                        <h2 className="text-xl font-bold mb-4">
                            Add Category
                        </h2>

                        <form
                            onSubmit={createCategory}
                            className="space-y-4"
                        >

                            <input
                                type="text"
                                name="name"
                                placeholder="Category name"
                                value={categoryForm.name}
                                onChange={handleCategoryChange}
                                required
                                className="w-full border p-3 rounded"
                            />

                            <textarea
                                name="description"
                                placeholder="Description"
                                value={categoryForm.description}
                                onChange={handleCategoryChange}
                                className="w-full border p-3 rounded"
                            />

                            <input
                                type="number"
                                name="sortOrder"
                                placeholder="Sort order"
                                value={categoryForm.sortOrder}
                                onChange={handleCategoryChange}
                                className="w-full border p-3 rounded"
                            />

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                            >
                                Add Category
                            </button>

                        </form>

                    </div>

                    {/* CATEGORY LIST */}

                    <div className="bg-white p-6 rounded-xl shadow">

                        <h2 className="text-xl font-bold mb-4">
                            Categories
                        </h2>

                        {categories.length === 0 ? (
                            <p>No categories found.</p>
                        ) : (
                            <div className="space-y-3">

                                {categories.map((category) => (

                                    <div
                                        key={category._id}
                                        className="flex justify-between items-center border p-3 rounded-lg"
                                    >

                                        <div>
                                            <h3 className="font-bold">
                                                {category.name}
                                            </h3>

                                            <p className="text-sm text-gray-500">
                                                {category.description}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() =>
                                                deleteCategory(
                                                    category._id
                                                )
                                            }
                                            className="bg-red-500 text-white px-3 py-2 rounded"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                ))}

                            </div>
                        )}

                    </div>

                </div>

                {/* ==============================
                    FOOD SECTION
                ============================== */}

                <div className="grid md:grid-cols-2 gap-6 mt-6">

                    {/* CREATE FOOD */}

                    <div className="bg-white p-6 rounded-xl shadow">

                        <h2 className="text-xl font-bold mb-4">
                            Add Food Item
                        </h2>

                        <form
                            onSubmit={createFood}
                            className="space-y-4"
                        >

                            <input
                                type="text"
                                name="name"
                                placeholder="Food name"
                                value={foodForm.name}
                                onChange={handleFoodChange}
                                required
                                className="w-full border p-3 rounded"
                            />

                            <textarea
                                name="description"
                                placeholder="Food description"
                                value={foodForm.description}
                                onChange={handleFoodChange}
                                className="w-full border p-3 rounded"
                            />

                            <select
                                name="category"
                                value={foodForm.category}
                                onChange={handleFoodChange}
                                required
                                className="w-full border p-3 rounded"
                            >

                                <option value="">
                                    Select Category
                                </option>

                                {categories.map((category) => (

                                    <option
                                        key={category._id}
                                        value={category._id}
                                    >
                                        {category.name}
                                    </option>

                                ))}

                            </select>

                            <input
                                type="number"
                                name="price"
                                placeholder="Price"
                                value={foodForm.price}
                                onChange={handleFoodChange}
                                required
                                className="w-full border p-3 rounded"
                            />

                            <input
                                type="number"
                                name="discountPrice"
                                placeholder="Discount Price"
                                value={foodForm.discountPrice}
                                onChange={handleFoodChange}
                                className="w-full border p-3 rounded"
                            />

                            <input
                                type="text"
                                name="image"
                                placeholder="Image URL"
                                value={foodForm.image}
                                onChange={handleFoodChange}
                                className="w-full border p-3 rounded"
                            />

                            <select
                                name="foodType"
                                value={foodForm.foodType}
                                onChange={handleFoodChange}
                                className="w-full border p-3 rounded"
                            >

                                <option value="veg">
                                    Veg
                                </option>

                                <option value="non-veg">
                                    Non-Veg
                                </option>

                                <option value="vegan">
                                    Vegan
                                </option>

                            </select>

                            <input
                                type="number"
                                name="preparationTime"
                                placeholder="Preparation time"
                                value={foodForm.preparationTime}
                                onChange={handleFoodChange}
                                className="w-full border p-3 rounded"
                            />

                            <input
                                type="number"
                                name="stock"
                                placeholder="Stock"
                                value={foodForm.stock}
                                onChange={handleFoodChange}
                                className="w-full border p-3 rounded"
                            />

                            <label className="flex items-center gap-2">

                                <input
                                    type="checkbox"
                                    name="isFeatured"
                                    checked={foodForm.isFeatured}
                                    onChange={handleFoodChange}
                                />

                                Featured Food

                            </label>

                            <button
                                type="submit"
                                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
                            >
                                Add Food Item
                            </button>

                        </form>

                    </div>

                    {/* FOOD LIST */}

                    <div className="bg-white p-6 rounded-xl shadow">

                        <h2 className="text-xl font-bold mb-4">
                            Food Items
                        </h2>

                        {loading ? (
                            <p>Loading...</p>
                        ) : foods.length === 0 ? (
                            <p>No food items found.</p>
                        ) : (

                            <div className="space-y-4">

                                {foods.map((food) => (

                                    <div
                                        key={food._id}
                                        className="border rounded-xl p-4"
                                    >

                                        <div className="flex justify-between gap-4">

                                            <div>

                                                <h3 className="text-lg font-bold">
                                                    {food.name}
                                                </h3>

                                                <p className="text-gray-500">
                                                    {food.description}
                                                </p>

                                                <p className="mt-2">

                                                    <span className="font-bold">
                                                        ₹{food.discountPrice || food.price}
                                                    </span>

                                                    {food.discountPrice && (
                                                        <span className="line-through text-gray-400 ml-2">
                                                            ₹{food.price}
                                                        </span>
                                                    )}

                                                </p>

                                                <p className="text-sm mt-1">
                                                    Type: {food.foodType}
                                                </p>

                                                <p className="text-sm">
                                                    Stock: {food.stock}
                                                </p>

                                            </div>

                                            {food.image && (
                                                <img
                                                    src={food.image}
                                                    alt={food.name}
                                                    className="w-24 h-24 object-cover rounded-lg"
                                                />
                                            )}

                                        </div>

                                        <button
                                            onClick={() =>
                                                deleteFood(food._id)
                                            }
                                            className="mt-3 bg-red-500 text-white px-4 py-2 rounded"
                                        >
                                            Delete Food
                                        </button>

                                    </div>

                                ))}

                            </div>

                        )}

                    </div>

                </div>

            </div>

        </div>
    );
}

export default AdminMenu;