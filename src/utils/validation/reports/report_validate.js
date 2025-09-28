const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const ApiError = require('../../api_error');
const reportStatus = ['resolved_by_admin', 'deemed_false'];
const $ = require('../../../locales/keys');

const REPORT_REASONS = require('../../../constant/report_reasons');

exports.createReportValidator = [
  validationHandler.validateParamId,
  body('reason')
    .exists()
    .withMessage($.report_reason_is_required)
    .bail()
    .custom(value => {
      const validReason = REPORT_REASONS.some(reason => value === reason.code);
      if (!validReason) {
        throw new ApiError($.invalid_report_reason);
      }

      return Promise.resolve();
    }),
  validationHandler.handleValidationResult,
];

exports.handleReportValidator = [
  validationHandler.validateParamId,
  body('status')
    .exists()
    .withMessage($.the_report_status_is_required)
    .bail()
    .custom(value => {
      if (!reportStatus.some(status => status === value)) {
        throw new ApiError($.invalid_report_status);
      }
      return Promise.resolve();
    }),
  body('comment')
    .optional()
    .isString()
    .isLength({ min: 2, max: 128 })
    .withMessage($.the_comment_on_the_report_should_be_a_string_between_2_and_128_chars),
  validationHandler.handleValidationResult,
];
