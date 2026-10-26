const User = require("../models/User");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const RestaurantOrder = require("../models/RestaurantOrder");
const RestaurantBill = require("../models/RestaurantBill");

// ========================================
// Get Admin Profile
// ========================================

const getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findById(req.user._id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                role: admin.role,
                profileImage: admin.profileImage,
                address: admin.address,
                isActive: admin.isActive,
                isVerified: admin.isVerified,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt,
            },
        });

    } catch (error) {
        console.error("Get Admin Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch admin profile",
        });
    }
};

// ========================================
// Admin Dashboard
// ========================================


const getAdminDashboard = async (req, res) => {
    try {
        const staffRoles = [
            "manager",
            "receptionist",
            "waiter",
            "kitchen",
            "accountant",
            "staff",
            "hr",
            "delivery_boy",
        ];

        const [
            totalUsers,
            totalCustomers,
            totalAdmins,
            totalStaff,
            totalBookings,
            pendingBookings,
            confirmedBookings,
            checkedInBookings,
            totalRestaurantOrders,
            activeRestaurantOrders,
            totalRooms,
            availableRooms,
            occupiedRooms,
            maintenanceRooms,
            hotelRevenueResult,
            restaurantRevenueResult,
            unpaidRestaurantBills,
            recentBookings,
            recentOrders,
        ] = await Promise.all([
            User.countDocuments(),

            User.countDocuments({ role: "customer" }),

            User.countDocuments({ role: "admin" }),

            User.countDocuments({
                role: { $in: staffRoles },
            }),

            Booking.countDocuments(),

            Booking.countDocuments({
                bookingStatus: "pending",
            }),

            Booking.countDocuments({
                bookingStatus: "confirmed",
            }),

            Booking.countDocuments({
                bookingStatus: "checked_in",
            }),

            RestaurantOrder.countDocuments(),

            RestaurantOrder.countDocuments({
                orderStatus: {
                    $in: [
                        "pending",
                        "confirmed",
                        "preparing",
                        "ready",
                    ],
                },
            }),

            Room.countDocuments({
                isActive: true,
            }),

            Room.countDocuments({
                isActive: true,
                status: "available",
            }),

            Room.countDocuments({
                isActive: true,
                status: "occupied",
            }),

            Room.countDocuments({
                isActive: true,
                status: "maintenance",
            }),

            Booking.aggregate([
                {
                    $match: {
                        paymentStatus: "paid",
                        bookingStatus: { $ne: "cancelled" },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$totalAmount" },
                    },
                },
            ]),

            RestaurantBill.aggregate([
                {
                    $match: {
                        status: { $ne: "cancelled" },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$paidAmount" },
                    },
                },
            ]),

            RestaurantBill.countDocuments({
                status: { $ne: "cancelled" },
                paymentStatus: { $ne: "paid" },
            }),

            Booking.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select(
                    "bookingNumber guestDetails checkInDate checkOutDate totalAmount bookingStatus paymentStatus createdAt"
                )
                .populate("user", "name email")
                .populate("room", "roomNumber"),

            RestaurantOrder.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select(
                    "orderNumber orderType totalAmount orderStatus paymentStatus createdAt"
                )
                .populate("customer", "name"),
        ]);

        const hotelRevenue =
            hotelRevenueResult[0]?.total || 0;

        const restaurantRevenue =
            restaurantRevenueResult[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: "Admin dashboard data fetched successfully",

            dashboard: {
                totalUsers,
                totalCustomers,
                totalAdmins,
                totalStaff,

                totalBookings,
                pendingBookings,
                confirmedBookings,
                checkedInBookings,

                totalRestaurantOrders,
                activeRestaurantOrders,

                totalRooms,
                availableRooms,
                occupiedRooms,
                maintenanceRooms,

                hotelRevenue,
                restaurantRevenue,
                totalRevenue: hotelRevenue + restaurantRevenue,

                unpaidRestaurantBills,

                recentBookings,
                recentOrders,
            },
        });
    } catch (error) {
        console.error("Admin Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch dashboard data",
        });
    }
};

// ========================================
// Create Staff
// ========================================

