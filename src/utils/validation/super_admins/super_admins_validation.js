const { body } = require('express-validator');
const SuperAdmin = require('../../../models/super_admins_model');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

function signupValidation() {
  return [
    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address)
      .bail()
      .custom(async value => {
        const existingSuperAdmin = await SuperAdmin.findOne({ email: value });
        if (existingSuperAdmin) {
          throw new Error($.email_is_already_registered);
        }
      }),

    body('password')
      .notEmpty()
      .withMessage($.password_is_required)
      .bail()
      .isLength({ min: 8 })
      .withMessage($.password_must_be_at_least_8_characters_long)
      .bail()

      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
      .withMessage(
        $.password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_characte,
      ),

    body('password_confirm')
      .notEmpty()
      .withMessage($.password_confirm_is_required)
      .bail()
      .custom((password, { req }) => {
        if (req.body.password !== req.body.password_confirm) {
          throw new Error($.password_confirmation_does_not_match);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function loginValidation() {
  return [
    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address),

    body('password')
      .notEmpty()
      .withMessage($.password_is_required)
      .bail()
      .isLength({ min: 8 })
      .withMessage($.password_must_be_at_least_8_characters_long),

    ValidationHandler.handleValidationResult,
  ];
}

function sendVerificationValidation() {
  return [
    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address)
      .bail()
      .custom(async value => {
        const existingSuperAdmin = await SuperAdmin.findActive({ email: value });

        if (!existingSuperAdmin) {
          throw new Error($.email_is_not_yet_registered);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function resetPasswordValidation() {
  return [
    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address)
      .bail()
      .custom(async value => {
        const existingSuperAdmin = await SuperAdmin.findActive({ email: value });
        if (!existingSuperAdmin) {
          throw new Error($.email_is_not_yet_registered);
        }
        return true;
      }),

    body('verify_code')
      .notEmpty()
      .withMessage($.verification_code_is_required)
      .bail()
      .isNumeric()

      .withMessage($.verification_code_must_be_numeric)
      .bail()
      .isLength({ min: 6, max: 6 })
      .withMessage($.verification_code_must_be_6_digits),

    body('password')
      .notEmpty()
      .withMessage($.password_is_required)
      .bail()
      .isLength({ min: 8 })
      .withMessage($.password_must_be_at_least_8_characters_long)
      .bail()

      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
      .withMessage(
        $.password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_characte,
      ),

    body('password_confirm')
      .notEmpty()
      .withMessage($.password_confirm_is_required)
      .bail()
      .custom((password, { req }) => {
        if (req.body.password !== req.body.password_confirm) {
          throw new Error($.password_confirmation_does_not_match);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function passwordProtection() {
  return [
    body('password')
      .notEmpty()
      .withMessage('Password is required')

      .bail()
      .custom(async value => {
        if (process.env.RESET_DATABASE_PASSWORD === value) {
          return true;
        } else {
          throw new Error('Incorrect password');
        }
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  passwordProtection: passwordProtection(),
  signupValidation: signupValidation(),
  loginValidation: loginValidation(),
  sendVerificationValidation: sendVerificationValidation(),
  resetPasswordValidation: resetPasswordValidation(),
  ...ValidationHandler,
};
