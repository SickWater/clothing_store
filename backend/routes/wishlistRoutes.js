// backend/routes/wishlistRoutes.js
import express from "express";
import { verifyToken as authenticate } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Product from "../models/Product.js";

const router = express.Router();

// GET /api/wishlist - Get user's wishlist
router.get("/", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.json({
      success: true,
      wishlist: user.wishlist || []
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
      error: error.message
    });
  }
});

// POST /api/wishlist/add - Add product to wishlist
router.post("/add", authenticate, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Add to user's wishlist (avoid duplicates)
    const user = await User.findById(req.user._id);
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    
    res.json({
      success: true,
      message: "Product added to wishlist",
      wishlist: user.wishlist
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add to wishlist",
      error: error.message
    });
  }
});

// POST /api/wishlist/remove - Remove product from wishlist
router.post("/remove", authenticate, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }
    
    // Remove from user's wishlist
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    
    res.json({
      success: true,
      message: "Product removed from wishlist",
      wishlist: user.wishlist
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove from wishlist",
      error: error.message
    });
  }
});

// POST /api/wishlist/clear - Clear wishlist
router.post("/clear", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = [];
    await user.save();
    
    res.json({
      success: true,
      message: "Wishlist cleared"
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
      error: error.message
    });
  }
});

export default router;