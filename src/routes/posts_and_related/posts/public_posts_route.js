const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const postsController = require('../../../controllers/posts_and_related/posts/public_posts_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/:id/comments', validationHandler.validateParamId, postsController.getPostWithComments);
router.get('/suggest', postsController.getSuggestPosts);
router.get('/', postsController.getAllPosts);

module.exports = router;
