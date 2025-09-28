const jwt = require('jsonwebtoken');
const ApiError = require('../utils/api_error');
const Admin = require('../models/admins_model');
const SuperAdmin = require('../models/super_admins_model');
const User = require('../models/users_model');
const $ = require('../locales/keys');
const redis = require('../config/redis_config');

exports.protected = () => {
  return async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(new ApiError($.you_are_not_allowed_to_access_this_route, 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    var person;
    if (decoded.role === 'superAdmin') {
      person = await SuperAdmin.findById(decoded.id);
    } else if (decoded.role === 'admin') {
      person = await Admin.findById(decoded.id);
    } else if (decoded.role === 'user') {
      person = await User.findById(decoded.id);
    }

    if (!person || person.deleted_at) {
      return next(new ApiError($.the_user_that_belong_to_this_token_does_no_longer_exist, 404));
    }

    if (person.blocked) {
      return next(new ApiError($.access_to_this_account_is_currently_blocked, 403));
    }

    if (person.password_changed_at && decoded.role === 'user') {
      const passChangedTimestamp = parseInt(person.password_changed_at.getTime() / 1000, 10);
      if (passChangedTimestamp > decoded.iat) {
        return next(new ApiError($.user_recently_changed_his_password_please_login_again, 403));
      }
    }

    // Check if last login was after the token was issued
    if (person.last_login && decoded.role === 'user') {
      const lastLoginTimestamp = parseInt(person.last_login.getTime() / 1000, 10);
      if (lastLoginTimestamp > decoded.iat) {
        return next(
          new ApiError($.user_has_logged_in_after_the_token_was_issued_please_login_again, 403),
        );
      }
    }

    // Check if last logout was after the token was issued
    if (person.last_logout && decoded.role === 'user') {
      const lastLogoutTimestamp = parseInt(person.last_logout.getTime() / 1000, 10);
      if (lastLogoutTimestamp > decoded.iat) {
        return next(
          new ApiError($.user_has_logged_out_after_the_token_was_issued_please_login_again, 403),
        );
      }
    }

    req[decoded.role] = person;
    // req.params.id = person.id;
    req.role = decoded.role;

    if (req.role === 'user') {
      redis.expire(`${person._id.toString()}:token`, process.env.TOKEN_DEVICE_TTL);
    }
    next();
  };
};

exports.protectedSocket = async (socket, next) => {
  try {
    let token;

    if (
      socket.handshake.headers.authorization &&
      socket.handshake.headers.authorization.startsWith('Bearer')
    ) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(new ApiError($.you_are_not_allowed_to_access_this_route, 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    var person;
    if (decoded.role === 'superAdmin') {
      person = await SuperAdmin.findById(decoded.id);
    } else if (decoded.role === 'admin') {
      person = await Admin.findById(decoded.id);
    } else if (decoded.role === 'user') {
      person = await User.findById(decoded.id);
    }

    if (!person || person.deleted_at) {
      return next(new ApiError($.the_user_that_belong_to_this_token_does_no_longer_exist, 404));
    }

    if (person.blocked) {
      return next(new ApiError($.access_to_this_account_is_currently_blocked, 403));
    }

    if (person.password_changed_at) {
      const passChangedTimestamp = parseInt(person.password_changed_at.getTime() / 1000, 10);
      if (passChangedTimestamp > decoded.iat) {
        return next(new ApiError($.user_recently_changed_his_password_please_login_again, 403));
      }
    }
    // Check if last login was after the token was issued
    if (person.last_login) {
      const lastLoginTimestamp = parseInt(person.last_login.getTime() / 1000, 10);
      if (lastLoginTimestamp > decoded.iat) {
        return next(
          new ApiError($.user_has_logged_in_after_the_token_was_issued_please_login_again, 403),
        );
      }
    }

    // Check if last logout was after the token was issued
    if (person.last_logout) {
      const lastLogoutTimestamp = parseInt(person.last_logout.getTime() / 1000, 10);
      if (lastLogoutTimestamp > decoded.iat) {
        return next(
          new ApiError($.user_has_logged_out_after_the_token_was_issued_please_login_again, 403),
        );
      }
    }
    socket[decoded.role] = person;
    // socket.params.id = person.id;
    socket.role = decoded.role;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError($.invalid_token_please_login_again, 401));
    }
    next(error);
  }
};

exports.allowedTo = roles => async (req, res, next) => {
  if (!roles.includes(req.role)) {
    return next(new ApiError($.you_are_not_allowed_to_access_this_route, 403));
  }
  next();
};

exports.authenticateByEmailAccess = () => {
  return async (req, res, next) => {
    if (req.user && req.user.source === 'email') {
      next();
    } else if (!req.body.password && !req.body.password_confirm && !req.body.old_password) {
      next();
    } else {
      return next(new ApiError($.access_restricted_emailbased_authentication_required, 403));
    }
  };
};
