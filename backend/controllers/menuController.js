const Category = require("../models/Category");
const FoodItem = require("../models/FoodItem");

// =====================================================
// CATEGORY
// =====================================================

// =====================================================
// Create Category
// =====================================================

const createCategory = async (req, res) => {
    try {
        const {
            name,
            description,
            image,
            sortOrder,
        } = req.body || {};

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const existingCategory = await Category.findOne({
            name: name.trim(),
        });

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: "Category already exists",
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description: description || "",
            image: image || null,
            sortOrder: sortOrder || 0,
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            category,
        });

    } catch (error) {
        console.error("Create Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create category",
        });
    }
};

// =====================================================
// Get All Categories
// =====================================================

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find()
            .sort({
                sortOrder: 1,
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories,
        });

    } catch (error) {
        console.error("Get Categories Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch categories",
        });
    }
};

// =====================================================
// Get Single Category
// =====================================================

const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(
            req.params.id
        );

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
        console.error("Get Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch category",
        });
    }
};

// =====================================================
// Update Category
// =====================================================

const updateCategory = async (req, res) => {
    try {
        const {
            name,
            description,
            image,
            isActive,
            sortOrder,
        } = req.body || {};

        const category = await Category.findById(
            req.params.id
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        if (name !== undefined) {
            const duplicate = await Category.findOne({
                name: name.trim(),
                _id: {
                    $ne: category._id,
                },
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "Category name already exists",
                });
            }

            category.name = name.trim();
        }

        if (description !== undefined) {
            category.description = description;
        }

        if (image !== undefined) {
            category.image = image;
        }

        if (isActive !== undefined) {
            category.isActive = isActive;
        }

        if (sortOrder !== undefined) {
            category.sortOrder = sortOrder;
        }

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category,
        });

    } catch (error) {
        console.error("Update Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update category",
        });
    }
};

// =====================================================
// Delete Category
// =====================================================

const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(
            req.params.id
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Check if food items are using this category
        const foodCount = await FoodItem.countDocuments({
            category: category._id,
        });

        if (foodCount > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot delete category because food items are using it",
            });
        }

        await Category.findByIdAndDelete(
            category._id
        );

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });

    } catch (error) {
        console.error("Delete Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete category",
        });
    }
};

// =====================================================
// FOOD ITEMS
// =====================================================

// =====================================================
// Create Food Item
// =====================================================

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
            preparationTime,
            stock,
            isFeatured,
        } = req.body || {};

        if (!name || !category || price === undefined) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, category and price are required",
            });
        }

        // Check category
        const categoryExists = await Category.findById(
            category
        );

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const foodItem = await FoodItem.create({
            name: name.trim(),
            description: description || "",
            category,
            price,
            discountPrice:
                discountPrice !== undefined
                    ? discountPrice
                    : null,
            image: image || null,
            foodType: foodType || "veg",
            preparationTime:
                preparationTime || 15,
            stock: stock || 0,
            isFeatured: isFeatured || false,
        });

        const populatedFoodItem =
            await FoodItem.findById(foodItem._id)
                .populate("category", "name");

        return res.status(201).json({
            success: true,
            message: "Food item created successfully",
            foodItem: populatedFoodItem,
        });

    } catch (error) {
        console.error("Create Food Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create food item",
        });
    }
};

// =====================================================
// Get All Food Items
// =====================================================

const getFoodItems = async (req, res) => {
    try {
        const {
            category,
            foodType,
            isAvailable,
            search,
        } = req.query;

        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (foodType) {
            filter.foodType = foodType;
        }

        if (isAvailable !== undefined) {
            filter.isAvailable =
                isAvailable === "true";
        }

        if (search) {
            filter.name = {
                $regex: search,
                $options: "i",
            };
        }

        const foodItems = await FoodItem.find(filter)
            .populate("category", "name")
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            count: foodItems.length,
            foodItems,
        });

    } catch (error) {
        console.error("Get Food Items Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch food items",
        });
    }
};

// =====================================================
// Get Single Food Item
// =====================================================

const getFoodItemById = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(
            req.params.id
        ).populate("category", "name");

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
        console.error("Get Food Item Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch food item",
        });
    }
};

// =====================================================
// Update Food Item
// =====================================================

const updateFoodItem = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(
            req.params.id
        );

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
        } = req.body || {};

        if (category !== undefined) {
            const categoryExists =
                await Category.findById(category);

            if (!categoryExists) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found",
                });
            }

            foodItem.category = category;
        }

        if (name !== undefined) {
            foodItem.name = name.trim();
        }

        if (description !== undefined) {
            foodItem.description = description;
        }

        if (price !== undefined) {
            foodItem.price = price;
        }

        if (discountPrice !== undefined) {
            foodItem.discountPrice =
                discountPrice;
        }

        if (image !== undefined) {
            foodItem.image = image;
        }

        if (foodType !== undefined) {
            foodItem.foodType = foodType;
        }

        if (isAvailable !== undefined) {
            foodItem.isAvailable =
                isAvailable;
        }

        if (isFeatured !== undefined) {
            foodItem.isFeatured =
                isFeatured;
        }

        if (preparationTime !== undefined) {
            foodItem.preparationTime =
                preparationTime;
        }

        if (stock !== undefined) {
            foodItem.stock = stock;
        }

        await foodItem.save();

        const updatedFoodItem =
            await FoodItem.findById(foodItem._id)
                .populate("category", "name");

        return res.status(200).json({
            success: true,
            message: "Food item updated successfully",
            foodItem: updatedFoodItem,
        });

    } catch (error) {
        console.error("Update Food Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update food item",
        });
    }
};

// =====================================================
// Delete Food Item
// =====================================================

const deleteFoodItem = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(
            req.params.id
        );

        if (!foodItem) {
            return res.status(404).json({
                success: false,
                message: "Food item not found",
            });
        }

        await FoodItem.findByIdAndDelete(
            foodItem._id
        );

        return res.status(200).json({
            success: true,
            message: "Food item deleted successfully",
        });

    } catch (error) {
        console.error("Delete Food Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete food item",
        });
    }
};

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