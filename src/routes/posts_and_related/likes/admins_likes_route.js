const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const likesController = require('../../../controllers/posts_and_related/likes/admins_likes_controller');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', likesController.getAllLikes);

module.exports = router;
