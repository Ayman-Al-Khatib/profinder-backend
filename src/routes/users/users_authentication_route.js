const express = require('express');
const userAuthenticationValidator = require('../../utils/validation/users/users_authentication_validation');
const reportsValidator = require('../../utils/validation/reports/report_validate');
const userAuthenticationController = require('../../controllers/users/users_authentication_controller');
const accessControl = require('../../middleware/access_control_middleware');
const validationHandler = require('../../helper/validation_handler');
const router = express.Router();
const { uploadMixOfImages, processFile } = require('../../middleware/upload_middleware');

router.post(
  '/signup',
  userAuthenticationValidator.signupValidation,
  userAuthenticationController.signup,
);

router.post(
  '/login',
  userAuthenticationValidator.loginValidation,
  userAuthenticationController.login,
);

router.post(
  '/sign-in-google',

  userAuthenticationValidator.signInGoogleValidation,

  userAuthenticationController.signInGoogle,
);

router.post(
  '/send-verify-code',
  userAuthenticationValidator.sendVerificationValidation,
  userAuthenticationController.sendVerifyCode,
);

router.post(
  '/reset-password',
  userAuthenticationValidator.resetPasswordValidation,
  userAuthenticationController.resetPassword,
);

router.put(
  '/update',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  // accessControl.authenticateByEmailAccess(),
  uploadMixOfImages([
    { name: 'profile_image', maxCount: 1 },
    { name: 'background_image', maxCount: 1 },
  ]),
  userAuthenticationValidator.updateUserValidation,
  (req, res, next) => processFile(req, res, next, 'public/images/users', process.env.FORMAT_IMAGES),

  userAuthenticationController.updateUser,
);
router.delete(
  '/delete',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  userAuthenticationController.deleteUser,
);
router.get(
  '/:id/visit',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  validationHandler.validateParamId,
  userAuthenticationController.visitUser,
);

router.get(
  '/:username/search',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  userAuthenticationController.searchByUsername,
);

router.post(
  '/:id/report',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  reportsValidator.createReportValidator,
  userAuthenticationController.reportUsers,
);
router.put(
  '/approve',
  userAuthenticationValidator.approveValidation,
  // accessControl.authenticateByEmailAccess(),
  userAuthenticationController.approveUser,
);

router.put(
  '/logout',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  userAuthenticationController.logout,
);

module.exports = router;
