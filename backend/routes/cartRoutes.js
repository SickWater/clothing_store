// backend/routes/cartRoutes.js
import express from "express";
import { verifyToken as authenticate } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Product from "../models/Product.js";

const router = express.Router();
router.use(authenticate);

// GET /api/cart/   -> get user's cart (populated)
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.productId");
    return res.json(user.cart || []);
  } catch (err) {
    console.error("GET /api/cart error:", err);
    res.status(500).json({ message: "Failed to load cart", error: err.message });
  }
});

// POST /api/cart/add  { productId, size, quantity }
router.post("/add", async (req, res) => {
  try {
    const { productId, size = null, quantity = 1 } = req.body;
    const user = await User.findById(req.user._id);
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // optional stock check
    if (size) {
      const sizeObj = product.sizes.find(s => String(s.size) === String(size));
      if (sizeObj && sizeObj.stock < quantity) return res.status(400).json({ message: "Not enough stock" });
    }

    const idx = user.cart.findIndex(i => String(i.productId) === String(productId) && (i.size || null) === (size || null));
    if (idx !== -1) {
      user.cart[idx].quantity = user.cart[idx].quantity + Number(quantity);
    } else {
      user.cart.push({
        productId,
        size,
        quantity: Number(quantity),
        price: product.sale ? product.salePrice : product.price
      });
    }
    await user.save();
    const populated = await User.findById(user._id).populate("cart.productId");
    res.json(populated.cart);
  } catch (err) {
    console.error("POST /api/cart/add error:", err);
    res.status(500).json({ message: "Failed to add to cart", error: err.message });
  }
});

// POST /api/cart/update { productId, size, quantity }
router.post("/update", async (req, res) => {
  try {
    const { productId, size = null, quantity } = req.body;
    const user = await User.findById(req.user._id);
    const idx = user.cart.findIndex(i => String(i.productId) === String(productId) && (i.size||null) === (size||null));
    if (idx === -1) return res.status(404).json({ message: "Item not in cart" });

    if (quantity <= 0) {
      user.cart.splice(idx, 1);
    } else {
      user.cart[idx].quantity = Number(quantity);
    }
    await user.save();
    const populated = await User.findById(user._id).populate("cart.productId");
    res.json(populated.cart);
  } catch (err) {
    console.error("POST /api/cart/update error:", err);
    res.status(500).json({ message: "Failed to update cart", error: err.message });
  }
});

// POST /api/cart/clear
router.post("/clear", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("POST /api/cart/clear error:", err);
    res.status(500).json({ message: "Failed to clear cart", error: err.message });
  }
});

export default router;
