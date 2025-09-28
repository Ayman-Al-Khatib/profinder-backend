const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');
function update() {
  return [
    val.anyThingToUpdate(['street', 'city', 'conservative', 'country']),

    val.removeNullAndEmpty(),

    body('country')
      .optional()
      .isString()
      .withMessage($.county_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.county_must_be_between_3_and_128_characters),

    body('conservative')
      .optional()
      .isString()
      .withMessage($.conservative_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.conservative_must_be_between_3_and_128_characters),

    body('city')
      .optional()
      .isString()
      .withMessage($.city_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.city_must_must_be_between_3_and_128_characters),

    body('street')
      .optional()
      .isString()
      .withMessage($.street_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.street_must_be_between_3_and_128_characters),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  update: update(),

  ...ValidationHandler,
};
