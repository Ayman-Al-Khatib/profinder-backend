const { check } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const ApiError = require('../../api_error');
const $ = require('../../../locales/keys');

exports.getOneTransaction = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.handleWithdrawTransaction = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.statisticsValidation = [
  check('start_date')
    .exists()
    .withMessage($.start_date_is_required)
    .bail()
    .isISO8601()
    .withMessage($.the_start_date_should_take_iso_8601_format),
  check('end_date')
    .exists()
    .withMessage($.end_date_is_required)
    .bail()
    .isISO8601()
    .withMessage($.the_end_date_should_take_iso_8601_format)
    .custom((value, { req }) => {
      const startDate = new Date(req.query.start_date);
      const endDate = new Date(value);
      if (startDate > endDate) throw new ApiError($.the_start_date_must_precede_the_end_date);
      return Promise.resolve();
    }),
  check('options')
    .notEmpty()
    .withMessage($.statistics_options_is_required)
    .isString()
    .withMessage($.statistics_options_is_string),
  validationHandler.handleValidationResult,
];
