const express = require('express');
const superAdminValidator = require('../../utils/validation/super_admins/super_admins_validation');
const superAdminController = require('../../controllers/superAdmin/super_admins_controller');
const accessControl = require('../../middleware/access_control_middleware');

const router = express.Router();

router.post('/signup', superAdminValidator.signupValidation, superAdminController.signup);

router.post(
  '/send-verify-code',
  superAdminValidator.sendVerificationValidation,
  superAdminController.sendVerifyCode,
);
router.post(
  '/reset-password',
  superAdminValidator.resetPasswordValidation,
  superAdminController.resetPassword,
);

router.post('/login', superAdminValidator.loginValidation, superAdminController.login);

router.delete(
  '/reset-database',
  accessControl.protected(),
  accessControl.allowedTo(['superAdmin']),
  superAdminValidator.passwordProtection,
  superAdminController.resetDatabase,
);
router.get(
  '/download-uploads-folder',
  accessControl.protected(),
  accessControl.allowedTo(['superAdmin']),
  superAdminValidator.passwordProtection,
  superAdminController.downloadUploadFolder,
);

router.put(
  '/logout',
  accessControl.protected(),
  accessControl.allowedTo(['superAdmin']),
  superAdminController.logout,
);

module.exports = router;
