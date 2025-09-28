const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const socialMediaLinksValidator = require('../../utils/validation/profiles/social_media_links_validation');
const socialMediaLinksController = require('../../controllers/profiles/social_media_links_controller');
const router = express.Router();

router.delete(
  '/many',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  socialMediaLinksController.removeMany,
);

router.delete(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  socialMediaLinksValidator.validateParamItemId('itemId'),
  socialMediaLinksController.removeOne,
);

router.put(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  socialMediaLinksValidator.validateParamItemId('itemId'),

  socialMediaLinksValidator.socialMediaLinkValidation,
  socialMediaLinksController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  socialMediaLinksValidator.socialMediaLinkValidation,
  socialMediaLinksController.create,
);

module.exports = router;
