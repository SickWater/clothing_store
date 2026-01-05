// backend/server.js - WORKING VERSION
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

// Import Google OAuth config
import "./config/googleOAuth.js";

dotenv.config();
const app = express();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Session configuration (for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'swish-drip-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration - ALLOW ALL for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// Body parser limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect DB
connectDB();

// ==================== DEBUG ENDPOINTS ====================

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "connected",
    message: "Swish Drip Backend is Running"
  });
});

// Database status
app.get("/api/db-status", async (req, res) => {
  try {
    const Product = (await import("./models/Product.js")).default;
    const count = await Product.countDocuments();
    res.json({
      status: "connected",
      productCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message
    });
  }
});

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    endpoints: {
      products: "/api/products",
      adminLogin: "/api/admin/login (POST)",
      auth: "/api/auth",
      uploads: "/uploads"
    }
  });
});

// ==================== MOUNT ROUTES ====================

app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/auth", profileRoutes); 

// ==================== ROOT ROUTE ====================

app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Swish Drip Store Backend",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      products: "/api/products",
      admin: "/api/admin",
      test: "/api/test",
      dbStatus: "/api/db-status"
    },
    documentation: "Check /api/test for available endpoints"
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    requested: req.originalUrl,
    availableRoutes: [
      "/health",
      "/api/test",
      "/api/db-status",
      "/api/products",
      "/api/admin/login",
      "/api/auth/login"
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  =========================================
  🚀 Swish Drip Backend Server Started
  =========================================
  Local: http://localhost:${PORT}
  
  Health Check: http://localhost:${PORT}/health
  Database Status: http://localhost:${PORT}/api/db-status
  API Test: http://localhost:${PORT}/api/test
  Products: http://localhost:${PORT}/api/products
  
  Admin Login: admin@swishdrip.com / admin123
  
  =========================================
  `);
});