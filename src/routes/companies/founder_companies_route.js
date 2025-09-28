const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const founderCompanyController = require('../../controllers/companies/founder_companies_controller');
const founderCompanyValidation = require('../../utils/validation/companies/founder_companies_vaildation');
const omitOptionalValidationFields = require('../../helper/omit_optional_validation_fields');
const { uploadSingleImage } = require('../../middleware/file_upload_middleware');
const { validateOptionalImageUpload } = require('../../utils/validation/validate_file_upload');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', founderCompanyController.getCompanies);

router.get('/:id/manager-requests', founderCompanyController.getSentManagerRequests);

router.get('/:id', founderCompanyValidation.getOne, founderCompanyController.getCompany);

router.post(
  '/:id/manager-request',
  omitOptionalValidationFields(['website', 'founded_at']),
  founderCompanyValidation.sendAddManagerRequest,
  founderCompanyController.sendAddManagerRequest,
);

router.delete(
  '/:id/manager-request/:request_id',
  founderCompanyValidation.deleteManagerRequest,
  founderCompanyController.deleteManagerRequest,
);

router.put(
  '/:id/remove-manager',
  founderCompanyValidation.removeManager,
  founderCompanyController.removeManager,
);

router.put(
  '/:id/update-image',
  uploadSingleImage('image'),
  validateOptionalImageUpload,

  founderCompanyValidation.updateImage,
  founderCompanyController.updateImage,
);

router.put(
  '/:id',
  omitOptionalValidationFields(['website', 'founded_at']),
  founderCompanyValidation.updateOne,
  founderCompanyController.updateCompany,
);

router.delete('/:id', founderCompanyValidation.deleteOne, founderCompanyController.deleteCompany);

module.exports = router;
