const express = require("express");

const {
    createRoomType,
    getRoomTypes,
    getRoomTypeById,
    updateRoomType,
    deleteRoomType,

    createRoom,
    getRooms,
    getRoomById,
    updateRoom,
    deleteRoom,
    updateRoomStatus,
} = require("../controllers/roomController");

const {
    protect,
    authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// ROOM TYPE ROUTES
// =====================================================

// Public
router.get(
    "/types",
    getRoomTypes
);

router.get(
    "/types/:id",
    getRoomTypeById
);

// Admin
router.post(
    "/types",
    protect,
    authorize("admin"),
    createRoomType
);

router.put(
    "/types/:id",
    protect,
    authorize("admin"),
    updateRoomType
);

router.delete(
    "/types/:id",
    protect,
    authorize("admin"),
    deleteRoomType
);


// =====================================================
// ROOM ROUTES
// =====================================================

// Public
router.get(
    "/",
    getRooms
);

router.get(
    "/:id",
    getRoomById
);

// Admin
router.post(
    "/",
    protect,
    authorize("admin"),
    createRoom
);

router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateRoom
);

router.delete(
    "/:id",
    protect,
    authorize("admin"),
    deleteRoom
);

router.patch(
    "/:id/status",
    protect,
    authorize("admin"),
    updateRoomStatus
);


module.exports = router;