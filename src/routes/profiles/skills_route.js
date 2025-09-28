const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const skillValidator = require('../../utils/validation/profiles/skills_validation');
const skillController = require('../../controllers/profiles/skills_controller');
const router = express.Router();

router.delete(
  '/many',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  skillController.removeMany,
);

router.delete(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  skillValidator.validateParamItemId('itemId'),
  skillController.removeOne,
);

router.put(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  skillValidator.update,
  skillController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  skillValidator.create,
  skillController.create,
);

module.exports = router;
