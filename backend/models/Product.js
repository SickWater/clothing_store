// backend/models/Product.js
import mongoose from "mongoose";

const sizeSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  stock: { type: Number, required: true, default: 0, min: 0 }
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: { type: String, required: [true, "Product name is required"], trim: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "", maxlength: 150 }, // For product cards
    
    // Pricing
    price: { type: Number, required: [true, "Product price is required"], min: 0 },
    costPrice: { type: Number, default: 0, min: 0 }, // For profit calculation
    sale: { type: Boolean, default: false },
    salePrice: { type: Number, default: 0, min: 0 },
    
    // Categorization
    category: { type: String, enum: ["brand", "thrift"], required: [true, "Category is required"] },
    clothingType: { type: String, required: [true, "Clothing type is required"], trim: true },
    brand: { type: String, default: "", trim: true }, // ✅ NEW: Brand name (Nike, Adidas, etc.)
    subCategory: { type: String, default: "", trim: true }, // ✅ NEW: e.g., "Sneakers", "Boots" for shoes
    
    // Inventory
    inStock: { type: Boolean, default: true },
    sku: { type: String, default: "", unique: true, sparse: true }, // ✅ NEW: Stock Keeping Unit
    barcode: { type: String, default: "" }, // ✅ NEW: For scanning
    
    // Images
    image: { type: String, default: "" }, // Main image
    images: { type: [String], default: [] }, // Additional images
    
    // Sizes & Variants
    sizes: {
      type: [sizeSchema],
      default: []
    },
    colors: { type: [String], default: [] }, // ✅ NEW: Available colors
    gender: { type: String, enum: ["men", "women", "unisex", "kids"], default: "unisex" }, // ✅ NEW
    
    // Tags & Search
    tags: { type: [String], default: [] }, // ✅ NEW: For filtering/search
    condition: { type: String, enum: ["new", "like_new", "good", "fair"], default: "new" }, // ✅ NEW: For thrift items
    
    // Shipping & Physical Properties
    weight: { type: Number, default: 0 }, // ✅ NEW: In grams
    dimensions: { // ✅ NEW: For shipping calculation
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 }
    },
    
    // Admin & Tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ NEW: Admin who created
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ NEW
    isActive: { type: Boolean, default: true }, // ✅ NEW: Soft delete
    views: { type: Number, default: 0 }, // ✅ NEW: Track popularity
    purchaseCount: { type: Number, default: 0 }, // ✅ NEW: Sales tracking
    
    // Metadata
    notes: { type: String, default: "" } // ✅ NEW: Internal notes
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ Virtual field for auto-calculated total stock
productSchema.virtual('totalStock').get(function() {
  if (!this.sizes || this.sizes.length === 0) {
    return this.inStock ? 1 : 0;
  }
  return this.sizes.reduce((total, size) => total + (size.stock || 0), 0);
});

// ✅ Auto-generate SKU if not provided
productSchema.pre('save', function(next) {
  // Auto-update inStock based on sizes
  if (this.sizes && this.sizes.length > 0) {
    const hasStock = this.sizes.some(size => (size.stock || 0) > 0);
    this.inStock = hasStock;
  }
  
  // Generate SKU if empty
  if (!this.sku || this.sku === '') {
    const prefix = this.category === 'brand' ? 'BR' : 'TH';
    const random = Math.floor(10000 + Math.random() * 90000);
    this.sku = `${prefix}-${Date.now().toString().slice(-6)}-${random}`;
  }
  
  next();
});

// ✅ Indexes for better search performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, clothingType: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ sale: 1 });
productSchema.index({ createdAt: -1 });

// ✅ Method to check if a specific size is in stock
productSchema.methods.isSizeInStock = function(sizeName) {
  if (!this.sizes || this.sizes.length === 0) {
    return this.inStock;
  }
  
  const size = this.sizes.find(s => s.size === sizeName);
  return size ? (size.stock > 0) : false;
};

// ✅ Method to reduce stock when item is purchased
productSchema.methods.reduceStock = function(sizeName, quantity = 1) {
  if (!this.sizes || this.sizes.length === 0) {
    // For products without sizes, just update inStock manually
    return this.save();
  }
  
  const size = this.sizes.find(s => s.size === sizeName);
  if (size) {
    size.stock = Math.max(0, size.stock - quantity);
    this.purchaseCount += quantity; // Track purchases
    return this.save();
  }
  return Promise.reject(new Error(`Size ${sizeName} not found`));
};

// ✅ Method to increase stock (for restocking)
productSchema.methods.increaseStock = function(sizeName, quantity = 1) {
  if (!this.sizes || this.sizes.length === 0) {
    return this.save();
  }
  
  const size = this.sizes.find(s => s.size === sizeName);
  if (size) {
    size.stock = (size.stock || 0) + quantity;
    return this.save();
  }
  return Promise.reject(new Error(`Size ${sizeName} not found`));
};

const Product = mongoose.model("Product", productSchema);
export default Product;