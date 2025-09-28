const bcrypt = require('bcryptjs');
const _ = require('lodash');
const ApiError = require('../../utils/api_error');
const createToken = require('../../utils/create_token');
const Admin = require('../../models/admins_model');
const factory = require('../../helper/handlers_factory');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');
const emailVerificationHandler = require('../../helper/email_verification_handler');
const jwt = require('jsonwebtoken');

/**
 * @desc    Authenticate admin and generate token
 * @route   POST /api/admin/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  // Find admin by email
  const admin = await Admin.findOne({ email: req.body.email });

  // Check if admin exists and password matches
  if (!admin || !bcrypt.compare(req.body.password, admin.password)) {
    // If authentication fails, return error
    return next(new ApiError($.incorrect_email_or_password, 401, { merge: true }));
  }

  // Check if admin account is not deleted
  if (admin.deleted_at) {
    // If admin account is not deleted, return error with status code 404
    return next(new ApiError($.admin_account_has_been_marked_as_deleted, 404));
  }

  // Generate JWT token
  const token = createToken({ info: { id: admin._id, role: 'admin' } });

  // Omit sensitive data from admin object
  const adminWithoutSensitiveData = _.omit(admin.toObject(), [
    'password',
    '__v',
    'password_changed_at',
    'verify_code',
    'last_login',
  ]);

  admin.last_login = new Date();
  admin.save();
  res.status(200).json({ status: 'success', admin: adminWithoutSensitiveData, token });
};

/**
 * @desc    Update admin details
 * @route   PUT /api/admins
 * @access  Private (authenticated, admin)
 */
exports.updateAdmin = (req, res, next) => {
  // Set the admin's ID for updating based on the authenticated admin's ID from the JWT token
  req.params.id = req.admin._id;
  // Handle single file upload for profile image
  if (req.body.profile_image) req.body.profile_image = req.body.profile_image[0];
  // Handle single file upload for background image
  if (req.body.background_image) req.body.background_image = req.body.background_image[0];

  // Update admin details using factory function
  factory.updateOne({
    Model: Admin,
    fields: ['username', 'password', 'profile_image', 'background_image'],
    fieldsToOmitFromResponse: ['__v', 'password'],
  })(req, res, next);
};

/**
 * @desc    Delete admin account
 * @route   DELETE /api/admins
 * @access  Private (authenticated, admin)
 */
exports.deleteAdmin = (req, res, next) => {
  // Set the admin's ID for updating based on the authenticated admin's ID from the JWT token
  req.params.id = req.admin._id;
  factory.deleteOne({ Model: Admin })(req, res, next);
};
/**
 * @desc    Reset admin password
 * @route   POST /api/admins/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  const { email, verify_code, password } = req.body;

  // Find the super admin by email
  const admin = await Admin.findOne({ email });
  // Check if user exists
  if (!admin) {
    // If no admin found, throw an error with status code 404
    return next(new ApiError([$.there_is_no_user_with_that_email, email], 404, { merge: true }));
  }

  // Check if the verification code exists
  if (!admin.verify_code) {
    // If no verification code found, throw an error with status code 400
    return next(new ApiError($.no_verification_code_found_for_this_user, 400));
  }

  // Verify the provided verification code
  const decoded = jwt.verify(admin.verify_code, process.env.JWT_SECRET_KEY);
  if (decoded.verify_code.toString() !== verify_code.toString()) {
    // If verification code does not match, throw an error with status code 400
    return next(new ApiError($.invalid_verification_code, 400));
  }

  // Update admin's password and clear the verification code
  admin.password = password;
  admin.verify_code = undefined;
  await admin.save();
  res.status(200).json({ status: 'success', message: tr($.password_reset_successful) });
};

/**
 * @desc    Send verification code to admin email
 * @route   POST /api/admins/send-verify-code
 * @access  Public
 */
exports.sendVerifyCode = async (req, res) => {
  // Find user by email
  const superAdmin = await Admin.findOne({ email: req.body.email });

  // Send email for verification
  await emailVerificationHandler(superAdmin);
  res.status(200).json({ status: 'success', message: tr($.verification_code_sent_successfully) });
};

/**
 * @desc    Logout admin
 * @route   PUT /api/admin/logout
 * @access  Private (authenticated, admin)
 */
exports.logout = async (req, res) => {
  const admin = await Admin.findById(req.admin.id);

  // Update user last logout time
  admin.last_logout = new Date();
  admin.save();

  res.status(200).json({
    status: 'success',
    message: tr($.admin_has_been_logged_out_successfully),
  });
};
