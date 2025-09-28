const validationHandler = require('../../../helper/validation_handler');

exports.getProject = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.blockProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.unblockProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];
