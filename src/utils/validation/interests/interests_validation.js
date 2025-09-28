const { param, body } = require('express-validator');
const validationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

function createInterest() {
  return [
    body('interests')
      .notEmpty()
      .withMessage($.interest_cannot_be_empty)
      .bail()
      .custom(value => {
        if (typeof value === 'string' || Array.isArray(value)) {
          return true;
        }
        throw new Error($.interest_must_be_a_string);
      })
      .bail()
      .custom(value => {
        if (typeof value === 'string') {
          value = [value];
        }
        for (const int of value) {
          if (typeof int !== 'string') {
            throw new Error($.interest_must_be_a_string);
          }
          if (int.trim().length < 2 || int.trim().length > 50) {
            throw new Error($.interest_must_be_between_2_and_50_characters);
          }
        }
        return true;
      }),

    validationHandler.handleValidationResult,
  ];
}

function updateInterest() {
  return [
    body('old_interest')
      .notEmpty()
      .withMessage($.old_interest_cannot_be_empty)
      .bail()

      .isString()
      .withMessage($.old_interest_must_be_a_string)
      .bail()

      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage($.old_interest_must_be_between_2_and_50_characters),

    body('new_interest')
      .notEmpty()
      .withMessage($.new_interest_cannot_be_empty)
      .bail()

      .isString()
      .withMessage($.new_interest_must_be_a_string)
      .bail()

      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage($.new_interest_must_be_between_2_and_50_characters),

    validationHandler.handleValidationResult,
  ];
}

function deleteInterest() {
  return [
    param('interest')
      .notEmpty()
      .withMessage($.interest_parameter_cannot_be_empty)
      .bail()

      .isString()
      .withMessage($.interest_parameter_must_be_a_string)
      .bail()

      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage($.interest_must_be_between_2_and_50_characters),

    validationHandler.handleValidationResult,
  ];
}

module.exports = {
  deleteInterest: deleteInterest(),
  updateInterest: updateInterest(),
  createInterest: createInterest(),
};
