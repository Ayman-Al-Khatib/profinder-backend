const factory = require('../../helper/handlers_factory');
const ApiError = require('../../utils/api_error');
const SuperAdmin = require('../../models/super_admins_model');
const bcrypt = require('bcryptjs');
const createToken = require('../../utils/create_token');
const _ = require('lodash');
const $ = require('../../locales/keys');
const emailVerificationHandler = require('../../helper/email_verification_handler');
const tr = require('../../helper/translate');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');

/**
 * @desc    Create a new super admin account
 * @route   POST /api/super-admins/signup
 * @access  Public
 */
exports.signup = factory.createOne({
  Model: SuperAdmin,
  fields: ['email', 'password'],
  fieldsToOmitFromResponse: ['password', '__v'],
});

/**
 * @desc    Authenticate and login a super admin
 * @route   POST /api/super-admins/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  // Find super admin by email
  const superadmin = await SuperAdmin.findOne({ email: req.body.email });
  // Check if super admin exists and password matches
  if (!superadmin || !(await bcrypt.compare(req.body.password, superadmin.password))) {
    // If authentication fails, return error
    return next(new ApiError($.incorrect_email_or_password, 401));
  }

  // Check if superadmin account is not deleted
  if (superadmin.deleted_at) {
    // If superadmin account is not deleted, return error with status code 404
    return next(new ApiError($.super_admin_account_has_been_marked_as_deleted, 404));
  }
  // Generate JWT token
  const token = createToken({ info: { id: superadmin._id, role: 'superAdmin' } });
  // Omit sensitive data from super admin object
  const superadminWithoutSensitiveData = _.omit(superadmin.toObject(), [
    'password',
    '__v',
    'last_login',
  ]);

  superadmin.last_login = new Date();
  superadmin.save();
  res.status(200).json({ status: 'success', superadmin: superadminWithoutSensitiveData, token });
};

/**
 * @desc    Send email verification code to a super admin
 * @route   POST /api/super-admins/send-verify-code
 * @access  Public
 */
exports.sendVerifyCode = async (req, res) => {
  // Find user by email
  const superAdmin = await SuperAdmin.findOne({ email: req.body.email });
  superAdmin.username = 'Super Admin';
  // Send email for verification
  await emailVerificationHandler(superAdmin);

  res.status(200).json({ status: 'success', message: tr($.verification_code_sent_successfully) });
};

/**
 * @desc    Reset password for a super admin using verification code
 * @route   POST /api/super-admins/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  const { email, verify_code, password } = req.body;

  // Find the super admin by email
  const superAdmin = await SuperAdmin.findOne({ email });
  // Check if user exists
  if (!superAdmin) {
    // If no superAdmin found, throw an error with status code 404
    return next(new ApiError([$.there_is_no_user_with_that_email, email], 404, { merge: true }));
  }

  // Check if the verification code exists
  if (!superAdmin.verify_code) {
    // If no verification code found, throw an error with status code 400
    return next(new ApiError($.no_verification_code_found_for_this_user, 400));
  }

  // Verify the provided verification code
  const decoded = jwt.verify(superAdmin.verify_code, process.env.JWT_SECRET_KEY);
  if (decoded.verify_code.toString() !== verify_code.toString()) {
    // If verification code does not match, throw an error with status code 400
    return next(new ApiError($.invalid_verification_code, 400));
  }

  // Update superAdmin's password and clear the verification code
  superAdmin.password = password;
  superAdmin.verify_code = undefined;
  await superAdmin.save();

  res.status(200).json({ status: 'success', message: tr($.password_reset_successful) });
};

/**
 * @desc    Reset the entire database (drop all collections)
 * @route   DELETE /api/super-admins/reset-database
 * @access  Private (authenticated super admin)
 */
exports.resetDatabase = async (req, res) => {
  const folderExists = fs.existsSync('uploads');

  if (folderExists) {
    fs.rm('uploads', { recursive: true, force: true }); // Use fs.rm with the 'force' option
    console.log('Uploads folder and its contents removed successfully');
  } else {
    console.log('Uploads folder does not exist');
  }

  // Drop all collections in the database
  await mongoose.connection.dropDatabase();
  console.log('Database dropped successfully');

  res.status(204).send();
};

/**
 * @desc    Download the uploads folder as a ZIP file
 * @route   GET /api/super-admins/download-upload-folder
 * @access  Private (authenticated super admin)
 */
exports.downloadUploadFolder = async (req, res) => {
  const folderPath = path.join(__dirname, '../../../uploads');
  const folderName = 'uploads';

  if (fs.existsSync(folderPath)) {
    const output = fs.createWriteStream(`${folderName}.zip`);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(output);
    archive.directory(folderPath, folderName);

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${folderName}.zip`);
      res.setHeader('Content-Length', archive.pointer());

      res.sendFile(path.join(__dirname, '../../../', `${folderName}.zip`), err => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).send('Error sending file');
        }
        fs.unlinkSync(path.join(__dirname, '../../../', `${folderName}.zip`));
      });
    });

    archive.on('error', err => {
      console.error('Error archiving folder:', err);
      res.status(500).send('Error archiving folder');
    });

    archive.finalize();
  } else {
    res.status(404).send('Folder not found');
  }
};

/**
 * @desc    Upload and extract a ZIP file into the uploads folder
 * @route   POST /api/super-admins/upload-uploads-folder
 * @access  Private (authenticated super admin)
 */
exports.uploadAndExtractZip = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'failure',
      message: 'No file uploaded',
    });
  }
  if (req.file.mimetype !== 'application/zip') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      status: 'failure',
      message: 'Uploaded file is not a ZIP file',
    });
  }
  const tempFilePath = req.file.path;
  const uploadFolderPath = path.join(__dirname, '../../../uploads');
  fs.createReadStream(tempFilePath)
    .pipe(unzipper.Extract({ path: uploadFolderPath }))
    .on('close', () => {
      fs.unlinkSync(tempFilePath);
      res.status(200).json({
        status: 'success',
        message: 'File uploaded and extracted successfully',
      });
    })
    .on('error', err => {
      console.error('Error extracting zip file:', err);
      res.status(500).json({
        status: 'failure',
        message: 'Error extracting zip file',
      });
    });
};

/**
 * @desc    Logout the current super admin
 * @route   POST /api/super-admins/logout
 * @access  Private (authenticated super admin)
 */
exports.logout = async (req, res) => {
  const superadmin = await SuperAdmin.findById(req.superAdmin.id);

  // Update user last logout time
  superadmin.last_logout = new Date();
  superadmin.save();

  res.status(200).json({
    status: 'success',
    message: tr($.superadmin_has_been_logged_out_successfully),
  });
};
