const express = require('express');
const authAdminAuthenticationValidator = require('../../utils/validation/admins/admins_authentication_validation');
const authAdminAuthenticationController = require('../../controllers/admins/admins_authentication_controller');
const accessControl = require('../../middleware/access_control_middleware');
const { uploadMixOfImages, processFile } = require('../../middleware/upload_middleware');

const router = express.Router();

router.post(
  '/login',
  authAdminAuthenticationValidator.loginValidation,
  authAdminAuthenticationController.login,
);
router.post(
  '/send-verify-code',
  authAdminAuthenticationValidator.sendVerificationValidation,
  authAdminAuthenticationController.sendVerifyCode,
);
router.post(
  '/reset-password',
  authAdminAuthenticationValidator.resetPasswordValidation,
  authAdminAuthenticationController.resetPassword,
);

router.put(
  '/update',
  accessControl.protected(),
  accessControl.allowedTo(['admin']),
  uploadMixOfImages([
    { name: 'background_image', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
  ]),
  authAdminAuthenticationValidator.updateAdminValidation,
  (req, res, next) =>
    processFile(req, res, next, 'public/images/admins', process.env.FORMAT_IMAGES),
  authAdminAuthenticationController.updateAdmin,
);

router.delete(
  '/delete',
  accessControl.protected(),
  accessControl.allowedTo(['admin']),
  authAdminAuthenticationController.deleteAdmin,
);

router.put(
  '/logout',
  accessControl.protected(),
  accessControl.allowedTo(['admin']),
  authAdminAuthenticationController.logout,
);

module.exports = router;
