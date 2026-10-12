const RoomType = require("../models/RoomType");
const Room = require("../models/Room");

// =====================================================
// ROOM TYPE MANAGEMENT
// =====================================================

// =====================================================
// Create Room Type
// =====================================================

const createRoomType = async (req, res) => {
    try {
        const {
            name,
            description,
            basePrice,
            capacity,
            amenities,
            images,
        } = req.body || {};

        // Validation
        if (
            !name ||
            basePrice === undefined ||
            capacity === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, base price and capacity are required",
            });
        }

        // Check duplicate room type
        const existingRoomType = await RoomType.findOne({
            name: name.trim(),
        });

        if (existingRoomType) {
            return res.status(409).json({
                success: false,
                message: "Room type already exists",
            });
        }

        // Create room type
        const roomType = await RoomType.create({
            name: name.trim(),
            description: description || "",
            basePrice,
            capacity,
            amenities: Array.isArray(amenities)
                ? amenities
                : [],
            images: Array.isArray(images)
                ? images
                : [],
        });

        return res.status(201).json({
            success: true,
            message: "Room type created successfully",
            roomType,
        });

    } catch (error) {
        console.error(
            "Create Room Type Error:",
            error
        );

        // Duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Room type already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create room type",
        });
    }
};


// =====================================================
// Get All Room Types
// =====================================================

const getRoomTypes = async (req, res) => {
    try {
        const roomTypes = await RoomType.find()
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            count: roomTypes.length,
            roomTypes,
        });

    } catch (error) {
        console.error(
            "Get Room Types Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch room types",
        });
    }
};


// =====================================================
// Get Single Room Type
// =====================================================

const getRoomTypeById = async (req, res) => {
    try {
        const roomType = await RoomType.findById(
            req.params.id
        );

        if (!roomType) {
            return res.status(404).json({
                success: false,
                message: "Room type not found",
            });
        }

        return res.status(200).json({
            success: true,
            roomType,
        });

    } catch (error) {
        console.error(
            "Get Room Type Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch room type",
        });
    }
};


// =====================================================
// Update Room Type
// =====================================================

const updateRoomType = async (req, res) => {
    try {
        const roomType = await RoomType.findById(
            req.params.id
        );

        if (!roomType) {
            return res.status(404).json({
                success: false,
                message: "Room type not found",
            });
        }

        const {
            name,
            description,
            basePrice,
            capacity,
            amenities,
            images,
            isActive,
        } = req.body || {};

        // Update name
        if (name !== undefined) {
            const trimmedName = name.trim();

            const duplicate =
                await RoomType.findOne({
                    name: trimmedName,
                    _id: {
                        $ne: roomType._id,
                    },
                });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Room type name already exists",
                });
            }

            roomType.name = trimmedName;
        }

        // Update description
        if (description !== undefined) {
            roomType.description = description;
        }

        // Update price
        if (basePrice !== undefined) {
            roomType.basePrice = basePrice;
        }

        // Update capacity
        if (capacity !== undefined) {
            roomType.capacity = capacity;
        }

        // Update amenities
        if (amenities !== undefined) {
            roomType.amenities =
                Array.isArray(amenities)
                    ? amenities
                    : [];
        }

        // Update images
        if (images !== undefined) {
            roomType.images =
                Array.isArray(images)
                    ? images
                    : [];
        }

        // Update active status
        if (isActive !== undefined) {
            roomType.isActive = isActive;
        }

        await roomType.save();

        return res.status(200).json({
            success: true,
            message:
                "Room type updated successfully",
            roomType,
        });

    } catch (error) {
        console.error(
            "Update Room Type Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update room type",
        });
    }
};


// =====================================================
// Delete Room Type
// =====================================================

const deleteRoomType = async (req, res) => {
    try {
        const roomType = await RoomType.findById(
            req.params.id
        );

        if (!roomType) {
            return res.status(404).json({
                success: false,
                message: "Room type not found",
            });
        }

        // Check whether rooms are using this type
        const roomsUsingType =
            await Room.countDocuments({
                roomType: roomType._id,
            });

        if (roomsUsingType > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot delete room type because rooms are using it",
            });
        }

        await RoomType.findByIdAndDelete(
            roomType._id
        );

        return res.status(200).json({
            success: true,
            message:
                "Room type deleted successfully",
        });

    } catch (error) {
        console.error(
            "Delete Room Type Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete room type",
        });
    }
};


// =====================================================
// ROOM MANAGEMENT
// =====================================================

// =====================================================
// Create Room
// =====================================================

const createRoom = async (req, res) => {
    try {
        const {
            roomNumber,
            roomType,
            floor,
            price,
            amenities,
            notes,
        } = req.body || {};

        // Validation
        if (
            !roomNumber ||
            !roomType ||
            floor === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Room number, room type and floor are required",
            });
        }

        // Check room type
        const existingRoomType =
            await RoomType.findById(roomType);

        if (!existingRoomType) {
            return res.status(404).json({
                success: false,
                message: "Room type not found",
            });
        }

        // Check duplicate room number
        const existingRoom = await Room.findOne({
            roomNumber: roomNumber.trim(),
        });

        if (existingRoom) {
            return res.status(409).json({
                success: false,
                message:
                    "Room number already exists",
            });
        }

        // Create room
        const room = await Room.create({
            roomNumber: roomNumber.trim(),

            roomType,

            floor,

            price:
                price !== undefined
                    ? price
                    : existingRoomType.basePrice,

            amenities:
                Array.isArray(amenities)
                    ? amenities
                    : [],

            notes: notes || "",

            status: "available",

            isActive: true,
        });

        // Populate room type
        const populatedRoom =
            await Room.findById(room._id)
                .populate(
                    "roomType",
                    "name basePrice capacity amenities"
                );

        return res.status(201).json({
            success: true,
            message: "Room created successfully",
            room: populatedRoom,
        });

    } catch (error) {
        console.error(
            "Create Room Error:",
            error
        );

        // Duplicate room number
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "Room number already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to create room",
        });
    }
};


