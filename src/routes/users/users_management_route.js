const express = require('express');
const userManagementValidator = require('../../utils/validation/users/users_management_validation');
const userManagementController = require('../../controllers/users/users_management_controller');
const accessControl = require('../../middleware/access_control_middleware');
const router = express.Router();
const { uploadMixOfImages, processFile } = require('../../middleware/upload_middleware');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/count', userManagementController.getCountUsers);

router
  .route('/')
  // Get all users
  .get(userManagementController.getUsers)

  // Create a new user
  .post(userManagementValidator.createUserValidation, userManagementController.createUser)

  // Delete multiple users
  .delete(userManagementValidator.validateBodyListId, userManagementController.deleteManyUsers);

router.put('/:id/block', userManagementController.blockUser);
router.put('/:id/un-block', userManagementController.unBlockUser);

router.put('/block', userManagementController.blockManyUsers);
router.put('/unblock', userManagementController.unblockManyUsers);

router.get(
  '/:id/reports',
  userManagementValidator.validateParamId,
  userManagementController.getUserWithReports,
);

router
  .route('/:id')

  // Middleware to validate ID parameter
  .all(userManagementValidator.validateParamId)

  // Get specific user by ID
  .get(userManagementController.getUser)
  // Update specific user by ID
  .put(
    uploadMixOfImages([
      { name: 'profile_image', maxCount: 1 },
      { name: 'background_image', maxCount: 1 },
    ]),
    userManagementValidator.updateUserValidation,
    (req, res, next) =>
      processFile(req, res, next, 'public/images/users', process.env.FORMAT_IMAGES),

    userManagementController.updateUser,
  )

  // Delete specific user by ID
  .delete(userManagementController.deleteUser);

module.exports = router;
