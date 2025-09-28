const { body, check } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const uniqueArrayValues = require('../../../helper/unique_array_values');
const ApiError = require('../../../utils/api_error');
const isNumeric = require('../../../helper/is_numeric.js');
const $ = require('../../../locales/keys');
const languages = require('../../../constant/languages.js');
const {
  workPlaceTypes,
  jobTypes,
  positionLevels,
  experienceLevels,
} = require('../../../models/jobs_model.js');

const validateCompanyIdParam = check('company_id')
  .exists()
  .withMessage($.the_company_id_params_is_required)
  .bail()
  .isMongoId()
  .withMessage($.the_company_id_should_be_a_valid_mongo_id);

exports.createJob = [
  validateCompanyIdParam,

  body('title')
    .notEmpty()
    .withMessage($.job_title_is_required)
    .bail()
    .isString()
    .withMessage($.job_title_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    // .matches(/^[a-zA-Z0-9_\s-]+$/)
    // .withMessage($.job_title_can_only_contain_letters_numbers_spaces_underscores_and_hyphens)
    // .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage($.job_title_must_be_between_16_and_128),

  body('description')
    .notEmpty()
    .withMessage($.job_description_is_required)
    .bail()
    .isString()
    .withMessage($.job_description_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 64, max: 4096 })
    .withMessage($.description_length_should_be_between_64_and_4096),

  body('requirements')
    .notEmpty()
    .withMessage($.job_requirements_are_required)
    .bail()
    .isString()
    .withMessage($.job_requirements_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 64, max: 4096 })
    .withMessage($.job_requirements_should_be_between_64_and_4096),

  body('topics')
    .exists()
    .withMessage($.job_topics_are_required)
    .bail()
    .customSanitizer(value => {
      if (typeof value !== 'object') {
        console.log(value);
        try {
          value = JSON.parse(value);
          return value;
        } catch {
          throw new ApiError($.job_topics_should_be_an_array_with_1_to_5_elements);
        }
      }
      return value;
    })
    .bail()
    .isArray({ min: 1, max: 5 })
    .withMessage($.job_topics_must_be_an_array)
    .bail()
    .custom(topics => {
      topics.forEach(val => {
        if (typeof val !== 'string' || val.length > 32 || val.length < 2)
          throw new ApiError($.job_topics_must_be_string, 400);
      });

      const unique = uniqueArrayValues(topics);
      if (!unique) throw new ApiError($.job_topics_values_must_be_unique, 400);

      return Promise.resolve();
    })
    .customSanitizer(value => {
      return value.map(val => val.toLowerCase());
    }),
  body('location')
    .notEmpty()
    .withMessage($.job_location_is_required)
    .bail()
    .isString()
    .withMessage($.job_location_must_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 8, max: 128 })
    .withMessage($.job_location_must_be_between_8_and_128),

  body('languages')
    .optional()
    .isArray()
    .withMessage($.languages_should_be_array)
    .bail()
    .custom(langArr => {
      langArr.forEach(val => {
        if (!languages.some(language => language.code === val))
          throw new ApiError($.job_language_is_not_supported, 400);
      });
      return Promise.resolve();
    }),

  body('salary')
    .optional()
    .custom(salary => {
      const validFormat =
        salary !== null &&
        typeof salary === 'object' &&
        salary.min !== null &&
        salary.max !== null &&
        salary.currency !== null;

      if (!validFormat) throw new ApiError($.salary_must_be_an_object, 400);

      if (!isNumeric(salary.min) || !isNumeric(salary.max))
        throw new ApiError($.salary_min_and_max_must_be_nubmers, 400);

      salary.min *= 1;
      salary.max *= 1;

      if (salary.min >= salary.max) throw new ApiError($.salary_min_must_be_smaller_than_max, 400);

      if (salary.currency.length < 1 || salary.currency.length > 16)
        throw new ApiError($.salary_currecny_must_be_between_1_and_32, 400);

      return Promise.resolve();
    }),

  body('work_place')
    .optional()
    .isString()
    .withMessage($.work_place_should_be_a_string)
    .bail()
    .isIn(workPlaceTypes)
    .withMessage($.invalid_work_place),

  body('job_type')
    .optional()
    .isString()
    .withMessage($.job_type_should_be_a_string)
    .bail()
    .isIn(jobTypes)
    .withMessage($.invalid_job_type),

  body('position_level')
    .optional()
    .isString()
    .withMessage($.position_level_should_be_a_string)
    .bail()
    .isIn(positionLevels)
    .withMessage($.invalid_position_level),

  body('experience')
    .optional()
    .isString()
    .withMessage($.experience_should_be_a_string)
    .bail()
    .isIn(experienceLevels)
    .withMessage($.insupported_experience_level),

  body('closes_at')
    .optional()
    .isISO8601()
    .withMessage($.closes_at_should_be_iso)
    .bail()
    .custom(date => {
      const closingDate = new Date(date);
      const now = new Date();
      const twelveHoursPlus = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      if (closingDate < twelveHoursPlus) {
        throw new ApiError($.closes_at_should_be_now_plus_12_hours);
      }
      return Promise.resolve();
    }),
  body('public_manager')
    .optional()
    .isBoolean()
    .withMessage($.public_manager_should_be_a_boolean_value),
  validationHandler.handleValidationResult,
];

exports.getAllJobs = [validateCompanyIdParam, validationHandler.handleValidationResult];

exports.getOneJob = [
  validateCompanyIdParam,
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.deleteJob = [
  validateCompanyIdParam,
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getJobApplications = [
  validateCompanyIdParam,
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.updateJobApplication = [
  validateCompanyIdParam,
  validationHandler.validateParamId,
  body('closes_at')
    .optional()
    .isISO8601()
    .withMessage($.closes_at_should_be_iso)
    .bail()
    .custom(date => {
      const closingDate = new Date(date);
      const now = new Date();
      const twelveHoursPlus = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      if (closingDate < twelveHoursPlus) {
        throw new ApiError($.closes_at_should_be_now_plus_12_hours);
      }
      return Promise.resolve();
    }),
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
  validationHandler.handleValidationResult,
];
