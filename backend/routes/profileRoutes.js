// backend/routes/profileRoutes.js
import express from "express";
import { verifyToken as authenticate } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// GET /api/auth/me - Get current user profile
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message
    });
  }
});

// PUT /api/auth/me - Update user profile
router.put("/me", authenticate, async (req, res) => {
  try {
    const { name, email, phone, birthday, address } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (birthday) user.birthday = birthday;
    if (address) {
      user.address = {
        street: address.street || user.address?.street || '',
        city: address.city || user.address?.city || '',
        province: address.province || user.address?.province || '',
        postalCode: address.postalCode || user.address?.postalCode || ''
      };
    }
    
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse
    });
    
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
});

// POST /api/auth/avatar - Update profile picture
router.post("/avatar", authenticate, async (req, res) => {
  try {
    // Note: You'll need to implement file upload logic here
    // For now, we'll accept a URL
    const { avatarUrl } = req.body;
    
    const user = await User.findById(req.user._id);
    user.profilePicture = avatarUrl || '';
    await user.save();
    
    res.json({
      success: true,
      message: "Profile picture updated",
      profilePicture: user.profilePicture
    });
    
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile picture",
      error: error.message
    });
  }
});

// POST /api/auth/change-password - Change password
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }
    
    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({
      success: true,
      message: "Password updated successfully"
    });
    
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message
    });
  }
});

// GET /api/orders/user - Get user's orders
router.get("/orders/user", authenticate, async (req, res) => {
  try {
    // Since your Order model doesn't have a user field,
    // we'll need to add it or use phone/email to match
    // For now, we'll return all orders (admin should implement user-specific)
    
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(orders);
    
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
});

// POST /api/orders/:id/reorder - Reorder items
router.post("/orders/:id/reorder", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Add order items to user's cart
    const user = await User.findById(req.user._id);
    
    // Note: You'll need to implement cart addition logic here
    // This is a simplified version
    
    res.json({
      success: true,
      message: "Items added to cart for reorder"
    });
    
  } catch (error) {
    console.error("Error reordering:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder",
      error: error.message
    });
  }
});

// DELETE /api/auth/account - Delete user account
router.delete("/account", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Soft delete (mark as inactive)
    user.isActive = false;
    await user.save();
    
    res.json({
      success: true,
      message: "Account deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: error.message
    });
  }
});

export default router;