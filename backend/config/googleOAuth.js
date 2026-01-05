// backend/config/googleOAuth.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Configure Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
    scope: ['profile', 'email']
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔐 Google OAuth Profile Received:', profile.id);
      
      // Extract user info from Google profile
      const { id, displayName, emails, photos } = profile;
      const email = emails && emails.length > 0 ? emails[0].value : null;
      const picture = photos && photos.length > 0 ? photos[0].value : null;

      if (!email) {
        return done(new Error('No email found in Google profile'), null);
      }

      console.log('📧 Google user email:', email);

      // Check if user exists
      let user = await User.findOne({ 
        $or: [
          { email: email },
          { googleId: id }
        ]
      });

      if (user) {
        console.log('✅ Existing user found:', email);
        // Update existing user with Google info if missing
        if (!user.googleId) {
          user.googleId = id;
          user.profilePicture = picture || user.profilePicture;
          await user.save();
          console.log('🔄 Updated user with Google ID');
        }
      } else {
        // Create new user
        console.log('🆕 Creating new user for:', email);
        user = new User({
          name: displayName,
          email: email,
          googleId: id,
          profilePicture: picture,
          provider: 'google',
          emailVerified: true,
          passwordHash: null
        });
        await user.save();
        console.log('✅ New user created');
      }

      return done(null, user);
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Serialize/Deserialize user (for sessions)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ✅ NO EXPORTS NEEDED - We're configuring the passport singleton