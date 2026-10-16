const express = require("express");
const upload = require("../middleware/upload");
// const { protect, authorize } = require("../middleware/authMiddleware");

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

router.post(
    "/upload-image",
    protect,
    authorize("admin"),
    upload.single("image"),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image to upload.",
            });
        }

        const imageUrl =
            `${req.protocol}://${req.get("host")}` +
            `/uploads/food-images/${req.file.filename}`;

        return res.status(201).json({
            success: true,
            message: "Image uploaded successfully.",
            imageUrl,
        });
    }
);
router.use((error, req, res, next) => {
    if (error instanceof require("multer").MulterError) {
        return res.status(400).json({
            success: false,
            message:
                error.code === "LIMIT_FILE_SIZE"
                    ? "Image size must not exceed 5 MB."
                    : error.message,
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Image upload failed.",
        });
    }

    next();
});

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