const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const likesController = require('../../../controllers/posts_and_related/likes/public_likes_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected());

router.get(
  '/posts/:id/likes',
  validationHandler.validateParamId,
  likesController.getAllLikesForPost,
);

router.get(
  '/users/:id/likes',
  validationHandler.validateParamId,
  likesController.getAllLikesForUser,
);

module.exports = router;
