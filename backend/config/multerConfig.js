// backend/config/multerConfig.js

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp, svg)"));
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create year-month folder for better organization
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uploadPath = path.join(uploadDir, `${year}-${month}`);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    
    // Clean the original filename
    const originalName = path.parse(file.originalname).name;
    const safeName = originalName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .toLowerCase()
      .substring(0, 50);
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    cb(null, `${safeName}_${uniqueSuffix}${ext}`);
  }
});

// Multiple upload configurations
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Max 10 files per upload
  }
});

// Single image upload (for main product image)
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single("image");

// Multiple images upload (for product gallery)
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024,
    files: 10
  }
}).array("images", 10);

// Avatar upload (for user profiles)
export const uploadAvatar = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, jpg, png, webp)"));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB for avatars
}).single("avatar");

// Helper function to delete uploaded files on error
export const deleteUploadedFiles = (files) => {
  if (!files) return;
  
  if (Array.isArray(files)) {
    files.forEach(file => {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  } else if (files.path && fs.existsSync(files.path)) {
    fs.unlinkSync(files.path);
  }
};

// Helper to get file URL
export const getFileUrl = (filename) => {
  if (!filename) return "";
  
  const match = filename.match(/(\d{4}-\d{2})\/.*$/);
  if (match) {
    return `/uploads/${filename}`;
  }
  
  return `/uploads/${filename}`;
};

export default upload;
