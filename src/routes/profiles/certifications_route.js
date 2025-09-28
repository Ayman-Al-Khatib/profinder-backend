const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const certificationsValidator = require('../../utils/validation/profiles/certifications_validation');
const certificationsController = require('../../controllers/profiles/certification_controller');
const router = express.Router();
const { uploadSingleImage, processFile } = require('../../middleware/upload_middleware');

router.delete(
  '/many',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  certificationsController.removeMany,
);

router.delete(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  certificationsValidator.validateParamItemId('itemId'),
  certificationsController.removeOne,
);

router.put(
  '/:itemId',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  uploadSingleImage('certification_image'),
  certificationsValidator.update,
  (req, res, next) => processFile(req, res, next, 'public/images/profiles/certifications', process.env.FORMAT_IMAGES),
  certificationsController.updateOne,
);

router.post(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  uploadSingleImage('certification_image'),
  certificationsValidator.create,
  (req, res, next) => processFile(req, res, next, 'public/images/profiles/certifications', process.env.FORMAT_IMAGES),
  certificationsController.create,
);

module.exports = router;
