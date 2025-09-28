const express = require('express');
const authAdminManagementValidator = require('../../utils/validation/admins/admins_management_validation');
const authAdminManagementController = require('../../controllers/admins/admins_management_controller');
const accessControl = require('../../middleware/access_control_middleware');
const router = express.Router();
const { uploadMixOfImages, processFile } = require('../../middleware/upload_middleware');

router.use(accessControl.protected(), accessControl.allowedTo(['superAdmin']));

router.get(
  '/count',
  authAdminManagementValidator.getCountAdminValidation,
  authAdminManagementController.getCountAdmins,
);

router.put(
  '/:id/un-delete',
  authAdminManagementValidator.validateParamId,
  authAdminManagementController.unDeleteAdmin,
);

router
  .route('/')
  // Get all admins
  .get(authAdminManagementController.getAdmins)

  // Create a new admin
  .post(
    authAdminManagementValidator.createAdminValidation,
    authAdminManagementController.createAdmin,
  )

  // Delete multiple admins
  .put(
    authAdminManagementValidator.validateBodyListId,
    authAdminManagementController.deleteManyAdmin,
  );

router
  .route('/:id')

  // Middleware to validate ID parameter
  .all(authAdminManagementValidator.validateParamId)

  // Get specific admin by ID
  .get(authAdminManagementController.getAdmin)

  // Update specific admin by ID
  .put(
    uploadMixOfImages([
      { name: 'background_image', maxCount: 1 },
      { name: 'profile_image', maxCount: 1 },
    ]),
    authAdminManagementValidator.updateAdminValidation,
    (req, res, next) =>
      processFile(req, res, next, 'public/images/admins', process.env.FORMAT_IMAGES),
    authAdminManagementController.updateAdmin,
  )

  // Delete specific admin by ID
  .delete(authAdminManagementValidator.validateParamId, authAdminManagementController.deleteAdmin);

module.exports = router;
