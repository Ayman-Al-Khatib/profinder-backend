const validationHandler = require('../../../helper/validation_handler');

exports.oneContract = [validationHandler.validateParamId, validationHandler.handleValidationResult];
