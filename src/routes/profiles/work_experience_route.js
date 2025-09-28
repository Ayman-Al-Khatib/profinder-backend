const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const workExperienceValidator = require('../../utils/validation/profiles/work_experience_validation');
const workExperienceController = require('../../controllers/profiles/work_experience_controller');
const router = express.Router();

router.delete(
  '/many',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  workExperienceController.removeMany,
);

router.delete(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  workExperienceValidator.validateParamItemId('itemId'),
  workExperienceController.removeOne,
);

router.put(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  workExperienceValidator.update,

  workExperienceController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  workExperienceValidator.create,
  workExperienceController.create,
);

module.exports = router;
