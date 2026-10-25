
const QRCode = require("qrcode");
const crypto = require("crypto");

// Generate one secure token for the complete event booking.
const generateEventTicketToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate QR code containing the ticket verification URL.
const generateEventQr = async (ticketToken) => {
  if (
    typeof ticketToken !== "string" ||
    !/^[a-f0-9]{64}$/i.test(ticketToken)
  ) {
    throw new Error("Invalid event ticket token");
  }

  const frontendUrl = process.env.CLIENT_URL;

  if (!frontendUrl) {
    throw new Error("CLIENT_URL is missing in .env");
  }

  const ticketUrl =
    `${frontendUrl.replace(/\/+$/, "")}/event-ticket/verify/` +
    encodeURIComponent(ticketToken);

  const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 400,
    margin: 2,
  });

  return {
    ticketUrl,
    qrDataUrl,
  };
};

module.exports = {
  generateEventTicketToken,
  generateEventQr,
};
