const mongoose = require("mongoose");
const GeneralProduct = require("../models/GeneralProduct");
// GET /api/admin/general-products
const getGeneralProducts = async (req, res) => {
try {
const { search, category, lowStock } = req.query;
const filter = { isActive: true };

if (category) {
  filter.category = category;
}

if (lowStock === "true") {
  filter.$expr = { $lte: ["$stock", "$lowStockAlert"] };
}

if (search) {
  const keyword = search.trim();
  filter.$or = [
    { name: { $regex: keyword, $options: "i" } },
    { barcode: keyword },
    { category: { $regex: keyword, $options: "i" } },
  ];
}

const products = await GeneralProduct.find(filter).sort({
  name: 1,
});

return res.status(200).json({
  success: true,
  count: products.length,
  products,
});

} catch (error) {
return res.status(500).json({
success: false,
message: "Failed to fetch products",
error: error.message,
});
}
};
// POST /api/admin/general-products
const createGeneralProduct = async (req, res) => {
try {
const {
name,
barcode,
category,
unit,
purchasePrice,
sellingPrice,
stock,
lowStockAlert,
expiryDate,
} = req.body;
if (
  !name?.trim() ||
  !category?.trim() ||
  purchasePrice === undefined ||
  sellingPrice === undefined ||
  stock === undefined
) {
  return res.status(400).json({
    success: false,
    message:
      "Name, category, purchase price, selling price, and stock are required",
  });
}

const purchase = Number(purchasePrice);
const selling = Number(sellingPrice);
const quantity = Number(stock);
const alertLevel = lowStockAlert === undefined ? 5 : Number(lowStockAlert);

if (
  !Number.isFinite(purchase) ||
  !Number.isFinite(selling) ||
  !Number.isFinite(quantity) ||
  !Number.isFinite(alertLevel) ||
  purchase < 0 ||
  selling < 0 ||
  quantity < 0 ||
  alertLevel < 0
) {
  return res.status(400).json({
    success: false,
    message: "Prices, stock, and low-stock alert must be valid non-negative numbers",
  });
}

const normalizedBarcode =
  typeof barcode === "string" && barcode.trim()
    ? barcode.trim()
    : undefined;

if (normalizedBarcode) {
  const existing = await GeneralProduct.findOne({
    barcode: normalizedBarcode,
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "This barcode is already assigned to another product",
    });
  }
}

const product = await GeneralProduct.create({
  name: name.trim(),
  barcode: normalizedBarcode,
  category: category.trim(),
  unit,
  purchasePrice: purchase,
  sellingPrice: selling,
  stock: quantity,
  lowStockAlert: alertLevel,
  expiryDate: expiryDate || null,
});

return res.status(201).json({
  success: true,
  message: "Product created successfully",
  product,
});

} catch (error) {
if (error.code === 11000) {
return res.status(409).json({
success: false,
message: "Barcode already exists",
});
}
if (error instanceof mongoose.Error.ValidationError) {
  return res.status(400).json({
    success: false,
    message: error.message,
  });
}

return res.status(500).json({
  success: false,
  message: "Failed to create product",
  error: error.message,
});

}
};
// GET /api/admin/general-products/barcode/:barcode
const getGeneralProductByBarcode = async (req, res) => {
try {
const barcode = req.params.barcode.trim();
const product = await GeneralProduct.findOne({
  barcode,
  isActive: true,
});

if (!product) {
  return res.status(404).json({
    success: false,
    message: "No active product found for this barcode",
  });
}

return res.status(200).json({
  success: true,
  product,
});

} catch (error) {
return res.status(500).json({
success: false,
message: "Failed to find product by barcode",
error: error.message,
});
}
};
// PUT /api/admin/general-products/:id
const updateGeneralProduct = async (req, res) => {
try {
const { id } = req.params;
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({
    success: false,
    message: "Invalid product ID",
  });
}

const allowedFields = [
  "name",
  "barcode",
  "category",
  "unit",
  "purchasePrice",
  "sellingPrice",
  "stock",
  "lowStockAlert",
  "expiryDate",
  "isActive",
];

const updates = {};

for (const field of allowedFields) {
  if (Object.prototype.hasOwnProperty.call(req.body, field)) {
    updates[field] = req.body[field];
  }
}

if (typeof updates.barcode === "string") {
  updates.barcode = updates.barcode.trim() || undefined;
}

for (const field of [
  "purchasePrice",
  "sellingPrice",
  "stock",
  "lowStockAlert",
]) {
  if (updates[field] !== undefined) {
    updates[field] = Number(updates[field]);

    if (
      !Number.isFinite(updates[field]) ||
      updates[field] < 0
    ) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a valid non-negative number`,
      });
    }
  }
}

const product = await GeneralProduct.findByIdAndUpdate(
  id,
  { $set: updates },
  { new: true, runValidators: true }
);

if (!product) {
  return res.status(404).json({
    success: false,
    message: "Product not found",
  });
}

return res.status(200).json({
  success: true,
  message: "Product updated successfully",
  product,
});

} catch (error) {
if (error.code === 11000) {
return res.status(409).json({
success: false,
message: "Barcode already exists",
});
}
return res.status(500).json({
  success: false,
  message: "Failed to update product",
  error: error.message,
});

}
};
// DELETE /api/admin/general-products/:id
// Soft delete: preserves previous bills and stock records.
const deactivateGeneralProduct = async (req, res) => {
try {
const { id } = req.params;
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({
    success: false,
    message: "Invalid product ID",
  });
}

const product = await GeneralProduct.findByIdAndUpdate(
  id,
  { $set: { isActive: false } },
  { new: true }
);

if (!product) {
  return res.status(404).json({
    success: false,
    message: "Product not found",
  });
}

return res.status(200).json({
  success: true,
  message: "Product deactivated successfully",
  product,
});

} catch (error) {
return res.status(500).json({
success: false,
message: "Failed to deactivate product",
error: error.message,
});
}
};
module.exports = {
getGeneralProducts,
createGeneralProduct,
getGeneralProductByBarcode,
updateGeneralProduct,
deactivateGeneralProduct,
};
