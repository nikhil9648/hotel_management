
const PDFDocument = require("pdfkit");

const formatMoney = (amount) =>
  `Rs. ${Number(amount || 0).toFixed(2)}`;

const getFoodName = (item) => {
  return (
    item.name ||
    item.foodName ||
    item.food?.name ||
    item.foodItem?.name ||
    "Food Item"
  );
};

const getAddress = (address) => {
  if (!address) return "Not provided";

  if (typeof address === "string") return address;

  return [
    address.street,
    address.address,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ") || "Not provided";
};

const generateRestaurantInvoice = (order, customer = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 45,
        bufferPages: true,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Header
      doc.font("Helvetica-Bold")
        .fontSize(22)
        .text("HOTEL & RESTAURANT", { align: "center" });

      doc.font("Helvetica")
        .fontSize(11)
        .text("TAX INVOICE", { align: "center" });

      doc.moveDown(1.5);

      doc.moveTo(45, doc.y)
        .lineTo(550, doc.y)
        .strokeColor("#cccccc")
        .stroke();

      doc.moveDown();

      // Invoice information
      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text("Invoice Details");

      doc.font("Helvetica")
        .fontSize(10)
        .moveDown(0.5);

      doc.text(`Invoice No: ${order.invoiceNumber || order._id}`);
      doc.text(`Order ID: ${order._id}`);
      doc.text(
        `Date: ${new Date(
          order.paymentVerifiedAt || order.createdAt || Date.now()
        ).toLocaleString("en-IN")}`
      );
      doc.text(`Payment Method: ${order.paymentMethod || "Razorpay"}`);
      doc.text(`Payment Status: ${order.paymentStatus || "Paid"}`);

      doc.moveDown();

      // Customer information
      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text("Customer Details");

      doc.font("Helvetica")
        .fontSize(10)
        .moveDown(0.5);

      doc.text(`Name: ${customer.name || order.customerName || "Customer"}`);
      doc.text(`Email: ${customer.email || "N/A"}`);
      doc.text(`Phone: ${order.customerMobile || customer.phone || "N/A"}`);
      doc.text(`Address: ${getAddress(order.deliveryAddress)}`);

      doc.moveDown(1.5);

      // Items
      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text("Order Items");

      doc.moveDown(0.7);

      const drawTableHeader = () => {
        const y = doc.y;

        doc.rect(45, y, 505, 25)
          .fill("#eeeeee");

        doc.fillColor("#111111")
          .font("Helvetica-Bold")
          .fontSize(10);

        doc.text("Item", 55, y + 7, { width: 210 });
        doc.text("Qty", 285, y + 7, { width: 35 });
        doc.text("Price", 345, y + 7, { width: 75 });
        doc.text("Amount", 445, y + 7, { width: 90 });

        doc.y = y + 35;
      };

      drawTableHeader();

      doc.font("Helvetica").fontSize(10);

      for (const item of order.items || []) {
        if (doc.y > 690) {
          doc.addPage();
          drawTableHeader();
        }

        const y = doc.y;

        const quantity = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const amount = Number(item.totalPrice ?? price * quantity);

        doc.font("Helvetica").fontSize(10);

        doc.text(getFoodName(item), 55, y, { width: 210 });
        doc.text(String(quantity), 285, y, { width: 35 });
        doc.text(formatMoney(price), 345, y, { width: 90 });
        doc.text(formatMoney(amount), 445, y, { width: 100 });

        doc.y = Math.max(doc.y, y + 28);
      }

      if (doc.y > 680) {
        doc.addPage();
      }

      doc.moveDown();

      doc.moveTo(45, doc.y)
        .lineTo(550, doc.y)
        .strokeColor("#cccccc")
        .stroke();

      doc.moveDown();

      // Amount summary
      const total = Number(order.totalAmount || 0);
      const tax = Number(order.taxAmount ?? order.tax ?? 0);
      const deliveryFee = Number(order.deliveryFee || 0);
      const subtotal = Number(
        order.subtotal ?? order.subTotal ?? total - tax - deliveryFee
      );

      doc.font("Helvetica")
        .fontSize(11)
        .text(`Subtotal: ${formatMoney(subtotal)}`, {
          align: "right",
        });

      doc.text(`Tax: ${formatMoney(tax)}`, {
        align: "right",
      });

      doc.text(`Delivery Fee: ${formatMoney(deliveryFee)}`, {
        align: "right",
      });

      doc.moveDown(0.5);

      doc.font("Helvetica-Bold")
        .fontSize(14)
        .text(`Grand Total: ${formatMoney(total)}`, {
          align: "right",
        });

      doc.moveDown(2);

      doc.font("Helvetica")
        .fontSize(10)
        .text("Thank you for ordering with us!", {
          align: "center",
        });

      doc.text("This is a computer-generated invoice.", {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateRestaurantInvoice;
