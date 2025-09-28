const { body, check } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const Company = require('../../../models/companies_model');
const $ = require('../../../locales/keys');
const ApiError = require('../../../utils/api_error');
const { employeeRanges } = require('../../../models/company_applications_model');

exports.getOne = [validationHandler.validateParamId, validationHandler.handleValidationResult];

// exports.addManager = [
//   validationHandler.validateParamId,
//   body('manager_id')
//     .exists()
//     .withMessage($.manager_id_is_required)
//     .isMongoId()
//     .withMessage($.id_is_not_valid),
//   validationHandler.handleValidationResult,
// ];

exports.sendAddManagerRequest = [
  validationHandler.validateParamId,
  body('receiver')
    .exists()
    .withMessage($.manager_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.id_is_not_valid),
  validationHandler.handleValidationResult,
];

exports.deleteManagerRequest = [
  validationHandler.validateParamId,
  check('request_id')
    .exists()
    .withMessage($.request_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.invalid_objectid),
  validationHandler.handleValidationResult,
];

exports.removeManager = [
  validationHandler.validateParamId,
  body('manager_id')
    .exists()
    .withMessage($.manager_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.id_is_not_valid),
  validationHandler.handleValidationResult,
];

exports.updateOne = [
  validationHandler.validateParamId,
  body('name')
    .optional()
    .isString()
    .withMessage($.copmany_name_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 3, max: 50 })
    .withMessage($.company_name_must_be_between_3_and_50_characters)
    .bail()
    .matches(/^[a-zA-Z0-9_\s-]+$/)
    .withMessage($.company_name_can_only_contain_letters_numbers_spaces_underscores_and_hyphens),

  body('email')
    .optional()
    .isString()
    .withMessage($.company_email_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 5, max: 255 })
    .withMessage($.company_email_must_be_between_5_and_255_characters_long)
    .bail()
    .isEmail()
    .withMessage(() => $.company_email_form)
    .bail()
    .matches(/^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/)
    .withMessage(() => $.company_email_form)
    .bail()
    .custom(async value => {
      const company = await Company.findOne({ email: value });
      if (company && !company.deleted_at) {
        throw new ApiError($.the_company_email_should_be_unique);
      }
      return Promise.resolve();
    }),

  body('phone_number')
    .optional()
    .isString()
    .withMessage($.company_phone_number_should_be_a_string)
    .bail()
    .isLength({ max: 15 })
    .withMessage($.company_phone_must_be_less_than_15_digits)
    .bail()
    .matches(/^\+(?:[0-9] ?){6,14}[0-9]$/)
    .withMessage($.company_phone_must_match_the_international_format),

  body('industry')
    .optional()
    .isString()
    .withMessage($.company_industry_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 2, max: 64 })
    .withMessage($.company_industry_must_be_between_2_and_64_characters),

  body('size')
    .optional()
    .isObject()
    .withMessage($.company_size_must_be_an_object)
    .bail()
    .custom(value => {
      if (!value || !value.min || !value.max) {
        throw new Error($.company_size_is_not_supported);
      }

      const isValidRange = employeeRanges.some(
        empRange => empRange.min === +value.min && empRange.max === +value.max,
      );

      if (!isValidRange) throw new Error($.company_size_is_not_supported);

      return true;
    }),

  body('description')
    .optional()
    .isString()
    .withMessage($.company_description_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 16, max: 2048 })
    .withMessage($.company_description_should_be_between_16_and_2048_characters),

  body('website')
    .optional()
    .isString()
    .withMessage($.company_website_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 10, max: 128 })
    .withMessage($.company_website_should_be_between_10_and_128_characters_long)
    .bail()
    .matches(
      // eslint-disable-next-line no-useless-escape
      /^(https?|ftp):\/\/(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s\/?#]+)?(?:\?[^\s\/?#]+)?$/,
    )
    .withMessage(
      $.company_website_should_start_with_http_or_https_and_include_a_valid_domain_name_and_top_level_domain,
    ),

  body('founded_at')
    .optional()
    .isISO8601()
    .withMessage($.company_date_of_found_must_be_a_valid_date),

  body('location')
    .optional()
    .isString()
    .withMessage($.company_location_should_be_a_string)
    .bail()
    .customSanitizer(value => value.trim())
    .isLength({ min: 3, max: 128 })
    .withMessage($.company_location_must_be_between_3_and_128_characters),

  validationHandler.handleValidationResult,
];

exports.deleteOne = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.updateImage = [validationHandler.validateParamId, validationHandler.handleValidationResult];
