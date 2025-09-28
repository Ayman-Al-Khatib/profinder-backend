const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/users_model');
const createToken = require('../utils/create_token');
const $ = require('../locales/keys');
// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Find user in database based on GitHub profile ID
        let user = await User.findOne({ github_id: profile.id }).select(
          '-__v -password_changed_at -password',
        );

        // If user doesn't exist, create a new user with GitHub profile data
        if (!user) {
          const userData = {
            github_id: profile.id,
            username: profile.username,
            source: 'github',
          };
          user = await User.create(userData);
          user.__v = undefined; // Exclude version field from user object
        }

        // Generate JWT token for user
        const token = createToken({ info: { id: user._id, role: 'user' } });
        // Success message for authorization
        const successMessage = $.user_authorized;
        // Pass user, token, and success message to done callback
        return done(null, { user, token, message: successMessage });
      } catch (error) {
        // Pass error to done callback
        return done(error);
      }
    },
  ),
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Find user in database based on Google profile ID
        let user = await User.findOne({ googleId: profile.id }).select(
          '-__v -passwordChangedAt -password',
        );
        // If user doesn't exist, create a new user with Google profile data
        if (!user) {
          const userData = {
            username: profile._json.name,
            source: 'google',
            google_id: profile.id,
          };

          user = await User.create(userData);
          user.password = undefined; // Exclude password field from user object
          user.password_changed_at = undefined; // Exclude password changed date field
          user.__v = undefined; // Exclude version field
        }

        // Generate JWT token for user
        const token = createToken({ info: { id: user._id, role: 'user' } });

        // Pass user and token to done callback
        return done(null, { user, token });
      } catch (error) {
        // Pass error to done callback
        return done(error);
      }
    },
  ),
);

module.exports = passport;
