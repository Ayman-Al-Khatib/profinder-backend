const validationHandler = require('../../../helper/validation_handler');

exports.getJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.blockJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.unblockJob = [validationHandler.validateParamId, validationHandler.handleValidationResult];