const createStaff = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password,
            role,
        } = req.body || {};

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and role are required",
            });
        }

        // Allowed staff roles
        const allowedRoles = [
            "manager",
            "receptionist",
            "waiter",
            "kitchen",
            "accountant",
            "hr",
            "staff",
            "delivery_boy",
        
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid staff role",
            });
        }

        // Check existing email
        const existingUser = await User.findOne({
            email: email.trim().toLowerCase(),
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        // Hash password
        const bcrypt = require("bcryptjs");

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        // Create staff
        const staff = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            password: hashedPassword,
            role,
            isActive: true,
            isVerified: true,
        });

        return res.status(201).json({
            success: true,
            message: "Staff member created successfully",
            staff: {
                id: staff._id,
                name: staff.name,
                email: staff.email,
                phone: staff.phone,
                role: staff.role,
                isActive: staff.isActive,
                isVerified: staff.isVerified,
                createdAt: staff.createdAt,
            },
        });

    } catch (error) {
        console.error("Create Staff Error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create staff member",
        });
    }
};
// ========================================
// Get All Staff
// ========================================

const getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({
            role: {
                $in: [
                    "manager",
                    "receptionist",
                    "waiter",
                    "kitchen",
                    "accountant",
                    "staff",
                    "delivery_boy",
                    "hr",
                ],
            },
        }).select("-password");

        return res.status(200).json({
            success: true,
            count: staff.length,
            staff,
        });

    } catch (error) {
        console.error("Get Staff Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch staff",
        });
    }
};
// ========================================
// Get Single Staff
// ========================================

const getStaffById = async (req, res) => {
    try {
        const staff = await User.findById(
            req.params.id
        ).select("-password");

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found",
            });
        }

        const staffRoles = [
            "manager",
            "receptionist",
            "waiter",
            "kitchen",
            "accountant",
            "staff",
            "delivery_boy",
            "hr",
        ];

        if (!staffRoles.includes(staff.role)) {
            return res.status(400).json({
                success: false,
                message: "This user is not a staff member",
            });
        }

        return res.status(200).json({
            success: true,
            staff,
        });

    } catch (error) {
        console.error("Get Staff By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch staff member",
        });
    }
};
// ========================================
// Update Staff
// ========================================

const updateStaff = async (req, res) => {
    try {
        const {
            name,
            phone,
            role,
            isActive,
        } = req.body || {};

        const staff = await User.findById(
            req.params.id
        );

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found",
            });
        }

        const staffRoles = [
            "manager",
            "receptionist",
            "waiter",
            "kitchen",
            "accountant",
            "staff",
            "delivery_boy",
            "hr",
        ];

        if (!staffRoles.includes(staff.role)) {
            return res.status(400).json({
                success: false,
                message: "This user is not a staff member",
            });
        }

        if (name !== undefined) {
            staff.name = name.trim();
        }

        if (phone !== undefined) {
            staff.phone = phone;
        }

        if (role !== undefined) {
            if (!staffRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid staff role",
                });
            }

            staff.role = role;
        }

        if (isActive !== undefined) {
            staff.isActive = isActive;
        }

        await staff.save();

        return res.status(200).json({
            success: true,
            message: "Staff updated successfully",
            staff: {
                id: staff._id,
                name: staff.name,
                email: staff.email,
                phone: staff.phone,
                role: staff.role,
                isActive: staff.isActive,
                isVerified: staff.isVerified,
            },
        });

    } catch (error) {
        console.error("Update Staff Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update staff",
        });
    }
};
// ========================================
// Delete / Deactivate Staff
// ========================================

const deleteStaff = async (req, res) => {
    try {
        const staff = await User.findById(
            req.params.id
        );

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found",
            });
        }

        const staffRoles = [
            "manager",
            "receptionist",
            "waiter",
            "kitchen",
            "accountant",
            "hr",
            "staff",
            "delivery_boy",
        ];

        if (!staffRoles.includes(staff.role)) {
            return res.status(400).json({
                success: false,
                message: "This user is not a staff member",
            });
        }

        staff.isActive = false;

        await staff.save();

        return res.status(200).json({
            success: true,
            message: "Staff member deactivated successfully",
        });

    } catch (error) {
        console.error("Delete Staff Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to deactivate staff",
        });
    }
};


const permanentlyDeleteStaff = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found",
            });
        }

        const staffRoles = [
            "manager",
            "receptionist",
            "waiter",
            "kitchen",
            "accountant",
            "hr",
            "staff",
            "delivery_boy",
        ];

        if (!staffRoles.includes(staff.role)) {
            return res.status(400).json({
                success: false,
                message: "This user is not a staff member",
            });
        }

        // Admin apna khud ka account delete nahi kar sakta
        if (String(staff._id) === String(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        await User.deleteOne({ _id: staff._id });

        return res.status(200).json({
            success: true,
            message: "Staff permanently deleted successfully",
        });
    } catch (error) {
        console.error("Permanent Delete Staff Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to permanently delete staff",
        });
    }
};


module.exports = {
    getAdminProfile,
    getAdminDashboard,
    createStaff,
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    permanentlyDeleteStaff,
};