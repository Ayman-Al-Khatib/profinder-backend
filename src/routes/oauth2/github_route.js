const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const ApiError = require('../../utils/api_error');

router.get('/', (req, res, next) => {
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })(req, res, next);
});

router.get(
  '/callback',
  (req, res, next) => {
    passport.authenticate('github', { session: false }, (err, user) => {
      if (err) {
        return next(
          new ApiError([`Authentication failed:`, err.message], 500, {
            merge: true,
          }),
        );
      }
      if (!user) {
        return next(new ApiError('Authentication failed: User not found', 404));
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    res.status(200).json({ status: 'success', ...req.user });
  },
);

module.exports = router;
