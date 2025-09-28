const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const hashtagesController = require('../../../controllers/posts_and_related/posts_hashtags/admins_posts_hashtags_controller');
const postHashtagesValidation = require('../../../utils/validation/posts_and_related/posts_hashtages_validation');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/:name', postHashtagesValidation.checkHash, hashtagesController.getAllPostForHashtages);
module.exports = router;
