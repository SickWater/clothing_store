// backend/routes/authRoutes.js
import express from "express";
import { 
  register, 
  login, 
  googleLogin,
  getCurrentUser 
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin); // For frontend Google JS SDK

// Protected routes
router.get("/me", verifyToken, getCurrentUser);

export default router;