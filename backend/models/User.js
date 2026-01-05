// backend/models/User.js
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, default: null },
  quantity: { type: Number, default: 1 },
  price: { type: Number, default: 0 } // snapshot price
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  
  // OAuth fields
  googleId: { type: String, unique: true, sparse: true },
  provider: { type: String, enum: ["local", "google"], default: "local" },
  emailVerified: { type: Boolean, default: false },
  profilePicture: { type: String, default: "" },
  
  role: { type: String, enum: ["user", "admin"], default: "user" },
  cart: { type: [cartItemSchema], default: [] },
  wishlist: { type: [ { type: mongoose.Schema.Types.ObjectId, ref: "Product" } ], default: [] },
  
 // Additional profile fields
  phone: { type: String, default: "" },
  birthday: { type: Date },
  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    postalCode: { type: String, default: "" }
  },
  
  // Account status
  isActive: { type: Boolean, default: true },
  

  // Additional user info
  phone: { type: String, default: "" },
  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    postalCode: { type: String, default: "" }
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
