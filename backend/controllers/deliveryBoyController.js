const User = require("../models/User");

const getActiveDeliveryBoys = async (req, res) => {
    try {
        const deliveryBoys = await User.find({
            role: "delivery_boy",
            isActive: true,
        })
            .select("_id name email phone")
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            deliveryBoys,
        });
    } catch (error) {
        console.error("Get delivery boys error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch delivery boys",
        });
    }
};

module.exports = { getActiveDeliveryBoys };