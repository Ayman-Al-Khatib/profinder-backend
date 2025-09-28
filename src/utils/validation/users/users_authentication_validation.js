const { body, validationResult } = require('express-validator');
const User = require('../../../models/users_model');
const ValidationHandler = require('../../../helper/validation_handler');
const bcrypt = require('bcryptjs');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');

function signupValidation() {
  return [
    body('username')
      .notEmpty()
      .withMessage($.username_is_required)
      .bail()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage($.username_must_be_between_3_and_50_characters)
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage($.username_can_only_contain_letters_numbers_underscores_and_hyphens)
      .bail()
      .custom(async value => {
        const existingUser = await User.findOne({ username: value });
        if (existingUser) {
          throw new Error($.username_is_already_taken);
        }
      }),

    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address)
      .bail()
      .custom(async value => {
        const existingUser = await User.findOne({ email: value });
        if (existingUser) {
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
        const existingUser = await User.findActive({ email: value });
        if (!existingUser) {
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
        const existingUser = await User.findActive({ email: value });
        if (!existingUser) {
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

function updateUserValidation() {
  const validatePasswordFields = (value, { req }) => {
    const { password, password_confirm, old_password } = req.body;
    if ((password || password_confirm || old_password) && !value) {
      throw new Error(
        $.please_ensure_all_required_fields_are_correctly_filled_if_youre_updating_your_password_both_the_current_and_new_passwords_must_be_entered_along_with_the_confirmation_of_the_new_password,
      );
    }
    return true;
  };

  return [
    val.anyThingToUpdate([
      'username',
      'password',
      'password_confirm',
      'old_password',
      'profile_image',
      'background_image',
    ]),

    val.removeNullAndEmpty(['profile_image', 'background_image']),

    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage($.username_must_be_between_3_and_50_characters)
      .bail()

      .matches(/^[a-zA-Z0-9_\s-]+$/)
      .withMessage($.username_can_only_contain_letters_numbers_underscores_and_hyphens)
      .bail()

      .custom(async value => {
        const existingUser = await User.findOne({ username: value });
        if (existingUser) {
          throw new Error($.username_is_already_taken);
        }
      }),

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

      const user = await User.findById(req.user._id);

      if (user) {
        if (!user.password && user.source == 'google') return true;

        const isPasswordMatch = await bcrypt.compare(old_password, user.password);

        if (isPasswordMatch) {
          throw new Error($.the_current_password_you_entered_does_not_match_our_records);
        }
      }
      return true;
    }),

    ValidationHandler.handleValidationResult,
  ];
}

function approveValidation() {
  return [
    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address)
      .bail()

      .custom(async value => {
        const existingUser = await User.findOne({ email: value });
        if (!existingUser) {
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
    ValidationHandler.handleValidationResult,
  ];
}

function signInGoogleValidation() {
  return [
    // Validate that access_token is present
    body('access_token')
      .notEmpty()
      .withMessage($.access_token_is_required)
      .bail()
      .isString()
      .withMessage($.access_token_must_be_a_string),

    // Validate that google_id is present
    body('google_id')
      .notEmpty()
      .withMessage($.google_id_is_required)
      .bail()
      .isString()
      .withMessage($.google_id_must_be_a_string),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  signInGoogleValidation: signInGoogleValidation(),
  signupValidation: signupValidation(),
  loginValidation: loginValidation(),
  sendVerificationValidation: sendVerificationValidation(),
  resetPasswordValidation: resetPasswordValidation(),
  updateUserValidation: updateUserValidation(),
  approveValidation: approveValidation(),
  ...ValidationHandler,
};
