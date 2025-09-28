const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const Admin = require('../../../models/admins_model');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');

function validatePasswordFields(value, { req }) {
  const { password, password_confirm, old_password } = req.body;
  if ((password || password_confirm || old_password) && !value) {
    throw new Error(
      $.please_ensure_all_required_fields_are_correctly_filled_if_youre_updating_your_password_both_the_current_and_new_passwords_must_be_entered_along_with_the_confirmation_of_the_new_password,
    );
  }
  return true;
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

function updateAdminValidation() {
  return [
    val.anyThingToUpdate(['username', 'password', 'password_confirm', 'old_password']),

    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage($.username_must_be_between_3_and_50_characters)
      .bail()

      .matches(/^[a-zA-Z0-9_\s-]+$/)
      .withMessage($.username_can_only_contain_letters_numbers_underscores_and_hyphens),

    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage($.password_must_be_at_least_8_characters_long)
      .bail()

      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
      .withMessage(
        $.password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_character,
      ),

    body('old_password')
      .optional()
      .isLength({ min: 8 })
      .withMessage($.old_password_must_be_at_least_8_characters_long)
      .bail()

      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
      .withMessage(
        $.old_password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_character,
      ),

    body('password_confirm')
      .optional()
      .custom((value, { req }) => {
        if (req.body.password !== req.body.password_confirm) {
          throw new Error($.password_confirmation_does_not_match);
        }
        return true;
      }),

    body(['old_password', 'password', 'password_confirm']).custom(validatePasswordFields),

    body('password').custom(async (_, { req }) => {
      const { password, password_confirm, old_password } = req.body;
      const errors = validationResult(req);
      const errorsPath = errors.array().map(error => error.path);

      if (
        errorsPath.includes('password_confirm') ||
        errorsPath.includes('password') ||
        errorsPath.includes('old_password') ||
        (!password_confirm && !old_password && !password)
      ) {
        return true;
      }

      if (old_password == password) {
        throw new Error($.new_password_must_be_different_from_the_current_password);
      }

      const admin = await Admin.findById(req.admin._id);

      if (admin) {
        const isPasswordMatch = await bcrypt.compare(password, admin.password);

        if (isPasswordMatch) {
          throw new Error($.the_current_password_you_entered_does_not_match_our_records);
        }
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
        const existingAdmin = await Admin.findActive({ email: value });
        if (!existingAdmin) {
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
        const existingAdmin = await Admin.findActive({ email: value });

        if (!existingAdmin) {
          throw new Error($.email_is_not_yet_registered);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  loginValidation: loginValidation(),
  updateAdminValidation: updateAdminValidation(),
  resetPasswordValidation: resetPasswordValidation(),
  sendVerificationValidation: sendVerificationValidation(),
  ...ValidationHandler,
};
