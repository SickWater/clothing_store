// backend/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateToken } from "../middleware/authMiddleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

// Register with email/password
export const register = async (req, res) => {
  try {
    const { name = "", email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ 
      name, 
      email, 
      passwordHash, 
      provider: 'local',
      emailVerified: false 
    });
    await user.save();

    const token = generateToken(user);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profilePicture: user.profilePicture 
      } 
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// Login with email/password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if user uses Google OAuth
    if (user.provider === 'google' && !user.passwordHash) {
      return res.status(400).json({ 
        message: "Account created with Google. Please use Google Sign-In." 
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profilePicture: user.profilePicture 
      } 
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// Google direct login (for frontend JS SDK)
export const googleLogin = async (req, res) => {
  try {
    const { idToken, name, email, profilePicture } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email or create new one
    let user = await User.findOne({ email });

    if (user) {
      // Update user with Google info if missing
      if (user.provider === 'local' && !user.googleId) {
        return res.status(400).json({ 
          message: "Email already registered with password. Please log in with email/password." 
        });
      }
      
      // Update profile picture if provided
      if (profilePicture && !user.profilePicture) {
        user.profilePicture = profilePicture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        name: name || email.split('@')[0],
        email: email,
        googleId: idToken ? idToken.substring(0, 50) : null, // Store partial token as ID
        provider: 'google',
        emailVerified: true,
        profilePicture: profilePicture || '',
        passwordHash: null
      });
      await user.save();
    }

    const token = generateToken(user);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profilePicture: user.profilePicture 
      } 
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Google login failed", error: error.message });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Failed to get user", error: error.message });
  }
};
