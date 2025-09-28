const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const educationsValidator = require('../../utils/validation/profiles/project_validation');
const educationsController = require('../../controllers/profiles/projects_controller');
const router = express.Router();
const { uploadMixOfImages, processFile } = require('../../middleware/upload_middleware');

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
  uploadMixOfImages([{ name: 'images', maxCount: 8 }]),
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  educationsValidator.update,
  (req, res, next) => processFile(req, res, next, 'public/images/profiles/projects', process.env.FORMAT_IMAGES),
  educationsController.updateOne,
);

router.post(
  '/',
  uploadMixOfImages([{ name: 'images', maxCount: 8 }]),

  accessControl.protected(),
  accessControl.allowedTo(['user']),
  educationsValidator.create,
  (req, res, next) => processFile(req, res, next, 'public/images/profiles/projects', process.env.FORMAT_IMAGES),
  educationsController.create,
);

module.exports = router;
