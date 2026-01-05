// backend/routes/googleAuthRoutes.js
import express from 'express';
import passport from 'passport'; // Import the configured passport
import jwt from 'jsonwebtoken';
import User from '../models/User.js';



const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth test endpoint',
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    timestamp: new Date().toISOString()
  });
});

// Simple Google OAuth start
router.get('/', (req, res) => {
  console.log('🔄 Starting Google OAuth...');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res);
});

// Callback route
router.get('/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false
  }),
  (req, res) => {
    try {
      console.log('✅ Google OAuth successful');
      const token = generateToken(req.user);
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth-success?token=${token}`);
    } catch (error) {
      console.error('❌ Callback error:', error);
      res.redirect('/login?error=google_auth_failed');
    }
  }
);

// Add this route to googleAuthRoutes.js - Client-side Google auth
router.post('/token', async (req, res) => {
    try {
      console.log('🔑 Client-side Google auth request received');
      
      const { idToken, name, email, profilePicture } = req.body;
  
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
  
      // Find or create user
      let user = await User.findOne({ email });
  
      if (user) {
        console.log('✅ Existing user found via client auth:', email);
        
        // Check if user registered with password but not Google
        if (user.provider === 'local' && !user.googleId) {
          return res.status(400).json({ 
            message: "Email already registered with password. Please log in with email/password." 
          });
        }
        
        // Update Google ID if missing
        if (!user.googleId && idToken) {
          user.googleId = idToken.substring(0, 100);
          await user.save();
        }
      } else {
        // Create new user
        console.log('🆕 Creating new user via client auth:', email);
        user = new User({
          name: name || email.split('@')[0],
          email: email,
          googleId: idToken ? idToken.substring(0, 100) : null,
          provider: 'google',
          emailVerified: true,
          profilePicture: profilePicture || '',
          passwordHash: null
        });
        await user.save();
      }
  
      // Generate JWT token
      const token = generateToken(user);
      
      res.json({ 
        success: true,
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
      console.error("❌ Client Google auth error:", error);
      res.status(500).json({ 
        success: false,
        message: "Google authentication failed" 
      });
    }
  });

export default router;