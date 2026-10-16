
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/menu";
const BACKEND_URL = "http://localhost:5000";

const emptyFoodForm = {
    name: "",
    category: "",
    price: "",
    discountPrice: "",
    image: "",
    foodType: "veg",
    isFeatured: false,
    isAvailable: true,
};

const getAuthConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
});

const getImageUrl = (image) => {
    if (!image) return "";

    // If the API returns an object, inspect it in the console.
    if (typeof image !== "string") {
        console.error("Unexpected image format:", image);
        return "";
    }

    const value = image.trim();
    if (!value) return "";

    // Full URL, including localhost or an external image URL.
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    // If the API returns only the filename.
    if (!value.includes("/")) {
        return `${BACKEND_URL}/uploads/food-images/${encodeURIComponent(value)}`;
    }

    // If the API returns /uploads/food-images/example.jpg.
    return `${BACKEND_URL}${value.startsWith("/") ? "" : "/"}${value}`;
};

const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(price) || 0);

export default function AdminMenu() {
    const [categories, setCategories] = useState([]);
    const [foodItems, setFoodItems] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categorySaving, setCategorySaving] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");

    const [form, setForm] = useState(emptyFoodForm);
    const [editingId, setEditingId] = useState(null);

    const [imageMode, setImageMode] = useState("upload");
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState("");

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [availabilityFilter, setAvailabilityFilter] = useState("all");

    // LOAD CATEGORIES AND FOOD ITEMS
    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [categoryResponse, foodResponse] = await Promise.all([
                axios.get(`${API}/categories`),
                axios.get(`${API}/foods`),
            ]);

            const loadedCategories =
                categoryResponse.data.categories || [];

            const loadedFoodItems =
                foodResponse.data.foodItems || [];

            // Debug the exact image value returned by the backend.
            console.table(
                loadedFoodItems.map((food) => ({
                    name: food.name,
                    image: food.image,
                    resolvedURL: getImageUrl(food.image),
                }))
            );

            setCategories(loadedCategories);
            setFoodItems(loadedFoodItems);
        } catch (err) {
            console.error("Menu loading error:", err);

            setError(
                err.response?.data?.message ||
                    "Unable to load menu. Check your backend server."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // FORM HELPERS
    const updateForm = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const resetFoodForm = () => {
        setForm({ ...emptyFoodForm });
        setEditingId(null);
        setSelectedFile(null);
        setImageMode("upload");
        setFilePreview("");

        const input = document.getElementById("food-image-file");
        if (input) input.value = "";
    };

    // CATEGORY MANAGEMENT
    const handleAddCategory = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        const name = categoryName.trim();
        const description = categoryDescription.trim();

        if (!name) {
            setError("Enter a category name.");
            return;
        }

        setCategorySaving(true);

        try {
            const response = await axios.post(
                `${API}/categories`,
                { name, description },
                getAuthConfig()
            );

            const category =
                response.data.category || response.data;

            setCategories((previous) => [
                category,
                ...previous.filter((item) => item._id !== category._id),
            ]);

            setCategoryName("");
            setCategoryDescription("");
            setMessage("Category added successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to add category."
            );
        } finally {
            setCategorySaving(false);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (
            !window.confirm(
                "Delete this category? Categories containing food items may not be deleted."
            )
        ) {
            return;
        }

        setError("");
        setMessage("");

        try {
            await axios.delete(
                `${API}/categories/${categoryId}`,
                getAuthConfig()
            );

            setCategories((previous) =>
                previous.filter((item) => item._id !== categoryId)
            );

            if (form.category === categoryId) {
                updateForm("category", "");
            }

            setMessage("Category deleted successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to delete category."
            );
        }
    };

    // IMAGE FILE SELECTION AND PREVIEW
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        setError("");
        setMessage("");

        if (!file) {
            setSelectedFile(null);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (!allowedTypes.includes(file.type)) {
            setSelectedFile(null);
            event.target.value = "";
            setError("Choose a JPG, PNG, WebP, or GIF image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSelectedFile(null);
            event.target.value = "";
            setError("Image size must not exceed 5 MB.");
            return;
        }

        setSelectedFile(file);
    };

    useEffect(() => {
        if (!selectedFile) {
            setFilePreview("");
            return undefined;
        }

        const objectURL = URL.createObjectURL(selectedFile);
        setFilePreview(objectURL);

        return () => URL.revokeObjectURL(objectURL);
    }, [selectedFile]);

    const previewImage =
        imageMode === "url"
            ? form.image
            : filePreview || getImageUrl(form.image);

    // UPLOAD IMAGE OR USE PROVIDED URL
    const uploadImage = async () => {
        if (imageMode === "url") {
            const url = form.image.trim();

            if (!url) return "";

            try {
                const parsedURL = new URL(url);

                if (!["http:", "https:"].includes(parsedURL.protocol)) {
                    throw new Error("Invalid URL");
                }
            } catch {
                throw new Error(
                    "Enter a valid image URL starting with http:// or https://."
                );
            }

            return url;
        }

        // Keep the existing image when editing without a new file.
        if (!selectedFile) {
            return form.image;
        }

        const formData = new FormData();
        formData.append("image", selectedFile);

        setUploading(true);

        try {
            const response = await axios.post(
                `${API}/upload-image`,
                formData,
                getAuthConfig()
            );

            if (!response.data.imageUrl) {
                throw new Error(
                    "The upload API did not return imageUrl."
                );
            }

            return response.data.imageUrl;
        } finally {
            setUploading(false);
        }
    };

    // ADD OR UPDATE FOOD ITEM
    const handleSaveFood = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!form.name.trim()) {
            setError("Enter the food name.");
            return;
        }

        if (!form.category) {
            setError("Select a category.");
            return;
        }

        const price = Number(form.price);

        if (
            form.price.trim() === "" ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            setError("Enter a valid non-negative price.");
            return;
        }

        let discountPrice = null;

        if (form.discountPrice.trim() !== "") {
            discountPrice = Number(form.discountPrice);

            if (
                !Number.isFinite(discountPrice) ||
                discountPrice < 0 ||
                discountPrice >= price
            ) {
                setError(
                    "Discount price must be lower than the original price."
                );
                return;
            }
        }

        setSaving(true);

        try {
            const image = await uploadImage();

            const payload = {
                name: form.name.trim(),
                category: form.category,
                price,
                discountPrice,
                image: image || null,
                foodType: form.foodType,
                isFeatured: Boolean(form.isFeatured),
                isAvailable: Boolean(form.isAvailable),
            };

            if (editingId) {
                await axios.put(
                    `${API}/foods/${editingId}`,
                    payload,
                    getAuthConfig()
                );

                setMessage("Food item updated successfully.");
            } else {
                await axios.post(
                    `${API}/foods`,
                    payload,
                    getAuthConfig()
                );

                setMessage("Food item added successfully.");
            }

            resetFoodForm();
            await loadData();
        } catch (err) {
            console.error("Save food error:", err);

            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Failed to save food item."
            );
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    // EDIT FOOD ITEM
    const handleEditFood = (food) => {
        setEditingId(food._id);

        setForm({
            name: food.name || "",
            category:
                typeof food.category === "object"
                    ? food.category?._id || ""
                    : food.category || "",
            price: String(food.price ?? ""),
            discountPrice:
                food.discountPrice == null
                    ? ""
                    : String(food.discountPrice),
            image: food.image || "",
            foodType: food.foodType || "veg",
            isFeatured: Boolean(food.isFeatured),
            isAvailable: food.isAvailable !== false,
        });

        setSelectedFile(null);
        setImageMode("upload");

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // DELETE FOOD ITEM
    const handleDeleteFood = async (foodId) => {
        if (!window.confirm("Are you sure you want to delete this food item?")) {
            return;
        }

        setError("");
        setMessage("");

        try {
            await axios.delete(
                `${API}/foods/${foodId}`,
                getAuthConfig()
            );

            setFoodItems((previous) =>
                previous.filter((item) => item._id !== foodId)
            );

            if (editingId === foodId) resetFoodForm();

            setMessage("Food item deleted successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to delete food item."
            );
        }
    };

    // TOGGLE FOOD AVAILABILITY
    const handleToggleAvailability = async (food) => {
        setError("");
        setMessage("");

        const nextAvailability = food.isAvailable === false;

        try {
            await axios.put(
                `${API}/foods/${food._id}`,
                { isAvailable: nextAvailability },
                getAuthConfig()
            );

            setFoodItems((previous) =>
                previous.map((item) =>
                    item._id === food._id
                        ? { ...item, isAvailable: nextAvailability }
                        : item
                )
            );

            setMessage(
                `${food.name} is now ${
                    nextAvailability ? "available" : "unavailable"
                }.`
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to update availability."
            );
        }
    };

    // SEARCH AND FILTER
    const filteredFoodItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return foodItems.filter((food) => {
            const categoryId =
                typeof food.category === "object"
                    ? food.category?._id
                    : food.category;

            const matchesSearch =
                !query || food.name?.toLowerCase().includes(query);

            const matchesCategory =
                categoryFilter === "all" ||
                categoryId === categoryFilter;

            const matchesAvailability =
                availabilityFilter === "all" ||
                (availabilityFilter === "available" &&
                    food.isAvailable !== false) ||
                (availabilityFilter === "unavailable" &&
                    food.isAvailable === false);

            return (
                matchesSearch &&
                matchesCategory &&
                matchesAvailability
            );
        });
    }, [
        foodItems,
        search,
        categoryFilter,
        availabilityFilter,
    ]);

    const availableCount = foodItems.filter(
        (food) => food.isAvailable !== false
    ).length;

    const featuredCount = foodItems.filter(
        (food) => food.isFeatured
    ).length;

    const discountedCount = foodItems.filter(
        (food) =>
            food.discountPrice != null &&
            food.discountPrice !== "" &&
            Number(food.discountPrice) < Number(food.price)
    ).length;

    // REUSABLE IMAGE COMPONENT
    const FoodImage = ({ image, name, className = "" }) => {
        const [failed, setFailed] = useState(false);
        const src = getImageUrl(image);

        useEffect(() => {
            setFailed(false);
        }, [src]);

        if (!src || failed) {
            return (
                <div
                    className={`flex items-center justify-center bg-slate-100 text-sm text-slate-500 ${className}`}
                >
                    Image unavailable
                </div>
            );
        }

        return (
            <img
                src={src}
                alt={name || "Food"}
                loading="lazy"
                className={className}
                onError={() => {
                    console.error("Failed to load food image:", {
                        name,
                        savedImage: image,
                        requestedURL: src,
                    });
                    setFailed(true);
                }}
            />
        );
    };

    // PAGE UI
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
                            Restaurant administration
                        </p>
                        <h1 className="mt-1 text-3xl font-bold text-slate-900">
                            Food Menu Management
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Manage categories, images, prices, discounts,
                            and availability.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadData}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                    >
                        Refresh menu
                    </button>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                        <button
                            type="button"
                            onClick={() => setError("")}
                            className="ml-3 font-bold underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {message && (
                    <div
                        role="status"
                        className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                    >
                        {message}
                    </div>
                )}

                {/* SUMMARY */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        {
                            label: "Total food items",
                            value: foodItems.length,
                            color: "text-slate-900",
                        },
                        {
                            label: "Available",
                            value: availableCount,
                            color: "text-green-700",
                        },
                        {
                            label: "Featured",
                            value: featuredCount,
                            color: "text-orange-600",
                        },
                        {
                            label: "On discount",
                            value: discountedCount,
                            color: "text-purple-700",
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <p className="text-sm text-slate-500">
                                {item.label}
                            </p>
                            <p
                                className={`mt-2 text-3xl font-bold ${item.color}`}
                            >
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CATEGORY MANAGEMENT */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Category Management
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Add categories and describe the food items they contain.
                    </p>

                    <form
                        onSubmit={handleAddCategory}
                        className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3"
                    >
                        <div>
                            <label
                                htmlFor="category-name"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Category Name *
                            </label>
                            <input
                                id="category-name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="e.g. Starters"
                                maxLength={100}
                                required
                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="category-description"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Category Description
                            </label>
                            <textarea
                                id="category-description"
                                value={categoryDescription}
                                onChange={(e) =>
                                    setCategoryDescription(e.target.value)
                                }
                                placeholder="Describe this category..."
                                maxLength={500}
                                rows={1}
                                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={categorySaving}
                                className="w-full rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                            >
                                {categorySaving ? "Adding..." : "+ Add Category"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-5">
                        <h3 className="mb-3 text-sm font-bold text-slate-700">
                            Existing Categories ({categories.length})
                        </h3>

                        {categories.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No categories found. Add your first category.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {categories.map((category) => (
                                    <div
                                        key={category._id}
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <h4 className="font-semibold text-slate-900">
                                                {category.name}
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteCategory(category._id)
                                                }
                                                className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-100"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-500">
                                            {category.description ||
                                                "No description added."}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ADD / EDIT FOOD */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingId ? "Edit Food Item" : "Add Food Item"}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Fill in food details and select an image.
                            </p>
                        </div>

                        {editingId && (
                            <button
                                type="button"
                                onClick={resetFoodForm}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                                Cancel editing
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSaveFood} className="space-y-6">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="food-name"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Food Name *
                                </label>
                                <input
                                    id="food-name"
                                    value={form.name}
                                    onChange={(e) =>
                                        updateForm("name", e.target.value)
                                    }
                                    placeholder="e.g. Paneer Tikka"
                                    maxLength={150}
                                    required
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="food-category"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Category *
                                </label>
                                <select
                                    id="food-category"
                                    value={form.category}
                                    onChange={(e) =>
                                        updateForm("category", e.target.value)
                                    }
                                    required
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                                >
                                    <option value="">Select category</option>
                                    {categories.map((category) => (
                                        <option
                                            key={category._id}
                                            value={category._id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                {categories.length === 0 && (
                                    <p className="mt-1 text-xs text-red-600">
                                        Add a category before adding food.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="food-price"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Price (₹) *
                                </label>
                                <input
                                    id="food-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={(e) =>
                                        updateForm("price", e.target.value)
                                    }
                                    required
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="food-discount"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Discount Price (₹)
                                </label>
                                <input
                                    id="food-discount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.discountPrice}
                                    onChange={(e) =>
                                        updateForm("discountPrice", e.target.value)
                                    }
                                    placeholder="Optional"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Must be lower than the original price.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="food-type"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Food Type
                                </label>
                                <select
                                    id="food-type"
                                    value={form.foodType}
                                    onChange={(e) =>
                                        updateForm("foodType", e.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                                >
                                    <option value="veg">Vegetarian</option>
                                    <option value="non-veg">Non-vegetarian</option>
                                    <option value="vegan">Vegan</option>
                                </select>
                            </div>
                        </div>

                        {/* IMAGE UPLOAD */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                            <h3 className="font-bold text-slate-900">
                                Food Image
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Upload an image or provide a direct image URL.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setImageMode("upload")}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                        imageMode === "upload"
                                            ? "bg-orange-600 text-white"
                                            : "border border-slate-300 bg-white text-slate-700"
                                    }`}
                                >
                                    Upload Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageMode("url")}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                        imageMode === "url"
                                            ? "bg-orange-600 text-white"
                                            : "border border-slate-300 bg-white text-slate-700"
                                    }`}
                                >
                                    Image URL
                                </button>
                            </div>

                            {imageMode === "upload" ? (
                                <div className="mt-4">
                                    <label
                                        htmlFor="food-image-file"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Select Image File
                                    </label>
                                    <input
                                        id="food-image-file"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleFileChange}
                                        className="block w-full rounded-xl border border-slate-300 bg-white text-sm"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        JPG, PNG, WebP, or GIF. Maximum 5 MB.
                                        Existing image is kept unless replaced.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <label
                                        htmlFor="food-image-url"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Image URL
                                    </label>
                                    <input
                                        id="food-image-url"
                                        type="url"
                                        value={form.image}
                                        onChange={(e) =>
                                            updateForm("image", e.target.value)
                                        }
                                        placeholder="https://example.com/food.webp"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                                    />
                                </div>
                            )}

                            {previewImage && (
                                <div className="mt-4">
                                    <p className="mb-2 text-sm font-semibold text-slate-700">
                                        Image Preview
                                    </p>
                                    <FoodImage
                                        key={previewImage}
                                        image={previewImage}
                                        name="Food preview"
                                        className="h-44 w-44 rounded-xl border border-slate-200 bg-white object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        {/* FOOD OPTIONS */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                                <input
                                    type="checkbox"
                                    checked={form.isFeatured}
                                    onChange={(e) =>
                                        updateForm("isFeatured", e.target.checked)
                                    }
                                    className="h-4 w-4 accent-orange-600"
                                />
                                <span>
                                    <span className="block font-semibold text-slate-800">
                                        Featured Item
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Highlight this food item.
                                    </span>
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                                <input
                                    type="checkbox"
                                    checked={form.isAvailable}
                                    onChange={(e) =>
                                        updateForm("isAvailable", e.target.checked)
                                    }
                                    className="h-4 w-4 accent-green-600"
                                />
                                <span>
                                    <span className="block font-semibold text-slate-800">
                                        Available for Ordering
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Enable or disable this food item.
                                    </span>
                                </span>
                            </label>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="submit"
                                disabled={
                                    saving ||
                                    uploading ||
                                    categories.length === 0
                                }
                                className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                            >
                                {uploading
                                    ? "Uploading Image..."
                                    : saving
                                      ? "Saving..."
                                      : editingId
                                        ? "Update Food Item"
                                        : "Add Food Item"}
                            </button>
                            <button
                                type="button"
                                onClick={resetFoodForm}
                                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700"
                            >
                                Clear Form
                            </button>
                        </div>
                    </form>
                </section>

                {/* FOOD ITEMS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Food Items
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Search, filter, edit, and control availability.
                    </p>

                    <div className="mb-5 mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search food name..."
                            className="rounded-xl border border-slate-300 px-4 py-3"
                        />

                        <select
                            value={categoryFilter}
                            onChange={(e) =>
                                setCategoryFilter(e.target.value)
                            }
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((category) => (
                                <option
                                    key={category._id}
                                    value={category._id}
                                >
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={availabilityFilter}
                            onChange={(e) =>
                                setAvailabilityFilter(e.target.value)
                            }
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                        >
                            <option value="all">All Availability</option>
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-slate-500">
                            Loading food menu...
                        </div>
                    ) : filteredFoodItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                            <p className="font-semibold text-slate-700">
                                No food items found
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Add a food item or change your filters.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredFoodItems.map((food) => {
                                const discounted =
                                    food.discountPrice != null &&
                                    food.discountPrice !== "" &&
                                    Number(food.discountPrice) <
                                        Number(food.price);

                                const categoryName =
                                    typeof food.category === "object"
                                        ? food.category?.name
                                        : categories.find(
                                              (category) =>
                                                  category._id === food.category
                                          )?.name;

                                const isAvailable =
                                    food.isAvailable !== false;

                                return (
                                    <article
                                        key={food._id}
                                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                    >
                                        <FoodImage
                                            image={food.image}
                                            name={food.name}
                                            className="block h-48 w-full object-cover"
                                        />

                                        <div className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900">
                                                        {food.name}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {categoryName ||
                                                            "Uncategorized"}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                                                    {food.foodType || "veg"}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {discounted ? (
                                                    <>
                                                        <span className="text-xl font-bold text-orange-700">
                                                            {formatPrice(
                                                                food.discountPrice
                                                            )}
                                                        </span>
                                                        <span className="text-sm text-slate-400 line-through">
                                                            {formatPrice(food.price)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xl font-bold text-slate-900">
                                                        {formatPrice(food.price)}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleToggleAvailability(food)
                                                }
                                                className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold ${
                                                    isAvailable
                                                        ? "border border-red-200 text-red-700 hover:bg-red-50"
                                                        : "border border-green-200 text-green-700 hover:bg-green-50"
                                                }`}
                                            >
                                                {isAvailable
                                                    ? "Mark Unavailable"
                                                    : "Mark Available"}
                                            </button>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEditFood(food)
                                                    }
                                                    className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteFood(food._id)
                                                    }
                                                    className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
