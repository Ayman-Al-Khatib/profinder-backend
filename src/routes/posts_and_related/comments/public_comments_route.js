const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const commentsController = require('../../../controllers/posts_and_related/comments/public_comments_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected());

router.get(
  '/users/:id/comments',
  validationHandler.validateParamId,
  commentsController.getAllComments,
);

module.exports = router;
