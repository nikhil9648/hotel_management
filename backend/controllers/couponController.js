
const Coupon = require("../models/Coupon");

exports.validateCoupon = async (req, res) => {
    try {
        const code = String(req.body.code || "")
            .trim()
            .toUpperCase();

        const subtotal = Number(req.body.subtotal);

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Enter a coupon code.",
            });
        }

        if (!Number.isFinite(subtotal) || subtotal < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order subtotal.",
            });
        }

        const coupon = await Coupon.findOne({
            code,
            isActive: true,
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Invalid or inactive coupon.",
            });
        }

        if (
            coupon.expiresAt &&
            new Date(coupon.expiresAt) < new Date()
        ) {
            return res.status(400).json({
                success: false,
                message: "This coupon has expired.",
            });
        }

        if (subtotal < coupon.minOrderAmount) {
            return res.status(400).json({
                success: false,
                message:
                    `Minimum order amount is ₹${coupon.minOrderAmount}.`,
            });
        }

        let discountAmount = 0;

        if (coupon.discountType === "percentage") {
            discountAmount =
                subtotal * coupon.discountValue / 100;

            if (coupon.maxDiscount != null) {
                discountAmount = Math.min(
                    discountAmount,
                    coupon.maxDiscount
                );
            }
        } else {
            discountAmount = coupon.discountValue;
        }

        discountAmount = Math.min(
            Math.max(0, discountAmount),
            subtotal
        );

        return res.json({
            success: true,
            message: "Coupon applied successfully.",
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
            },
            discountAmount: Number(discountAmount.toFixed(2)),
        });
    } catch (error) {
        console.error("Validate coupon error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to validate coupon.",
        });
    }
};
