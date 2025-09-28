const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const educationsValidator = require('../../utils/validation/profiles/educations_validation');
const educationsController = require('../../controllers/profiles/educations_controller');
const router = express.Router();

router.delete(
  '/many',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  educationsController.removeMany,
);

router.delete(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  educationsValidator.validateParamItemId('itemId'),
  educationsController.removeOne,
);

router.put(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  educationsValidator.update,
  educationsController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  educationsValidator.create,
  educationsController.create,
);

module.exports = router;
