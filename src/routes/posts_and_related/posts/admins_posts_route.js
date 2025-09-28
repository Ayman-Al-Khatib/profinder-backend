const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const postsController = require('../../../controllers/posts_and_related/posts/admins_posts_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.put('/:id/block', validationHandler.validateParamId, postsController.blockPost);
router.get('/:id/comments-reports',validationHandler.validateParamId, postsController.getPostWithCommentsAndReports);
router.get('/', postsController.getAllPosts);

module.exports = router;
