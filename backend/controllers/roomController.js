
const mongoose = require("mongoose");
const Room = require("../models/Room");

const VALID_STATUSES = [
  "available",
  "occupied",
  "reserved",
  "maintenance",
  "cleaning",
];

const parseList = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).map((v) => v.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }

  return [];
};

const normalizeRoomType = (input = {}) => ({
  name: String(input.name || "").trim(),
  description: String(input.description || "").trim(),
  basePrice: Number(input.basePrice),
  capacity: Number(input.capacity),
  amenities: parseList(input.amenities),
  images: Array.isArray(input.images)
    ? input.images.map(String).map((v) => v.trim()).filter(Boolean)
    : typeof input.images === "string"
      ? input.images.split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
      : [],
  isActive: input.isActive !== false,
});

const validateRoomInput = (body, editing = false) => {
  if (!editing && !String(body.roomNumber || "").trim()) {
    return "Room number is required";
  }

  if (!body.roomType || typeof body.roomType !== "object") {
    return "Room type details are required";
  }

  const type = normalizeRoomType(body.roomType);

  if (!type.name) return "Room type name is required";
  if (!Number.isFinite(type.basePrice) || type.basePrice < 0) {
    return "Enter a valid base price";
  }
  if (!Number.isInteger(type.capacity) || type.capacity < 1) {
    return "Capacity must be at least 1";
  }

  if (!editing && body.floor === undefined) {
    return "Floor is required";
  }

  return null;
};

// =====================================================
// CREATE ROOM
// =====================================================
const createRoom = async (req, res) => {
  try {
    const validationError = validateRoomInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const roomNumber = String(req.body.roomNumber).trim();

    const duplicate = await Room.findOne({ roomNumber });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Room number already exists",
      });
    }

    const floor = Number(req.body.floor);
    if (!Number.isInteger(floor) || floor < 0) {
      return res.status(400).json({
        success: false,
        message: "Floor must be a non-negative whole number",
      });
    }

    const type = normalizeRoomType(req.body.roomType);

    const price =
      req.body.price === "" ||
      req.body.price === undefined ||
      req.body.price === null
        ? type.basePrice
        : Number(req.body.price);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid room price",
      });
    }

    const room = await Room.create({
      roomNumber,
      floor,
      roomType: type,
      price,
      amenities: parseList(req.body.amenities),
      notes: String(req.body.notes || "").trim(),
      status: "available",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Create Room Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Room number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create room",
    });
  }
};

