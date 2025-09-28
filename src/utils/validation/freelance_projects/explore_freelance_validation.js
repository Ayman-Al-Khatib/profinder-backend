const validationHandler = require('../../../helper/validation_handler');

exports.getOneProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getPublisherProjects = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.saveProject = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.unSaveProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.applyForProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.cancelApplyForProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];
