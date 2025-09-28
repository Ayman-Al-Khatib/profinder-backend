const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const socialMediaPlatformValidator = require('../../utils/validation/social_media_platforms_validation');
const socialMediaPlatformController = require('../../controllers/social_media_platforms/admin_social_media_platforms_controller');
const router = express.Router();
const { uploadSingleImage, processFile } = require('../../middleware/upload_middleware');

router.delete(
  '/:id',
  accessControl.protected(),
  accessControl.allowedTo(['admin']),
  socialMediaPlatformValidator.validateParamId,
  socialMediaPlatformController.deleteOne,
);

router.put(
  '/:id',
  accessControl.protected(),
  accessControl.allowedTo(['admin']),
  uploadSingleImage('image'),
  socialMediaPlatformValidator.updateOne,
  (req, res, next) => processFile(req, res, next, 'public/images/platform', 'png'),
  socialMediaPlatformController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['admin']),
  uploadSingleImage('image'),
  socialMediaPlatformValidator.createOne,
  (req, res, next) =>
    processFile(req, res, next, 'public/images/platform', "png"),
  socialMediaPlatformController.createOne,
);

module.exports = router;
