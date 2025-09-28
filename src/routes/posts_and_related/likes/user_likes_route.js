const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const likesValidator = require('../../../utils/validation/posts_and_related/likes_validation');
const likesController = require('../../../controllers/posts_and_related/likes/users_likes_controller');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.post('/', likesValidator.createlikeValidation, likesController.createLike);

router.get('/', likesController.getAllLikes);

router.delete('/:id', likesValidator.deletelikeValidation, likesController.deleteOne);

module.exports = router;
