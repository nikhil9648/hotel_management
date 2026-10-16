
const Category = require("../models/Category");
const FoodItem = require("../models/FoodItem");

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

// Create a category
const createCategory = async (req, res) => {
    try {
        const { name, description, image } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const existingCategory = await Category.findOne({
            name: name.trim(),
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description: description || "",
            image: image || null,
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            category,
        });
    } catch (error) {
        console.error("Create category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create category",
            error: error.message,
        });
    }
};

// Get all categories
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories,
        });
    } catch (error) {
        console.error("Get categories error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch categories",
            error: error.message,
        });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            category,
        });
    } catch (error) {
        console.error("Get category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch category",
            error: error.message,
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { name, description, image } = req.body;

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Category name cannot be empty",
                });
            }

            const duplicateCategory = await Category.findOne({
                name: name.trim(),
                _id: { $ne: category._id },
            });

            if (duplicateCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Another category already uses this name",
                });
            }

            category.name = name.trim();
        }

        if (description !== undefined) {
            category.description = description;
        }

        if (image !== undefined) {
            category.image = image || null;
        }

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category,
        });
    } catch (error) {
        console.error("Update category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update category",
            error: error.message,
        });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Prevent deletion if food items still use this category.
        const foodUsingCategory = await FoodItem.exists({
            category: category._id,
        });

        if (foodUsingCategory) {
            return res.status(400).json({
                success: false,
                message:
                    "This category contains food items. Move or delete those items before deleting the category.",
            });
        }

        await Category.findByIdAndDelete(category._id);

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("Delete category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete category",
            error: error.message,
        });
    }
};

// ==========================================
// FOOD ITEM MANAGEMENT
// ==========================================

// Create a food item
const createFoodItem = async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            price,
            discountPrice,
            image,
            foodType,
            isAvailable,
            isFeatured,
            preparationTime,
            stock,
        } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Food name is required",
            });
        }

        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            });
        }

        if (
            price === undefined ||
            price === null ||
            price === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Price is required",
            });
        }

        // Validate price
        const numericPrice = Number(price);

        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a valid non-negative number",
            });
        }

        // Validate optional discount price
        let numericDiscountPrice = null;

        if (
            discountPrice !== undefined &&
            discountPrice !== null &&
            discountPrice !== ""
        ) {
            numericDiscountPrice = Number(discountPrice);

            if (
                !Number.isFinite(numericDiscountPrice) ||
                numericDiscountPrice < 0 ||
                numericDiscountPrice >= numericPrice
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Discount price must be non-negative and lower than the original price",
                });
            }
        }

        // Check category
        const categoryExists = await Category.findById(category);

        if (!categoryExists) {
            return res.status(400).json({
                success: false,
                message: "Selected category does not exist",
            });
        }

        const foodItem = await FoodItem.create({
            name: name.trim(),
            description: description || "",
            category,
            price: numericPrice,
            discountPrice: numericDiscountPrice,
            image: image || null,
            foodType: foodType || "veg",
            isAvailable:
                isAvailable === undefined ? true : isAvailable,
            isFeatured:
                isFeatured === undefined ? false : isFeatured,
            preparationTime:
                preparationTime === undefined
                    ? 15
                    : Number(preparationTime),
            stock: stock === undefined ? 0 : Number(stock),
        });

        const populatedFoodItem = await FoodItem.findById(
            foodItem._id
        ).populate("category", "name");

        return res.status(201).json({
            success: true,
            message: "Food item created successfully",
            foodItem: populatedFoodItem,
        });
    } catch (error) {
        console.error("Create food item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create food item",
            error: error.message,
        });
    }
};

// Get all food items with filters and search
const getFoodItems = async (req, res) => {
    try {
        const {
            category,
            foodType,
            isAvailable,
            search,
            isFeatured,
        } = req.query;

        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (foodType) {
            filter.foodType = foodType;
        }

        if (isAvailable !== undefined) {
            if (isAvailable === "true") {
                filter.isAvailable = true;
            } else if (isAvailable === "false") {
                filter.isAvailable = false;
            }
        }

        if (isFeatured !== undefined) {
            if (isFeatured === "true") {
                filter.isFeatured = true;
            } else if (isFeatured === "false") {
                filter.isFeatured = false;
            }
        }

        if (search && search.trim()) {
            const escapedSearch = search.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                { name: { $regex: escapedSearch, $options: "i" } },
                {
                    description: {
                        $regex: escapedSearch,
                        $options: "i",
                    },
                },
            ];
        }

        const foodItems = await FoodItem.find(filter)
            .populate("category", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: foodItems.length,
            foodItems,
        });
    } catch (error) {
        console.error("Get food items error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch food items",
            error: error.message,
        });
    }
};

