const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
function createTokenValidation() {
  return [
    body('token')
      .exists()
      .withMessage($.the_token_field_cannot_be_empty)
      .bail()
      .trim()
      .notEmpty()
      .withMessage($.the_token_field_is_required),

    //TODO:TR
    body('lang')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Language field must be exactly 2 letters.')
      .isAlpha()
      .withMessage('Language field must only contain letters.')
      .notEmpty()
      .withMessage('Language field is required.'),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createTokenValidation: createTokenValidation(),
  ...ValidationHandler,
};
