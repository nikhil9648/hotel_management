
const express = require("express");

const {
  getRoomTypes,
  getRoomTypeById,
  createRoomType,
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

// Legacy compatibility: read-only room type list
router.get("/types", getRoomTypes);
router.get("/types/:id", getRoomTypeById);

// Legacy write routes return 410; create/edit through Room Management
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

// Rooms
router.get("/", getRooms);
router.get("/:id", getRoomById);

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
