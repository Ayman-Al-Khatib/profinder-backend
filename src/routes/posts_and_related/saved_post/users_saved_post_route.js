const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const usersSavePostController = require('../../../controllers/posts_and_related/saved_post/public_saved_post_controller');
const savedPostsValidation = require('../../../utils/validation/posts_and_related/saved_posts_validation');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', usersSavePostController.getAllsavedPosts);
router.post(
  '/',
  savedPostsValidation.createSavedPostValidation,
  usersSavePostController.createSavePost,
);
router.delete(
  '/:id',
  savedPostsValidation.deleteSavedPostValidation,
  usersSavePostController.deleteOne,
);

module.exports = router;
