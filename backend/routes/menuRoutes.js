const express = require("express");

const {
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
} = require("../controllers/menuController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// CATEGORY ROUTES
// ===============================

router.get("/categories", getCategories);

router.get(
    "/categories/:id",
    getCategoryById
);

router.post(
    "/categories",
    protect,
    authorize("admin"),
    createCategory
);

router.put(
    "/categories/:id",
    protect,
    authorize("admin"),
    updateCategory
);

router.delete(
    "/categories/:id",
    protect,
    authorize("admin"),
    deleteCategory
);


// ===============================
// FOOD ROUTES
// ===============================

router.get("/foods", getFoodItems);

router.get(
    "/foods/:id",
    getFoodItemById
);

router.post(
    "/foods",
    protect,
    authorize("admin"),
    createFoodItem
);

router.put(
    "/foods/:id",
    protect,
    authorize("admin"),
    updateFoodItem
);

router.delete(
    "/foods/:id",
    protect,
    authorize("admin"),
    deleteFoodItem
);


module.exports = router;