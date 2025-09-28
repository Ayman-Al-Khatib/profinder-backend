const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const postsValidator = require('../../../utils/validation/posts_and_related/posts_validation');
const reportValidate = require('../../../utils/validation/reports/report_validate');
const { uploadMixOfImages, processFile } = require('../../../middleware/upload_middleware');
const postsController = require('../../../controllers/posts_and_related/posts/users_posts_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.post(
  '/',
  uploadMixOfImages([{ name: 'images', maxCount: 12 }]),
  postsValidator.createPostValidation,
  (req, res, next) =>
    processFile(req, res, next, 'public/images/posts/', process.env.FORMAT_IMAGES),
  postsController.createPost,
);

router.get('/', postsController.getAllPosts);
router.delete(
  '/:id',
  validationHandler.validateParamId,
  postsValidator.checkIfUserAccessPost,
  postsController.deleteOne,
);

router.put(
  '/:id',
  uploadMixOfImages([{ name: 'images', maxCount: 12 }]),
  postsValidator.updatePostValidation,
  (req, res, next) =>
    processFile(req, res, next, 'public/images/posts/', process.env.FORMAT_IMAGES),
  postsController.updatePost,
);

router.post('/:id/report', reportValidate.createReportValidator, postsController.reportpost);

module.exports = router;