// Get a single food item
const getFoodItemById = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(req.params.id)
            .populate("category", "name");

        if (!foodItem) {
            return res.status(404).json({
                success: false,
                message: "Food item not found",
            });
        }

        return res.status(200).json({
            success: true,
            foodItem,
        });
    } catch (error) {
        console.error("Get food item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch food item",
            error: error.message,
        });
    }
};

// Update a food item
const updateFoodItem = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(req.params.id);

        if (!foodItem) {
            return res.status(404).json({
                success: false,
                message: "Food item not found",
            });
        }

        const {
            name,
            description,
            category,
            price,
            discountPrice,
            image,
            foodType,
            isAvailable,
            isFeatured,
            preparationTime,
            stock,
        } = req.body;

        // Validate and update name
        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Food name cannot be empty",
                });
            }

            foodItem.name = name.trim();
        }

        if (description !== undefined) {
            foodItem.description = description;
        }

        // Validate and update category
        if (category !== undefined) {
            const categoryExists = await Category.findById(category);

            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Selected category does not exist",
                });
            }

            foodItem.category = category;
        }

        // Work out the resulting price and discount.
        const nextPrice =
            price !== undefined
                ? Number(price)
                : Number(foodItem.price);

        const nextDiscountPrice =
            discountPrice === undefined
                ? foodItem.discountPrice
                : discountPrice === null || discountPrice === ""
                    ? null
                    : Number(discountPrice);

        // Validate prices when either price field is being changed.
        // This allows unrelated updates to existing legacy records.
        if (
            price !== undefined ||
            discountPrice !== undefined
        ) {
            if (
                !Number.isFinite(nextPrice) ||
                nextPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Price must be a valid non-negative number",
                });
            }

            if (
                nextDiscountPrice !== null &&
                (
                    !Number.isFinite(Number(nextDiscountPrice)) ||
                    Number(nextDiscountPrice) < 0 ||
                    Number(nextDiscountPrice) >= nextPrice
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Discount price must be non-negative and lower than the original price",
                });
            }

            foodItem.price = nextPrice;
            foodItem.discountPrice =
                nextDiscountPrice === null
                    ? null
                    : Number(nextDiscountPrice);
        }

        if (image !== undefined) {
            foodItem.image = image || null;
        }

        if (foodType !== undefined) {
            foodItem.foodType = foodType;
        }

        if (isAvailable !== undefined) {
            foodItem.isAvailable = isAvailable;
        }

        if (isFeatured !== undefined) {
            foodItem.isFeatured = isFeatured;
        }

        if (preparationTime !== undefined) {
            const numericPreparationTime = Number(preparationTime);

            if (
                !Number.isInteger(numericPreparationTime) ||
                numericPreparationTime < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Preparation time must be a positive integer",
                });
            }

            foodItem.preparationTime = numericPreparationTime;
        }

        if (stock !== undefined) {
            const numericStock = Number(stock);

            if (
                !Number.isInteger(numericStock) ||
                numericStock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a non-negative integer",
                });
            }

            foodItem.stock = numericStock;
        }

        await foodItem.save();

        const updatedFoodItem = await FoodItem.findById(
            foodItem._id
        ).populate("category", "name");

        return res.status(200).json({
            success: true,
            message: "Food item updated successfully",
            foodItem: updatedFoodItem,
        });
    } catch (error) {
        console.error("Update food item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update food item",
            error: error.message,
        });
    }
};

// Delete a food item
const deleteFoodItem = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(req.params.id);

        if (!foodItem) {
            return res.status(404).json({
                success: false,
                message: "Food item not found",
            });
        }

        await FoodItem.findByIdAndDelete(foodItem._id);

        return res.status(200).json({
            success: true,
            message: "Food item deleted successfully",
        });
    } catch (error) {
        console.error("Delete food item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete food item",
            error: error.message,
        });
    }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    createFoodItem,
    getFoodItems,
    getFoodItemById,
    updateFoodItem,
    deleteFoodItem,
};