// =====================================================
// Get All Rooms
// =====================================================

const getRooms = async (req, res) => {
    try {
        const {
            status,
            floor,
            roomType,
            isActive,
        } = req.query;

        const filter = {};

        // Status filter
        if (status) {
            filter.status = status;
        }

        // Floor filter
        if (floor !== undefined) {
            const floorNumber = Number(floor);

            if (Number.isNaN(floorNumber)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Floor must be a valid number",
                });
            }

            filter.floor = floorNumber;
        }

        // Room type filter
        if (roomType) {
            filter.roomType = roomType;
        }

        // Active filter
        if (isActive !== undefined) {
            filter.isActive =
                isActive === "true";
        }

        const rooms = await Room.find(filter)
            .populate(
                "roomType",
                "name basePrice capacity amenities"
            )
            .sort({
                floor: 1,
                roomNumber: 1,
            });

        return res.status(200).json({
            success: true,
            count: rooms.length,
            rooms,
        });

    } catch (error) {
        console.error(
            "Get Rooms Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch rooms",
        });
    }
};


// =====================================================
// Get Single Room
// =====================================================

const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(
            req.params.id
        ).populate(
            "roomType",
            "name basePrice capacity amenities"
        );

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found",
            });
        }

        return res.status(200).json({
            success: true,
            room,
        });

    } catch (error) {
        console.error(
            "Get Room Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch room",
        });
    }
};


// =====================================================
// Update Room
// =====================================================

const updateRoom = async (req, res) => {
    try {
        const room = await Room.findById(
            req.params.id
        );

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found",
            });
        }

        const {
            roomNumber,
            roomType,
            floor,
            status,
            price,
            amenities,
            notes,
            isActive,
        } = req.body || {};

        // ---------------------------------------------
        // Room Number
        // ---------------------------------------------

        if (roomNumber !== undefined) {
            const trimmedRoomNumber =
                roomNumber.trim();

            const duplicate =
                await Room.findOne({
                    roomNumber:
                        trimmedRoomNumber,

                    _id: {
                        $ne: room._id,
                    },
                });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Room number already exists",
                });
            }

            room.roomNumber =
                trimmedRoomNumber;
        }

        // ---------------------------------------------
        // Room Type
        // ---------------------------------------------

        if (roomType !== undefined) {
            const typeExists =
                await RoomType.findById(
                    roomType
                );

            if (!typeExists) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Room type not found",
                });
            }

            room.roomType = roomType;
        }

        // ---------------------------------------------
        // Floor
        // ---------------------------------------------

        if (floor !== undefined) {
            room.floor = floor;
        }

        // ---------------------------------------------
        // Status
        // ---------------------------------------------

        if (status !== undefined) {
            const validStatuses = [
                "available",
                "occupied",
                "reserved",
                "maintenance",
                "cleaning",
            ];

            if (
                !validStatuses.includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid room status",
                });
            }

            room.status = status;
        }

        // ---------------------------------------------
        // Price
        // ---------------------------------------------

        if (price !== undefined) {
            room.price = price;
        }

        // ---------------------------------------------
        // Amenities
        // ---------------------------------------------

        if (amenities !== undefined) {
            room.amenities =
                Array.isArray(amenities)
                    ? amenities
                    : [];
        }

        // ---------------------------------------------
        // Notes
        // ---------------------------------------------

        if (notes !== undefined) {
            room.notes = notes;
        }

        // ---------------------------------------------
        // Active Status
        // ---------------------------------------------

        if (isActive !== undefined) {
            room.isActive = isActive;
        }

        await room.save();

        const updatedRoom =
            await Room.findById(room._id)
                .populate(
                    "roomType",
                    "name basePrice capacity amenities"
                );

        return res.status(200).json({
            success: true,
            message:
                "Room updated successfully",
            room: updatedRoom,
        });

    } catch (error) {
        console.error(
            "Update Room Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update room",
        });
    }
};


// =====================================================
// Delete Room
// =====================================================

const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(
            req.params.id
        );

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found",
            });
        }

        // Don't delete occupied/reserved rooms
        if (
            room.status === "occupied" ||
            room.status === "reserved"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Occupied or reserved rooms cannot be deleted",
            });
        }

        await Room.findByIdAndDelete(
            room._id
        );

        return res.status(200).json({
            success: true,
            message:
                "Room deleted successfully",
        });

    } catch (error) {
        console.error(
            "Delete Room Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete room",
        });
    }
};


// =====================================================
// Update Room Status
// =====================================================

const updateRoomStatus = async (req, res) => {
    try {
        const { status } =
            req.body || {};

        const validStatuses = [
            "available",
            "occupied",
            "reserved",
            "maintenance",
            "cleaning",
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid room status",
            });
        }

        const room = await Room.findById(
            req.params.id
        );

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found",
            });
        }

        room.status = status;

        await room.save();

        const updatedRoom =
            await Room.findById(room._id)
                .populate(
                    "roomType",
                    "name basePrice capacity amenities"
                );

        return res.status(200).json({
            success: true,
            message:
                "Room status updated successfully",
            room: updatedRoom,
        });

    } catch (error) {
        console.error(
            "Update Room Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update room status",
        });
    }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

    // Room Types
    createRoomType,
    getRoomTypes,
    getRoomTypeById,
    updateRoomType,
    deleteRoomType,

    // Rooms
    createRoom,
    getRooms,
    getRoomById,
    updateRoom,
    deleteRoom,
    updateRoomStatus,
};
