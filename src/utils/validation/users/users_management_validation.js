const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const bcrypt = require('bcryptjs');
const User = require('../../../models/users_model');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');

function createUserValidation() {
  return [
    body('username')
      .notEmpty()
      .withMessage($.username_is_required)
      .bail()
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

function updateUserValidation() {
  return [
    val.anyThingToUpdate([
      'username',
      'approved',
      'password',
      'password_confirm',
      'profile_image',
      'background_image',
    ]),

    val.removeNullAndEmpty(['profile_image', 'background_image', 'deleted_at']),

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

    body('approved').optional().isBoolean().withMessage($.approval_must_be_a_boolean_value),

    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage($.password_must_be_at_least_8_characters_long)
      .bail()

      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
      .withMessage(
        $.password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_characte,
      ),

    body('password').custom(async (_, { req }) => {
      const { password, password_confirm } = req.body;
      if (!password && password_confirm) {
        throw new Error($.both_password_and_confirm_password_are_required_or_both_should_be_empty);
      } else if (password && password_confirm) {
        const user = await User.findById(req.params.id);
        if (user) {
          const isPasswordMatch = await bcrypt.compare(password, user.password);
          if (isPasswordMatch) {
            throw new Error($.new_password_must_be_different_from_the_current_password);
          }
        }
      }

      return true;
    }),

    body('password_confirm')
      .optional()
      .custom((value, { req }) => {
        if (req.body.password !== req.body.password_confirm) {
          throw new Error($.password_confirmation_does_not_match);
        }
        return true;
      }),

    body('password_confirm').custom(async (value, { req }) => {
      const { password, password_confirm } = req.body;
      if (password && !password_confirm) {
        throw new Error($.both_password_and_confirm_password_are_required_or_both_should_be_empty);
      }

      return true;
    }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createUserValidation: createUserValidation(),
  updateUserValidation: updateUserValidation(),
  ...ValidationHandler,
};
