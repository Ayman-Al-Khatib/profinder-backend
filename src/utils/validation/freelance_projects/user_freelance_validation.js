const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const ApiError = require('../../api_error');
const uniqueArrayValues = require('../../../helper/unique_array_values');
const isNumeric = require('../../../helper/is_numeric');
const $ = require('../../../locales/keys');

exports.getOneFreelanceProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getProjectApplications = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.createFreelanceProject = [
  body('title')
    .notEmpty()
    .withMessage($.freelance_project_title_is_required)
    .bail()
    .isString()
    .withMessage($.freelance_project_title_must_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 16, max: 128 })
    .withMessage($.freelance_project_title_should_be_between_16_and_128_chars),
  body('description')
    .notEmpty()
    .withMessage($.freelance_project_description_is_required)
    .bail()
    .isString()
    .withMessage($.freelance_project_description_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 64, max: 4096 })
    .withMessage($.freelance_project_description_should_be_between_64_and_4096_chars),
  body('topics')
    .exists()
    .withMessage($.freelance_project_topics_are_required)
    .customSanitizer(value => {
      if (typeof value !== 'object') {
        console.log(value);
        try {
          value = JSON.parse(value);
          return value;
        } catch {
          throw new ApiError($.job_topics_should_be_an_array_with_1_to_5_elements, 400);
        }
      }
      return value;
    })
    .bail()
    .isArray({ min: 1, max: 5 })
    .withMessage($.freelance_project_topics_should_be_an_array_with_1_to_5_elements)
    .bail()
    .custom(topics => {
      topics.forEach(val => {
        if (typeof val !== 'string' || val.length > 32 || val.length < 2)
          throw new ApiError($.freelance_project_topics_should_be_a_string_with_2_to_32_chars, 400);
      });

      const unique = uniqueArrayValues(topics);
      if (!unique) throw new ApiError($.freelance_project_topics_should_be_unique, 400);

      return Promise.resolve();
    })
    .customSanitizer(value => {
      return value.map(val => val.toLowerCase());
    }),
  body('budget')
    .exists()
    .withMessage($.freelance_project_budget_is_required)
    .bail()
    .custom(budget => {
      const validFormat =
        budget !== null &&
        typeof budget === 'object' &&
        isNumeric(budget.min) &&
        isNumeric(budget.max) &&
        typeof budget.currency === 'string';

      if (!validFormat)
        throw new ApiError(
          $.freelance_project_budget_should_be_an_object_with_min_max_currency_properties,
        );

      if (+budget.min >= +budget.max) throw new ApiError($.budget_min_cannot_be_greater_than_max);

      if (budget.currency.length < 1 || budget.currency.length > 16)
        throw new ApiError($.budget_currency_should_be_between_1_and_16_chars);

      return Promise.resolve();
    }),

  body('working_interval')
    .exists()
    .withMessage($.freelance_project_working_interval_is_required)
    .bail()
    .isInt({ min: 1, max: 365 })
    .withMessage($.freelance_project_working_interval_should_be_intergar_between_10_and_365),
  validationHandler.handleValidationResult,
];

exports.updateFreelanceProject = [
  validationHandler.validateParamId,
  body('title')
    .optional()
    .isString()
    .withMessage($.freelance_project_title_must_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 16, max: 128 })
    .withMessage($.freelance_project_title_should_be_between_16_and_128_chars),
  body('description')
    .optional()
    .isString()
    .withMessage($.freelance_project_description_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 64, max: 4096 })
    .withMessage($.freelance_project_description_should_be_between_64_and_4096_chars),
  body('topics')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
          return value;
        } catch {
          throw new ApiError($.job_topics_should_be_an_array_with_1_to_5_elements, 400);
        }
      }
      return value;
    })
    .bail()
    .isArray({ min: 1, max: 5 })
    .withMessage($.freelance_project_topics_should_be_an_array_with_1_to_5_elements)
    .bail()
    .custom(topics => {
      topics.forEach(val => {
        if (typeof val !== 'string' || val.length > 32 || val.length < 2)
          throw new ApiError($.freelance_project_topics_should_be_a_string_with_2_to_32_chars, 400);
      });

      const unique = uniqueArrayValues(topics);
      if (!unique) throw new ApiError($.freelance_project_topics_should_be_unique, 400);

      return Promise.resolve();
    }),
  body('budget')
    .optional()
    .custom(budget => {
      const validFormat =
        budget !== null &&
        typeof budget === 'object' &&
        isNumeric(budget.min) &&
        isNumeric(budget.max) &&
        typeof budget.currency === 'string';

      if (!validFormat)
        throw new ApiError(
          $.freelance_project_budget_should_be_an_object_with_min_max_currency_properties,
        );

      if (+budget.min >= +budget.max) throw new ApiError($.budget_min_cannot_be_greater_than_max);

      if (budget.currency.length < 1 || budget.currency.length > 16)
        throw new ApiError($.budget_currency_should_be_between_1_and_16_chars);

      return Promise.resolve();
    }),

  body('working_interval')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage($.freelance_project_working_interval_should_be_intergar_between_10_and_365),
  validationHandler.handleValidationResult,
];

exports.deleteFreelanceProject = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.review = [
  validationHandler.validateParamId,
  body('rating')
    // .exists()
    // .withMessage($.the_review_rating_is_required)
    // .bail()
    .optional()
    .isFloat({ max: 5, min: 1 })
    .withMessage($.the_rating_should_be_a_float_number_between_1_and_5),
  body('comment')
    // .exists()
    // .withMessage($.the_review_comment_is_required)
    // .bail()
    .optional()
    .isString()
    .withMessage($.the_review_comment_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 4, max: 256 })
    .withMessage($.the_review_comment_should_be_between_4_and_256_chars),
  validationHandler.handleValidationResult,
];
