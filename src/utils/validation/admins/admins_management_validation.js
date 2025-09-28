const { body, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const ValidationHandler = require('../../../helper/validation_handler');
const Admin = require('../../../models/admins_model');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');

function createAdminValidation() {
  return [
    body('username')
      .notEmpty()
      .withMessage($.username_is_required)
      .bail()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage($.username_must_be_between_3_and_50_characters)
      .bail()

      .matches(/^[a-zA-Z0-9_\s-]+$/)

      .withMessage($.username_can_only_contain_letters_numbers_underscores_and_hyphens)
      .custom(async value => {
        const existingAdmin = await Admin.findOne({ username: value });
        if (existingAdmin) {
          throw new Error($.username_is_already_taken);
        }
      }),

    body('roles')
      .isArray({ min: 1 })
      .withMessage($.roles_must_be_an_array_with_at_least_one_role)
      .bail()
      .custom(value => {
        const uniqueRoles = new Set(value);
        if (uniqueRoles.size !== value.length) {
          throw new Error($.duplicate_roles_are_not_allowed);
        }
        return true;
      }),
    body('roles.*')
      .isIn(['walletManager', 'companyManager', 'freelancerManager', 'technicalSupport'])
      .withMessage(
        $.role_type_must_be_one_of_walletManager_companyManager_freelancerManager_technicalSupport,
      ),

    body('email')
      .notEmpty()
      .withMessage($.email_is_required)
      .bail()
      .isEmail()
      .withMessage($.email_must_be_a_valid_email_address)
      .bail()
      .custom(async value => {
        const existingAdmin = await Admin.findOne({ email: value });
        if (existingAdmin) {
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
        $.password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_character,
      ),

    body('password_confirm')
      .notEmpty()
      .withMessage($.password_confirm_is_required)
      .bail()

      .custom((_, { req }) => {
        if (req.body.password !== req.body.password_confirm) {
          throw new Error($.password_confirmation_does_not_match);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function updateAdminValidation() {
  return [
    val.anyThingToUpdate(['username', 'password', 'password_confirm', 'roles', 'deleted_at']),
    val.removeNullAndEmpty(['deleted_at']),

    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage($.username_must_be_between_3_and_50_characters)
      .bail()

      .matches(/^[a-zA-Z0-9_\s-]+$/)
      .withMessage($.username_can_only_contain_letters_numbers_underscores_and_hyphens)
      .bail()

      .custom(async value => {
        const existingAdmin = await Admin.findOne({ username: value });
        if (existingAdmin) {
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
        $.password_must_include_at_least_one_lowercase_letter_one_uppercase_letter_one_number_and_one_special_characte,
      ),

    body('password').custom(async (_, { req }) => {
      const { password, password_confirm } = req.body;
      if (!password && password_confirm) {
        throw new Error($.both_password_and_confirm_password_are_required_or_both_should_be_empty);
      } else if (password && password_confirm) {
        const admin = await Admin.findById(req.params.id);
        if (admin) {
          const isPasswordMatch = await bcrypt.compare(password, admin.password);
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

    body('roles')
      .optional()
      .isArray({ min: 1 })
      .withMessage($.roles_must_be_an_array_with_at_least_one_role)
      .bail()
      .custom(value => {
        // Check for duplicate roles
        const uniqueRoles = new Set(value);
        if (uniqueRoles.size !== value.length) {
          throw new Error($.duplicate_roles_are_not_allowed);
        }
        return true;
      }),

    body('roles.*')
      .optional()
      .isIn(['walletManager', 'companyManager', 'freelancerManager', 'technicalSupport'])
      .withMessage($.invalid_role_type),

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

function getCountAdminValidation() {
  return [
    query('roles')
      .optional()
      .customSanitizer(value => value.split(',')),

    query('roles')
      .optional()
      .isArray({ min: 1 })
      .withMessage($.roles_must_be_an_array_with_at_least_one_role)
      .bail()
      .custom(roles => {
        // Check for duplicate elements in the array
        const uniqueRoles = new Set(roles);
        if (uniqueRoles.size !== roles.length) {
          throw new Error($.roles_must_be_unique);
        }
        return true;
      }),

    query('roles.*')
      .optional()
      .isIn(['walletManager', 'companyManager', 'freelancerManager', 'technicalSupport'])
      .withMessage($.invalid_role_type),

    query('size')
      .optional()
      .isInt({ min: 1 })
      .withMessage($.size_must_be_an_integer_greater_than_zero)
      .bail()
      .custom((value, { req }) => {
        const roles = req.query.roles || [];
        if (value < roles.length) {
          throw new Error($.size_cannot_be_less_than_roles_length);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createAdminValidation: createAdminValidation(),
  updateAdminValidation: updateAdminValidation(),
  getCountAdminValidation: getCountAdminValidation(),
  ...ValidationHandler,
};
