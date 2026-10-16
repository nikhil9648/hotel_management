const mongoose = require("mongoose");
const GeneralProduct = require("../models/GeneralProduct");
const GeneralBill = require("../models/GeneralBill");

// Generate a unique bill number.
const generateBillNumber = () => {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  return `POS-${datePart}-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}`;
};

// POST /api/admin/general-bills
const createGeneralBill = async (req, res) => {
  const updatedProducts = [];

  try {
    const {
  items,
  discount = 0,
  taxRate = 0,
  paymentMethod,
  amountReceived = 0,
  customerName = "Walk-in Customer",
  customerPhone = "",
} = req.body;

    // Validate items.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one product to the bill.",
      });
    }

    // This controller currently supports cash payments only.
    if (paymentMethod !== "cash") {
      return res.status(400).json({
        success: false,
        message: "Only cash payments are currently enabled.",
      });
    }

    const parsedDiscount = Number(discount);
    const parsedTaxRate = Number(taxRate);
    const received = Number(amountReceived);

    if (
      !Number.isFinite(parsedDiscount) ||
      !Number.isFinite(parsedTaxRate) ||
      !Number.isFinite(received) ||
      parsedDiscount < 0 ||
      parsedTaxRate < 0 ||
      parsedTaxRate > 100 ||
      received < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount, tax rate, or cash received.",
      });
    }

    // Combine duplicate product IDs.
    const quantities = new Map();

    for (const item of items) {
      const productId = String(item.productId || "");
      const quantity = Number(item.quantity);

      if (
        !mongoose.Types.ObjectId.isValid(productId) ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID or quantity.",
        });
      }

      quantities.set(
        productId,
        (quantities.get(productId) || 0) + quantity
      );
    }

    const productIds = [...quantities.keys()];

    const products = await GeneralProduct.find({
      _id: { $in: productIds },
      isActive: true,
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are unavailable.",
      });
    }

    // Calculate prices using database values.
    let subtotalPaise = 0;
    const billItems = [];

    for (const product of products) {
      const quantity = quantities.get(String(product._id));

      if (product.stock < quantity) {
        return res.status(409).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      const unitPricePaise = Math.round(
        Number(product.sellingPrice) * 100
      );

      const lineTotalPaise = unitPricePaise * quantity;

      subtotalPaise += lineTotalPaise;

      billItems.push({
        product: product._id,
        name: product.name,
        barcode: product.barcode || null,
        quantity,
        unitPrice: unitPricePaise / 100,
        lineTotal: lineTotalPaise / 100,
      });
    }

    const discountPaise = Math.round(parsedDiscount * 100);

    if (discountPaise > subtotalPaise) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot exceed the subtotal.",
      });
    }

    const taxablePaise = subtotalPaise - discountPaise;

    const taxPaise = Math.round(
      (taxablePaise * parsedTaxRate) / 100
    );

    const totalPaise = taxablePaise + taxPaise;
    const total = totalPaise / 100;

    if (received < total) {
      return res.status(400).json({
        success: false,
        message: "Cash received must be at least the bill total.",
      });
    }

    // Reserve stock with conditional updates.
    // This avoids deducting stock that is no longer available.
    for (const product of products) {
      const quantity = quantities.get(String(product._id));

      const updated = await GeneralProduct.updateOne(
        {
          _id: product._id,
          isActive: true,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        }
      );

      if (updated.modifiedCount !== 1) {
        throw new Error(
          `STOCK_ERROR: Insufficient stock for ${product.name}.`
        );
      }

      updatedProducts.push({
        productId: product._id,
        quantity,
      });
    }

    // Create the bill after stock has been reserved.
    const createdBill = await GeneralBill.create({
      customerName: String(customerName || "").trim() || "Walk-in Customer",
customerPhone: String(customerPhone || "").trim(),
      billNumber: generateBillNumber(),
      items: billItems,
      subtotal: subtotalPaise / 100,
      discount: discountPaise / 100,
      tax: taxPaise / 100,
      total,
      paymentMethod: "cash",
      paymentStatus: "paid",
      amountReceived: received,
      createdBy: req.user._id,
      paidAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Bill created successfully.",
      bill: createdBill,
      change: Math.round((received - total) * 100) / 100,
    });
  } catch (error) {
    console.error("Create general bill error:", error);

    // If bill creation fails after stock was deducted,
    // attempt to restore the deducted quantities.
    if (updatedProducts.length > 0) {
      for (const item of [...updatedProducts].reverse()) {
        try {
          await GeneralProduct.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } }
          );
        } catch (rollbackError) {
          console.error(
            "CRITICAL: Stock restoration failed:",
            item.productId,
            rollbackError
          );
        }
      }
    }

    if (error.message?.startsWith("STOCK_ERROR:")) {
      return res.status(409).json({
        success: false,
        message: error.message.replace("STOCK_ERROR: ", ""),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bill number conflict. Please retry.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create bill.",
      error: error.message,
    });
  }
};

// GET /api/admin/general-bills
const getGeneralBills = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {};

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {};

      if (req.query.from) {
        const from = new Date(req.query.from);

        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date.",
          });
        }

        filter.createdAt.$gte = from;
      }

      if (req.query.to) {
        const to = new Date(req.query.to);

        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date.",
          });
        }

        filter.createdAt.$lte = to;
      }
    }

    const [bills, totalCount] = await Promise.all([
      GeneralBill.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      GeneralBill.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      bills,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Fetch general bills error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bills.",
      error: error.message,
    });
  }
};

// GET /api/admin/general-bills/:id
const getGeneralBillById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID.",
      });
    }

    const bill = await GeneralBill.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found.",
      });
    }

    return res.status(200).json({
      success: true,
      bill,
    });
  } catch (error) {
    console.error("Fetch general bill error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bill.",
      error: error.message,
    });
  }
};

// GET /api/admin/general-billing-report
const getGeneralBillingReport = async (req, res) => {
  try {
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(new Date().setHours(0, 0, 0, 0));

    const to = req.query.to
      ? new Date(req.query.to)
      : new Date();

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid report date range.",
      });
    }

    const [summary] = await GeneralBill.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalSales: { $sum: "$total" },
          totalDiscount: { $sum: "$discount" },
          totalTax: { $sum: "$tax" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      report: summary || {
        totalBills: 0,
        totalSales: 0,
        totalDiscount: 0,
        totalTax: 0,
      },
      from,
      to,
    });
  } catch (error) {
    console.error("General billing report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate report.",
      error: error.message,
    });
  }
};

module.exports = {
  createGeneralBill,
  getGeneralBills,
  getGeneralBillById,
  getGeneralBillingReport,
};