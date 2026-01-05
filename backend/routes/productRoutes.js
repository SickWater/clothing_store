// backend/routes/productRoutes.js - SIMPLE WORKING VERSION
import express from "express";
import Product from "../models/Product.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

// ==================== PUBLIC ENDPOINTS ====================

// GET ALL PRODUCTS (NO AUTH REQUIRED)
router.get("/", async (req, res) => {
  try {
    console.log("📦 GET /api/products called");
    
    const { raw, category, onSale } = req.query;
    
    // Build query
        // Build query - TEMPORARILY SHOW ALL PRODUCTS
        const query = {};
        console.log('⚠️  SHOWING ALL PRODUCTS (including inactive)');
    
    if (category) {
      query.category = category;
    }
    
    if (onSale === "true") {
      query.sale = true;
    }
    
    // Get products
    const products = await Product.find(query).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${products.length} products`);
    
    // Return in requested format
    if (raw === "true") {
      return res.json(products);
    }
    
    res.json({
      success: true,
      count: products.length,
      products
    });
    
  } catch (error) {
    console.error("❌ Error getting products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
});

// GET SINGLE PRODUCT
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Helper middleware for admin auth (simplified)
const requireAdmin = (req, res, next) => {
  // For now, accept all requests. We'll add proper JWT auth later.
  console.log("🔒 Admin route accessed (auth not implemented yet)");
  next();
};

// ADD PRODUCT
router.post("/", requireAdmin, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 10 }
]), async (req, res) => {
  try {
    const {
      name, description, price, category, clothingType,
      sale, salePrice, brand, sizes, colors, tags
    } = req.body;
    
    // Basic validation
    if (!name || !price || !category || !clothingType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, price, category, clothingType"
      });
    }
    
    // Create product data
    const productData = {
      name,
      description: description || "",
      price: parseFloat(price),
      category,
      clothingType,
      sale: sale === "true",
      salePrice: salePrice ? parseFloat(salePrice) : 0,
      brand: brand || "",
      condition: req.body.condition || "new",
      gender: req.body.gender || "unisex",
      colors: colors ? colors.split(',').map(c => c.trim()) : [],
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      sizes: sizes ? JSON.parse(sizes) : []
    };
    
    // Handle images
    if (req.files?.image) {
      productData.image = `/uploads/${req.files.image[0].filename}`;
    }
    
    if (req.files?.images) {
      productData.images = req.files.images.map(f => `/uploads/${f.filename}`);
    }
    
    // Save product
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log(`✅ Product created: ${savedProduct.name}`);
    
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct
    });
    
  } catch (error) {
    console.error("❌ Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message
    });
  }
});

// UPDATE PRODUCT
router.put("/:id", requireAdmin, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 10 }
]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Update fields if provided
    if (req.body.name) product.name = req.body.name;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.price) product.price = parseFloat(req.body.price);
    if (req.body.category) product.category = req.body.category;
    if (req.body.clothingType) product.clothingType = req.body.clothingType;
    if (req.body.sale !== undefined) product.sale = req.body.sale === "true";
    if (req.body.salePrice !== undefined) product.salePrice = parseFloat(req.body.salePrice);
    if (req.body.brand !== undefined) product.brand = req.body.brand;
    
    // Handle images
    if (req.files?.image) {
      product.image = `/uploads/${req.files.image[0].filename}`;
    }
    
    if (req.files?.images) {
      product.images = req.files.images.map(f => `/uploads/${f.filename}`);
    }
    
    const updatedProduct = await product.save();
    
    console.log(`✅ Product updated: ${updatedProduct.name}`);
    
    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });
    
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }
});

// DELETE PRODUCT (SOFT DELETE)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Soft delete
    product.isActive = false;
    await product.save();
    
    console.log(`✅ Product deleted (soft): ${product.name}`);
    
    res.json({
      success: true,
      message: "Product deleted successfully"
    });
    
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }
});

// PATCH update stock
router.patch("/:id/stock", async (req, res) => {
  try {
    const { size, quantity = 1 } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    await product.reduceStock(size, quantity);
    
    res.json({ 
      message: "Stock reduced successfully",
      product: {
        _id: product._id,
        name: product.name,
        inStock: product.inStock,
        sizes: product.sizes
      }
    });
  } catch (error) {
    console.error("PATCH /api/products/:id/stock error:", error);
    res.status(500).json({ message: "Failed to update stock", error: error.message });
  }
});

export default router;