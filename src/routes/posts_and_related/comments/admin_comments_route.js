const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const commentsController = require('../../../controllers/posts_and_related/comments/admins_comments_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.put('/:id/block', validationHandler.validateParamId, commentsController.blockComment);

router.get('/', commentsController.getAllComments);

module.exports = router;
