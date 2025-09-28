const { body } = require('express-validator');

const Contract = require('../../../models/freelance_contracts_model');
const validationHandler = require('../../../helper/validation_handler');
const ApiError = require('../../../utils/api_error');
const uniqueArrayValues = require('../../../helper/unique_array_values');
const $ = require('../../../locales/keys');

const futureDate = async (val, req, property = null) => {
  if (property) {
    const contract = await Contract.findById(req.params.id);
    if (contract[property].toISOString() === val) {
      return Promise.resolve();
    }
  }

  const start = new Date(val);
  const now = new Date();
  if (start < now) {
    throw new ApiError($.start_end_and_deadline_dates_cannot_be_in_the_past);
  }
  return Promise.resolve();
};

exports.createContract = [
  body('freelance_project_id')
    .exists()
    .withMessage($.freelance_project_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.freelance_project_id_should_a_valid_mongodb_id),
  body('service_executor_id')
    .exists()
    .withMessage($.service_executer_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.service_executer_id_should_be_a_valid_mongodb_id),
  body('description')
    .notEmpty()
    .withMessage($.contract_description_is_required)
    .bail()
    .isString()
    .withMessage($.contract_description_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 128, max: 4096 })
    .withMessage($.contract_description_should_be_between_128_and_4096),
  body('terms_and_conditions')
    .notEmpty()
    .withMessage($.contract_terms_and_conditions_is_required)
    .bail()
    .isString()
    .withMessage($.contract_terms_and_conditions_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 128, max: 4096 })
    .withMessage($.contract_terms_and_conditions_should_be_between_128_and_4096),
  body('attached_links')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage($.attached_links_should_be_an_array_between_1_and_10_elements)
    .bail()
    .custom(uniqueArrayValues)
    .withMessage($.attahced_links_array_elements_should_be_unique)
    .bail()
    .custom(arr => {
      arr.forEach(val => {
        if (typeof val !== 'string' || val.trim().length < 10 || val.trim().length > 512) {
          throw new ApiError($.attahced_links_elements_should_be_a_string_with_10_to_512_chars);
        }
      });

      return Promise.resolve();
    }),
  body('payment')
    .exists()
    .withMessage($.contract_payment_is_required)
    .bail()
    .isFloat({ min: 1000 })
    .withMessage($.contract_payment_should_be_a_float_number),
  body('start_date')
    .exists()
    .withMessage($.contract_start_date_is_required)
    .bail()
    .isISO8601()
    .withMessage($.start_date_should_take_the_iso8601_format)
    .bail()
    .custom(futureDate),
  body('deadline')
    .exists()
    .withMessage($.contract_deadline_is_required)
    .bail()
    .isISO8601()
    .withMessage($.contract_deadline_should_take_iso8601_format)
    .bail()
    .custom(futureDate)
    .bail()
    .custom((value, { req }) => {
      const deadline = new Date(value);
      let start = new Date(req.body.start_date);
      start.setDate(start.getDate() + 1);
      if (deadline < start) {
        throw new ApiError($.deadline_should_be_at_least_one_day_after_start_date);
      }
      return Promise.resolve();
    }),
  validationHandler.handleValidationResult,
];

exports.updateContract = [
  body('description')
    .optional()
    .isString()
    .withMessage($.contract_description_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 128, max: 4096 })
    .withMessage($.contract_description_should_be_between_128_and_4096),
  body('terms_and_conditions')
    .optional()
    .isString()
    .withMessage($.contract_terms_and_conditions_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 128, max: 4096 })
    .withMessage($.contract_terms_and_conditions_should_be_between_128_and_4096),
  body('attached_links')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage($.attached_links_should_be_an_array_between_1_and_10_elements)
    .bail()
    .custom(uniqueArrayValues)
    .withMessage($.attahced_links_array_elements_should_be_unique)
    .bail()
    .custom(arr => {
      arr.forEach(val => {
        if (typeof val !== 'string' || val.trim().length < 10 || val.trim().length > 512) {
          throw new ApiError($.attahced_links_elements_should_be_a_string_with_10_to_512_chars);
        }
      });

      return Promise.resolve();
    }),
  body('payment')
    .optional()
    .bail()
    .isFloat({ min: 1000 })
    .withMessage($.contract_payment_should_be_a_float_number),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage($.start_date_should_take_the_iso8601_format)
    .bail()
    .custom((val, { req }) => futureDate(val, req, 'start_date'))
    .custom(async (value, { req }) => {
      const contract = await Contract.findById(req.params.id);
      const deadline = req.body.deadline || contract?.deadline || 0;
      const deadlineDate = new Date(deadline);
      let startDate = new Date(value);
      startDate.setDate(startDate.getDate() + 1);
      if (deadlineDate < startDate) {
        throw new ApiError($.deadline_should_be_at_least_one_day_after_start_date);
      }
      return Promise.resolve();
    }),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage($.contract_deadline_should_take_iso8601_format)
    .bail()
    .custom((value, { req }) => futureDate(value, req, 'deadline'))
    .bail()
    .custom(async (value, { req }) => {
      const contract = await Contract.findById(req.params.id);
      const deadline = new Date(value);
      let startDate = req.body.start_date || contract?.start_date || 0;
      startDate = new Date(startDate);
      startDate.setDate(startDate.getDate() + 1);
      if (deadline < startDate) {
        throw new ApiError($.deadline_should_be_at_least_one_day_after_start_date);
      }
      return Promise.resolve();
    }),
  validationHandler.handleValidationResult,
];

exports.oneContract = [validationHandler.validateParamId, validationHandler.handleValidationResult];
