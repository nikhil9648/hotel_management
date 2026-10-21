
import crypto from "crypto";

export const generateDeliveryOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

export const hashDeliveryOtp = (otp) => {
    return crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");
};

export const verifyDeliveryOtpHash = (otp, storedHash) => {
    if (!storedHash || !/^\d{6}$/.test(String(otp))) {
        return false;
    }

    const inputHash = Buffer.from(hashDeliveryOtp(otp), "hex");
    const savedHash = Buffer.from(storedHash, "hex");

    return (
        inputHash.length === savedHash.length &&
        crypto.timingSafeEqual(inputHash, savedHash)
    );
};
