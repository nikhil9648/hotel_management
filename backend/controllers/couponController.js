
const Coupon = require("../models/Coupon");

exports.validateCoupon = async (req, res) => {
  try {
    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();

    const subtotal = Number(req.body?.subtotal);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Enter a coupon code.",
      });
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
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
      new Date(coupon.expiresAt).getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired.",
      });
    }

    const minimum = Number(coupon.minOrderAmount || 0);

    if (subtotal < minimum) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${minimum}.`,
      });
    }

    let discountAmount;

    if (coupon.discountType === "percentage") {
      discountAmount =
        (subtotal * Number(coupon.discountValue)) / 100;

      if (coupon.maxDiscount != null) {
        discountAmount = Math.min(
          discountAmount,
          Number(coupon.maxDiscount)
        );
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    discountAmount = Math.round(
      Math.min(Math.max(discountAmount, 0), subtotal) * 100
    ) / 100;

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount,
    });
  } catch (error) {
    console.error("Validate coupon error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to validate coupon.",
    });
  }
};
