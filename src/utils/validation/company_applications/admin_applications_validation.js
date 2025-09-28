const { body } = require('express-validator');
const validationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

exports.rejectApplicationValidation = [
  validationHandler.validateParamId,
  body('rejection_reason')
    .notEmpty()
    .withMessage($.rejection_reason_is_required)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ max: 1024 })
    .withMessage($.rejection_reason_is_256_max),
  validationHandler.handleValidationResult,
];

exports.acceptApplicationValidation = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getApplicationValidation = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];
