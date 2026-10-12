const mongoose = require("mongoose");

const KOT = require("../models/KOT");
const RestaurantOrder = require("../models/RestaurantOrder");

// =====================================================
// Generate KOT Number
// =====================================================

const generateKOTNumber = async () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const prefix = `KOT-${year}${month}${day}`;

    const lastKOT = await KOT.findOne({
        kotNumber: {
            $regex: `^${prefix}-`,
        },
    }).sort({
        createdAt: -1,
    });

    let sequence = 1;

    if (lastKOT) {
        const parts = lastKOT.kotNumber.split("-");
        const lastSequence = parseInt(parts[2], 10);

        if (!Number.isNaN(lastSequence)) {
            sequence = lastSequence + 1;
        }
    }

    return `${prefix}-${String(sequence).padStart(4, "0")}`;
};


// =====================================================
// CREATE KOT
// Waiter places food order
// =====================================================

const createKOT = async (req, res) => {
    try {
        const {
            table,
            order,
            items,
            kitchenNote,
        } = req.body || {};

        // ---------------------------------------------
        // Validation
        // ---------------------------------------------

        if (!table || !order || !items || !items.length) {
            return res.status(400).json({
                success: false,
                message:
                    "Table, order and food items are required",
            });
        }

        // ---------------------------------------------
        // Validate IDs
        // ---------------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(table) ||
            !mongoose.Types.ObjectId.isValid(order)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid table or order ID",
            });
        }

        // ---------------------------------------------
        // Find Order
        // ---------------------------------------------

        const existingOrder =
    await RestaurantOrder.findById(order);

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // ---------------------------------------------
        // Generate KOT Number
        // ---------------------------------------------

        const kotNumber = await generateKOTNumber();

        // ---------------------------------------------
        // Create KOT
        // ---------------------------------------------

        const kot = await KOT.create({
            table,

            order,

            waiter: req.user._id,

            kotNumber,

            items,

            kitchenNote:
                kitchenNote || "",

            status: "pending",
        });

        // ---------------------------------------------
        // Populate KOT
        // ---------------------------------------------

        const populatedKOT =
            await KOT.findById(kot._id)
                .populate(
                    "table"
                )
                .populate(
                    "waiter",
                    "name email"
                )
                .populate(
                    "items.foodItem",
                    "name price foodType"
                );

        return res.status(201).json({
            success: true,

            message:
                "KOT created successfully",

            kot: populatedKOT,
        });

    } catch (error) {

        console.error(
            "Create KOT Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create KOT",
        });
    }
};


// =====================================================
// GET ALL KOTS
// Kitchen Dashboard
// =====================================================

const getKOTs = async (req, res) => {
    try {

        const {
            status,
            table,
        } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (table) {

            if (
                !mongoose.Types.ObjectId.isValid(
                    table
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid table ID",
                });
            }

            filter.table = table;
        }

        const kots =
            await KOT.find(filter)
                .populate(
                    "table"
                )
                .populate(
                    "waiter",
                    "name email"
                )
                .populate(
                    "items.foodItem",
                    "name price foodType"
                )
                .sort({
                    createdAt: 1,
                });

        return res.status(200).json({
            success: true,

            count: kots.length,

            kots,
        });

    } catch (error) {

        console.error(
            "Get KOTs Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch KOTs",
        });
    }
};


// =====================================================
// GET SINGLE KOT
// =====================================================

const getKOTById = async (req, res) => {
    try {

        const {
            id,
        } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid KOT ID",
            });
        }

        const kot =
            await KOT.findById(id)
                .populate("table")
                .populate(
                    "waiter",
                    "name email"
                )
                .populate(
                    "items.foodItem",
                    "name price foodType"
                );

        if (!kot) {
            return res.status(404).json({
                success: false,
                message: "KOT not found",
            });
        }

        return res.status(200).json({
            success: true,
            kot,
        });

    } catch (error) {

        console.error(
            "Get KOT Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch KOT",
        });
    }
};


// =====================================================
// UPDATE KOT STATUS
// Kitchen uses this
// =====================================================

const updateKOTStatus = async (req, res) => {
    try {

        const {
            status,
        } = req.body || {};

        const {
            id,
        } = req.params;

        const validStatuses = [
            "pending",
            "preparing",
            "ready",
            "served",
            "cancelled",
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid KOT status",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid KOT ID",
            });
        }

        const kot =
            await KOT.findById(id);

        if (!kot) {
            return res.status(404).json({
                success: false,
                message: "KOT not found",
            });
        }

        kot.status = status;

        // ---------------------------------------------
        // Status timestamps
        // ---------------------------------------------

        if (status === "preparing") {
            kot.acceptedAt = new Date();
        }

        if (status === "ready") {
            kot.readyAt = new Date();
        }

        if (status === "served") {
            kot.servedAt = new Date();
        }

        await kot.save();

        const updatedKOT =
            await KOT.findById(kot._id)
                .populate("table")
                .populate(
                    "waiter",
                    "name email"
                )
                .populate(
                    "items.foodItem",
                    "name price foodType"
                );

        return res.status(200).json({
            success: true,

            message:
                `KOT marked as ${status}`,

            kot: updatedKOT,
        });

    } catch (error) {

        console.error(
            "Update KOT Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update KOT status",
        });
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    createKOT,
    getKOTs,
    getKOTById,
    updateKOTStatus,
};