// =====================================================
// GET ROOMS
// =====================================================
const getRooms = async (req, res) => {
  try {
    const { status, floor, roomType, isActive, search } = req.query;
    const filter = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid room status",
        });
      }
      filter.status = status;
    }

    if (floor !== undefined && floor !== "") {
      const floorNumber = Number(floor);
      if (!Number.isInteger(floorNumber) || floorNumber < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid floor",
        });
      }
      filter.floor = floorNumber;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (roomType) {
      filter["roomType.name"] = {
        $regex: `^${String(roomType).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      };
    }

    if (search) {
      const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { roomNumber: { $regex: safeSearch, $options: "i" } },
        { "roomType.name": { $regex: safeSearch, $options: "i" } },
      ];
    }

    const rooms = await Room.find(filter).sort({
      floor: 1,
      roomNumber: 1,
    });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error("Get Rooms Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch rooms",
    });
  }
};

// =====================================================
// GET ONE ROOM
// =====================================================
const getRoomById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("Get Room Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch room",
    });
  }
};

// =====================================================
// UPDATE ROOM
// =====================================================
const updateRoom = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const body = req.body || {};

    if (body.roomNumber !== undefined) {
      const roomNumber = String(body.roomNumber).trim();

      if (!roomNumber) {
        return res.status(400).json({
          success: false,
          message: "Room number cannot be empty",
        });
      }

      const duplicate = await Room.findOne({
        roomNumber,
        _id: { $ne: room._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Room number already exists",
        });
      }

      room.roomNumber = roomNumber;
    }

    if (body.roomType !== undefined) {
      const type = normalizeRoomType(body.roomType);

      if (!type.name) {
        return res.status(400).json({
          success: false,
          message: "Room type name is required",
        });
      }

      if (!Number.isFinite(type.basePrice) || type.basePrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid base price",
        });
      }

      if (!Number.isInteger(type.capacity) || type.capacity < 1) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be at least 1",
        });
      }

      room.roomType = type;

      // Only sync the room price if the caller did not supply one.
      if (body.price === undefined && room.price == null) {
        room.price = type.basePrice;
      }
    }

    if (body.floor !== undefined) {
      const floor = Number(body.floor);
      if (!Number.isInteger(floor) || floor < 0) {
        return res.status(400).json({
          success: false,
          message: "Floor must be a non-negative whole number",
        });
      }
      room.floor = floor;
    }

    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid room price",
        });
      }
      room.price = price;
    }

    if (body.amenities !== undefined) {
      room.amenities = parseList(body.amenities);
    }

    if (body.notes !== undefined) {
      room.notes = String(body.notes || "").trim();
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid room status",
        });
      }
      room.status = body.status;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }
      room.isActive = body.isActive;
    }

    await room.save();

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error("Update Room Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update room",
    });
  }
};

// =====================================================
// UPDATE ROOM STATUS
// =====================================================
const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body || {};

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room status",
      });
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room status updated successfully",
      room,
    });
  } catch (error) {
    console.error("Update Room Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update room status",
    });
  }
};

// =====================================================
// DELETE ROOM
// =====================================================
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (["occupied", "reserved"].includes(room.status)) {
      return res.status(400).json({
        success: false,
        message: "Occupied or reserved rooms cannot be deleted",
      });
    }

    // Add a booking-history check here if your Booking model
    // retains room references for past or upcoming bookings.
    await room.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Delete Room Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete room",
    });
  }
};

// =====================================================
// COMPATIBILITY ENDPOINTS FOR OLD /types CALLS
// These are derived from rooms; they are not a separate collection.
// =====================================================

const getRoomTypes = async (req, res) => {
  try {
    const rooms = await Room.find(
      {},
      { roomType: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).lean();

    const uniqueTypes = new Map();

    for (const room of rooms) {
      const type = room.roomType;

      if (type?.name) {
        const key = type.name.trim().toLowerCase();

        if (!uniqueTypes.has(key)) {
          uniqueTypes.set(key, {
            _id: key,
            name: type.name,
            description: type.description || "",
            basePrice: type.basePrice,
            capacity: type.capacity,
            amenities: type.amenities || [],
            images: type.images || [],
            isActive: type.isActive !== false,
          });
        }
      }
    }

    const roomTypes = Array.from(uniqueTypes.values());

    return res.status(200).json({
      success: true,
      count: roomTypes.length,
      roomTypes,
    });
  } catch (error) {
    console.error("Get Embedded Room Types Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch room types",
    });
  }
};


// Legacy type creation is intentionally disabled.
// Create a room and its type details together through POST /api/rooms.
const createRoomType = async (req, res) =>
  res.status(410).json({
    success: false,
    message: "Room types are now created inside Room Management. Use POST /api/rooms.",
  });

const getRoomTypeById = async (req, res) =>
  res.status(410).json({
    success: false,
    message: "Room types no longer have separate IDs. Fetch rooms using GET /api/rooms.",
  });

const updateRoomType = async (req, res) =>
  res.status(410).json({
    success: false,
    message: "Edit room type details from the corresponding room in Room Management.",
  });

const deleteRoomType = async (req, res) =>
  res.status(410).json({
    success: false,
    message: "Room types are embedded in rooms. Delete or edit the room from Room Management.",
  });

module.exports = {
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
};
