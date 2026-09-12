import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Ensure temp upload dir exists for fallback
const uploadDir = 'uploads/temp';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

// Storage configuration
let docStorage;
let phStorage;

if (isCloudinaryConfigured) {
  docStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: any, file: any) => ({
      folder: "ngcms/documents",
      format: file.mimetype.split("/")[1],
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    }),
  });

  phStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: any, file: any) => ({
      folder: "ngcms/photos",
      transformation: [{ width: 500, height: 500, crop: "fill" }],
      format: "jpg",
      public_id: `${Date.now()}-photo`,
    }),
  });
} else {
  console.warn("CLOUDINARY NOT CONFIGURED: Falling back to Local Disk Storage.");
  const localDir = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
  docStorage = localDir;
  phStorage = localDir;
}

export const uploadDocument = multer({ storage: docStorage });
export const uploadPhoto = multer({ storage: phStorage });

export default cloudinary;
