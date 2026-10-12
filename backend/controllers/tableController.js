const RestaurantTable = require("../models/RestaurantTable");

// =====================================================
// CREATE TABLE
// =====================================================

const createTable = async (req, res) => {
    try {
        const {
            tableNumber,
            capacity,
            location,
        } = req.body || {};

        if (!tableNumber || !capacity) {
            return res.status(400).json({
                success: false,
                message:
                    "Table number and capacity are required",
            });
        }

        const existingTable =
            await RestaurantTable.findOne({
                tableNumber: tableNumber.trim(),
            });

        if (existingTable) {
            return res.status(409).json({
                success: false,
                message: "Table already exists",
            });
        }

        const table =
            await RestaurantTable.create({
                tableNumber:
                    tableNumber.trim(),

                capacity,

                location:
                    location || "Restaurant",
            });

        return res.status(201).json({
            success: true,
            message:
                "Restaurant table created successfully",

            table,
        });
    } catch (error) {
        console.error(
            "Create Table Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create restaurant table",
        });
    }
};


// =====================================================
// GET ALL TABLES
// =====================================================

const getTables = async (req, res) => {
    try {
        const {
            status,
        } = req.query;

        const filter = {
            isActive: true,
        };

        if (status) {
            filter.status = status;
        }

        const tables =
            await RestaurantTable.find(filter)
                .sort({
                    tableNumber: 1,
                });

        return res.status(200).json({
            success: true,

            count: tables.length,

            tables,
        });
    } catch (error) {
        console.error(
            "Get Tables Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch tables",
        });
    }
};


// =====================================================
// GET SINGLE TABLE
// =====================================================

const getTableById = async (req, res) => {
    try {
        const table =
            await RestaurantTable.findById(
                req.params.id
            );

        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }

        return res.status(200).json({
            success: true,
            table,
        });
    } catch (error) {
        console.error(
            "Get Table Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch table",
        });
    }
};


// =====================================================
// UPDATE TABLE
// =====================================================

const updateTable = async (req, res) => {
    try {
        const table =
            await RestaurantTable.findById(
                req.params.id
            );

        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }

        const {
            tableNumber,
            capacity,
            status,
            location,
            isActive,
        } = req.body || {};

        if (tableNumber !== undefined) {
            const duplicate =
                await RestaurantTable.findOne({
                    tableNumber:
                        tableNumber.trim(),

                    _id: {
                        $ne: table._id,
                    },
                });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Table number already exists",
                });
            }

            table.tableNumber =
                tableNumber.trim();
        }

        if (capacity !== undefined) {
            table.capacity = capacity;
        }

        if (status !== undefined) {
            table.status = status;
        }

        if (location !== undefined) {
            table.location = location;
        }

        if (isActive !== undefined) {
            table.isActive = isActive;
        }

        await table.save();

        return res.status(200).json({
            success: true,
            message:
                "Table updated successfully",

            table,
        });
    } catch (error) {
        console.error(
            "Update Table Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update table",
        });
    }
};


// =====================================================
// DELETE TABLE
// =====================================================

const deleteTable = async (req, res) => {
    try {
        const table =
            await RestaurantTable.findById(
                req.params.id
            );

        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }

        await RestaurantTable.findByIdAndDelete(
            table._id
        );

        return res.status(200).json({
            success: true,
            message:
                "Table deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete Table Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete table",
        });
    }
};


module.exports = {
    createTable,
    getTables,
    getTableById,
    updateTable,
    deleteTable,
};