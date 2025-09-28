const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const socialMediaPlatformValidator = require('../../utils/validation/social_media_platforms_validation');
const socialMediaPlatformController = require('../../controllers/social_media_platforms/public_social_media_platforms_controller');
const router = express.Router();

router.get(
  '/:id',
  accessControl.protected(),
  socialMediaPlatformValidator.validateParamId,
  socialMediaPlatformController.getOne,
);

router.get('/', accessControl.protected(), socialMediaPlatformController.getAll);

module.exports = router;
