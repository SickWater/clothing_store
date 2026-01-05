// backend/routes/adminRoutes.js - SIMPLE WORKING VERSION
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "swishdrip-admin-secret-2024";

// ==================== ADMIN AUTHENTICATION ====================

// ADMIN LOGIN (SIMPLIFIED - WORKS WITH DEFAULT CREDENTIALS)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("🔐 Admin login attempt for:", email);
    
    // Check default admin credentials
    const defaultAdminEmail = "admin@swishdrip.com";
    const defaultAdminPassword = process.env.ADMIN_PASSWORD || "admin123";
    
    if (email === defaultAdminEmail && password === defaultAdminPassword) {
      // Create token for default admin
      const token = jwt.sign(
        { 
          email: defaultAdminEmail,
          role: "admin",
          name: "Swish Drip Admin",
          isDefault: true
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      console.log("✅ Default admin login successful");
      
      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          email: defaultAdminEmail,
          name: "Swish Drip Admin",
          role: "admin",
          isDefault: true
        }
      });
    }
    
    // Check database for admin users
    const user = await User.findOne({ email });
    
    if (user) {
      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required."
        });
      }
      
      // Verify password
      if (user.passwordHash) {
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        
        if (isValidPassword) {
          const token = jwt.sign(
            { 
              id: user._id,
              email: user.email,
              role: user.role,
              name: user.name
            },
            JWT_SECRET,
            { expiresIn: "7d" }
          );
          
          console.log(`✅ Admin login successful: ${user.email}`);
          
          return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
              id: user._id,
              email: user.email,
              name: user.name,
              role: user.role
            }
          });
        }
      }
    }
    
    // If we get here, credentials are invalid
    console.log("❌ Admin login failed: Invalid credentials");
    res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
    
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
});

// VERIFY TOKEN (OPTIONAL - FOR FUTURE USE)
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      success: true,
      message: "Token is valid",
      user: decoded
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message
    });
  }
});

// ==================== ADMIN DASHBOARD ====================

// GET DASHBOARD STATISTICS
router.get("/dashboard/stats", async (req, res) => {
  try {
    console.log("📊 Getting dashboard stats");
    
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      totalUsers
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      User.countDocuments()
    ]);
    
    // Get low stock products
    const lowStockProducts = await Product.find({
      $or: [
        { sizes: { $elemMatch: { stock: { $lt: 5 } } } },
        { totalStock: { $lt: 10 } }
      ],
      isActive: true
    }).limit(5);
    
    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        totalOrders,
        pendingOrders,
        deliveredOrders: totalOrders - pendingOrders,
        totalUsers,
        lowStockCount: lowStockProducts.length
      },
      lowStockProducts: lowStockProducts.map(p => ({
        id: p._id,
        name: p.name,
        totalStock: p.totalStock,
        category: p.category,
        price: p.price
      }))
    });
    
  } catch (error) {
    console.error("❌ Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
      error: error.message
    });
  }
});

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user has admin role
    if (decoded.role !== 'admin' && !decoded.isDefault) {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// Apply to all admin routes
router.use(requireAdmin); // Add this line after login route

export default router;