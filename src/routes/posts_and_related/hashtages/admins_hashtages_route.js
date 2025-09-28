const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const hashtagesController = require('../../../controllers/posts_and_related/hashtags/admins_hashtags_controller');
const validationHandler = require('../../../helper/validation_handler');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', hashtagesController.getAllHashtages);
router.put('/:id/block', validationHandler.validateParamId, hashtagesController.blockHashtage);
router.put('/:id/un-block', validationHandler.validateParamId, hashtagesController.unBlockHashtage);

module.exports = router;
