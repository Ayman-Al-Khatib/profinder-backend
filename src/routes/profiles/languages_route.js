const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const languagesValidator = require('../../utils/validation/profiles/languages_validation');
const languagesController = require('../../controllers/profiles/languages_controller');
const router = express.Router();

router.delete(
  '/many',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  languagesValidator.validateBodyListId,

  languagesController.removeMany,
);

router.delete(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  languagesValidator.validateParamItemId('itemId'),
  languagesController.removeOne,
);

router.put(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  languagesValidator.update,
  languagesController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  languagesValidator.create,
  languagesController.create,
);

module.exports = router;
