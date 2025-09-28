const validationHandler = require('../../../helper/validation_handler');

exports.getCompanyJobs = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.applyForJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.saveJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.unSaveJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.cancelApplyForJob = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];
