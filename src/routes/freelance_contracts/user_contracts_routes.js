const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const userContractsController = require('../../controllers/freelance_contracts/user_contracts_controller');
const userContractValidation = require('../../utils/validation/freelance_contracts/user_contracts_validation');
const { uploadMultiplePDF } = require('../../middleware/file_upload_middleware');
const { validateOptinalMutliplePDFUpload } = require('../../utils/validation/validate_file_upload');
const omit = require('../../helper/omit_optional_validation_fields');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', userContractsController.getCreatedContracts);

router.get('/:id', userContractValidation.oneContract, userContractsController.getOneContract);

router.post(
  '/',
  uploadMultiplePDF([{ name: 'attached_files', maxCount: 5 }]),
  validateOptinalMutliplePDFUpload('attached_files'),
  omit(['attached_links', 'attached_files']),
  userContractValidation.createContract,
  userContractsController.createContract,
);

router.put(
  '/:id/success',
  userContractValidation.oneContract,
  userContractsController.successContract,
);

router.put(
  '/:id/complain',
  userContractValidation.oneContract,
  userContractsController.complainContract,
);

router.put(
  '/:id',
  uploadMultiplePDF([{ name: 'attached_files', maxCount: 5 }]),
  validateOptinalMutliplePDFUpload('attached_files'),
  omit(['attached_links']),
  userContractValidation.updateContract,
  userContractsController.updateContract,
);

router.delete('/:id', userContractValidation.oneContract, userContractsController.deleteContract);

module.exports = router;
