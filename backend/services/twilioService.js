
const twilio = require("twilio");

// Convert Indian mobile numbers into international format.
function normalizePhone(phone) {
  let value = String(phone || "").trim().replace(/[\s()-]/g, "");

  if (/^\d{10}$/.test(value)) {
    value = `+91${value}`;
  } else if (/^91\d{10}$/.test(value)) {
    value = `+${value}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    throw new Error("Invalid customer phone number.");
  }

  return value;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!sid || !token) {
    throw new Error("Twilio Account SID or Auth Token is missing.");
  }

  if (!/^AC[0-9a-fA-F]{32}$/.test(sid)) {
    throw new Error("Invalid TWILIO_ACCOUNT_SID.");
  }

  return twilio(sid, token);
}

function getContentVariables(bill) {
  const amount = Number(bill.paidAmount ?? bill.totalAmount ?? 0);

  return JSON.stringify({
    "1": String(bill.billNumber || "N/A"),
    "2": String(bill.customerName || "Customer"),
    "3": amount.toFixed(2),
    "4": String(bill.paymentMethod || "N/A"),
  });
}

async function sendSMS(phone, bill) {
  const from = process.env.TWILIO_SMS_FROM?.trim();
  const contentSid = process.env.TWILIO_SMS_CONTENT_SID?.trim();

  if (!from) throw new Error("TWILIO_SMS_FROM is missing.");
  if (!contentSid) throw new Error("TWILIO_SMS_CONTENT_SID is missing.");

  if (!/^\+?[1-9]\d{7,14}$/.test(from)) {
    throw new Error(
      "TWILIO_SMS_FROM must be a valid SMS sender number."
    );
  }

  if (!/^HX[0-9a-fA-F]{32}$/.test(contentSid)) {
    throw new Error("Invalid TWILIO_SMS_CONTENT_SID.");
  }

  const message = await getClient().messages.create({
    to: normalizePhone(phone),
    from,
    contentSid,
    contentVariables: getContentVariables(bill),
  });

  console.log("SMS submitted:", message.sid, message.status);

  return { sid: message.sid, status: message.status };
}

async function sendWhatsAppText(phone, bill) {
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();

  if (!from) throw new Error("TWILIO_WHATSAPP_FROM is missing.");
  if (!contentSid) {
    throw new Error("TWILIO_WHATSAPP_CONTENT_SID is missing.");
  }

  if (!from.startsWith("whatsapp:+")) {
    throw new Error(
      "TWILIO_WHATSAPP_FROM must look like whatsapp:+14155238886."
    );
  }

  if (!/^HX[0-9a-fA-F]{32}$/.test(contentSid)) {
    throw new Error("Invalid TWILIO_WHATSAPP_CONTENT_SID.");
  }

  const message = await getClient().messages.create({
    to: `whatsapp:${normalizePhone(phone)}`,
    from,
    contentSid,
    contentVariables: getContentVariables(bill),
  });

  console.log("WhatsApp submitted:", message.sid, message.status);

  return { sid: message.sid, status: message.status };
}

module.exports = {
  normalizePhone,
  sendSMS,
  sendWhatsAppText,
};
