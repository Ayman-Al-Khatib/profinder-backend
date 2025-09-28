const express = require('express');

const userFreelanceValidation = require('../../utils/validation/freelance_projects/user_freelance_validation');
const userFreelanceController = require('../../controllers/freelance_projects/user_freelance_controller');
const accessControl = require('../../middleware/access_control_middleware');
const { uploadSingleImage } = require('../../middleware/file_upload_middleware');
const { validateOptionalImageUpload } = require('../../utils/validation/validate_file_upload');
const omitOptionalValidationFields = require('../../helper/omit_optional_validation_fields');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', userFreelanceController.getAllFreelanceProjects);

router.get('/executing', userFreelanceController.getAllExecutingProjects);

router.get(
  '/executing/:id',
  userFreelanceValidation.getOneFreelanceProject,
  userFreelanceController.getOneExecutingProject,
);

router.put(
  '/:id/applications/:application_id/mark',
  userFreelanceValidation.getProjectApplications,
  userFreelanceController.markProjectApplication,
);
router.get(
  '/:id/applications',
  userFreelanceValidation.getProjectApplications,
  userFreelanceController.getProjectApplications,
);

router.get(
  '/:id',
  userFreelanceValidation.getOneFreelanceProject,
  userFreelanceController.getOneFreelanceProject,
);

router.post(
  '/',
  omitOptionalValidationFields(['image']),
  uploadSingleImage('image'),
  validateOptionalImageUpload,
  userFreelanceValidation.createFreelanceProject,
  userFreelanceController.createFreelanceProject,
);

router.put(
  '/:id/review',
  omitOptionalValidationFields(['rating', 'comment']),
  userFreelanceValidation.review,
  userFreelanceController.review,
);

router.put(
  '/:id',
  omitOptionalValidationFields(['image']),
  uploadSingleImage('image'),
  validateOptionalImageUpload,
  userFreelanceValidation.updateFreelanceProject,
  userFreelanceController.updateFreelanceProject,
);

router.delete(
  '/:id',
  userFreelanceValidation.deleteFreelanceProject,
  userFreelanceController.deleteFreelanceProject,
);

module.exports = router;
