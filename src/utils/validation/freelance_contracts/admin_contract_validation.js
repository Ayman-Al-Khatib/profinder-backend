const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

exports.oneContract = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.resolveContract = [
  validationHandler.validateParamId,
  body('documentry')
    .notEmpty()
    .withMessage($.admin_documentry_is_required)
    .bail()
    .isString()
    .withMessage($.admin_documentry_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 16, max: 2048 })
    .withMessage($.admin_documentry_should_be_between_16_and_2048_chars),
  body('new_amount')
    .exists()
    .withMessage($.new_amount_is_required)
    .bail()
    .isFloat({ min: 0 })
    .withMessage($.new_amount_should_be_a_float_greater_than_0_and_smaller_than_the_old_amount),
  validationHandler.handleValidationResult,
];
