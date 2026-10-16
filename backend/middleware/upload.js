
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "food-images"
);

// Create the directory if it does not exist.
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
]);

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDirectory);
    },

    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

        callback(null, uniqueName);
    },
});

const fileFilter = (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
        allowedMimeTypes.has(file.mimetype) &&
        allowedExtensions.has(extension)
    ) {
        return callback(null, true);
    }

    return callback(
        new Error("Only JPG, PNG, WebP, and GIF images are allowed.")
    );
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

module.exports = upload;
