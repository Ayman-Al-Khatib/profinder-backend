const express = require('express');

const userApplicationsController = require('../../controllers/company_applications/user_applications_controller');
const accessControl = require('../../middleware/access_control_middleware');
const userApplicationsValidation = require('../../utils/validation/company_applications/user_applications_validation');
const {
  validateOptionalPDFUpload,
  validateRequiredPDFUpload,
} = require('../../utils/validation/validate_file_upload');
const { uploadSinglePDF } = require('../../middleware/file_upload_middleware');
const omitOptionalValidationFeilds = require('../../helper/omit_optional_validation_fields');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/documents/:documentUrl', userApplicationsController.downloadDocument);

router.get(
  '/',

  userApplicationsController.getApplications,
);

router.get('/:id', userApplicationsValidation.getOne, userApplicationsController.getApplication);

router.post(
  '/',
  uploadSinglePDF('document'),
  validateRequiredPDFUpload,
  omitOptionalValidationFeilds(['website', 'founded_at']),
  userApplicationsValidation.createOneValidation,
  userApplicationsController.createApplication,
);

router.put(
  '/:id',
  uploadSinglePDF('document'),
  validateOptionalPDFUpload,
  omitOptionalValidationFeilds(['website', 'founded_at']),
  userApplicationsValidation.updateOne,
  userApplicationsController.updateApplication,
);

router.delete(
  '/:id',
  userApplicationsValidation.deleteOne,
  userApplicationsController.deleteApplication,
);

module.exports = router;
