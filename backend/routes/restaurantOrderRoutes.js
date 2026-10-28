const express = require("express");
const router = express.Router();

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const restaurantOrderController = require("../controllers/restaurantOrderController");

const {
    createRestaurantOrder,
    getMyRestaurantOrders,
    getTableOrders,
    getAllRestaurantOrders,
    getRestaurantOrderById,
    addItemsToRestaurantOrder,
    updateRestaurantOrder,
    updateRestaurantOrderStatus,
    updateRestaurantOrderPayment,
    removeRestaurantOrderItem,
    assignDeliveryBoy,
    getRestaurantOrderHistory,
    getMyDeliveryOrders,
    verifyDeliveryOtp,
} = restaurantOrderController;


// ========================================
// CREATE NEW ORDER
// Waiter, Admin and Manager
// ========================================
router.post(
    "/",
    protect,
    authorize("customer", "waiter", "admin", "manager", "receptionist", "reception"),
    createRestaurantOrder
);


// ========================================
// GET LOGGED-IN USER'S ORDERS
// Customer, Waiter, Admin and Manager
// ========================================
router.get(
    "/my-orders",
    protect,
    authorize("customer", "waiter", "admin", "manager"),
    getMyRestaurantOrders
);


// ========================================
// GET ALL RESTAURANT ORDERS
// Admin, Manager, Kitchen and Accountant
// ========================================
router.get(
  "/all",
  protect,
  authorize(
    "admin",
    "manager",
    "kitchen",
    "accountant",
    "receptionist",
    "reception"
  ),
  getAllRestaurantOrders
);


// ========================================
// GET ORDERS FOR A TABLE
// Waiter, Admin, Manager and Receptionist
// ========================================
router.get(
    "/table/:tableId",
    protect,
    authorize("waiter", "admin", "manager", "receptionist"),
    getTableOrders
);

router.get(
    "/history",
    protect,
    getRestaurantOrderHistory
);

router.get(
  "/all",
  protect,
  authorize(
    "admin",
    "manager",
    "kitchen",
    "accountant",
    "receptionist",
    "reception"
  ),
  getAllRestaurantOrders
);
// ========================================
// ADD MORE ITEMS TO EXISTING ORDER
// Waiter, Admin and Manager
// ========================================
router.put(
    "/:id/items",
    protect,
    authorize("waiter", "admin", "manager","receptionist", "reception"),
    addItemsToRestaurantOrder
);

router.delete(
    "/:id/items/:itemId",
    protect,
    authorize("admin","receptionist", "reception", "manager"),
    removeRestaurantOrderItem
);

// ========================================
// UPDATE EXISTING ORDER
// Waiter, Admin and Manager
// ========================================
router.put(
    "/:id",
    protect,
    authorize("waiter", "admin", "manager","receptionist", "reception"),
    updateRestaurantOrder
);


// ========================================
// UPDATE ORDER STATUS
// Waiter, Admin, Manager and Kitchen
// Controller should enforce role-specific status rules.
// ========================================
router.put(
    "/:id/status",
    protect,
    authorize("waiter", "admin", "manager", "kitchen","receptionist", "reception"),
    updateRestaurantOrderStatus
);


// ========================================
// UPDATE PAYMENT
// Admin, Manager and Accountant
// ========================================
router.put(
    "/:id/payment",
    protect,
    authorize("admin", "manager", "accountant","receptionist", "reception"),
    updateRestaurantOrderPayment
);

router.patch(
  "/:id/assign-delivery",
  protect,
  authorize("admin", "manager", "receptionist", "reception"),
  assignDeliveryBoy
);
// ========================================
// GET SINGLE ORDER BY ID
// ========================================
router.get(
    "/:id",
    protect,
    authorize(
        "customer",
        "waiter",
        "admin",
        "manager",
        "kitchen",
        "accountant"
    ),
    getRestaurantOrderById
);


module.exports = router;

