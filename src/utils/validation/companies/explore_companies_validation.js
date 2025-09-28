const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const ApiError = require('../../api_error');
const $ = require('../../../locales/keys');

exports.getCompany = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.createCompanyExperience = [
  validationHandler.validateParamId,
  body('start_date')
    .notEmpty()
    .withMessage($.connection_start_date_is_required)
    .bail()
    .isISO8601()
    // .isDate()
    .withMessage($.connection_start_date_must_be_valid_date),

  body('end_date')
    .optional()
    .isISO8601()
    // .isDate()
    .withMessage($.connection_end_date_must_be_valid_date)
    .custom((value, { req }) => {
      if (value < req.body.start_date) {
        throw new ApiError($.end_date_cannot_be_before_start_date);
      }
      return Promise.resolve();
    }),
  validationHandler.handleValidationResult,
];

exports.deleteCompanyExperience = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.acceptManagerRequest = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.rejectManagerRequest = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];
