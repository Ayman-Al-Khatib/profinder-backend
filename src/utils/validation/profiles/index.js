const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');
const User = require('../../../models/users_model');
const { ObjectId } = require('mongoose').Types;

function update() {
  return [
    val.anyThingToUpdate(['phone', 'bio', 'date_of_birth', 'gender', 'email', 'full_name']),

    val.removeNullAndEmpty(),

    body('phone')
      .optional()
      .isString()
      .withMessage($.phone_must_be_a_string)
      .bail()
      .trim()
      .custom(value => {
        const phoneRegex = /^(?:\+\d{1,3}\s*)?(?:\(\d{3}\)|\d{3})[- ]?\d{3}[- ]?\d{4}$/;
        if (!phoneRegex.test(value)) {
          throw new Error($.invalid_phone_number_format);
        }
        return true;
      })
      .withMessage($.invalid_phone_number_format)
      .bail()
      .isLength({ max: 20 })
      .withMessage($.phone_cannot_exceed_20_characters),

    body('bio')
      .optional()
      .isString()
      .withMessage($.bio_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 2048, min: 3 })
      .withMessage($.bio_cannot_exceed_2048_characters),

    body('date_of_birth')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.date_of_birth_must_be_a_valid_date)
      .bail()
      .custom(value => {
        const dob = new Date(value);
        const currentDate = new Date();
        if (dob > currentDate) {
          throw new Error($.date_of_birth_cannot_be_in_the_future);
        }
        return true;
      }),

    body('email')
      .optional()
      .isString()
      .withMessage($.email_must_be_a_string)
      .bail()

      .notEmpty()
      .withMessage($.email_cannot_be_empty)
      .bail()

      .isEmail()
      .withMessage($.invalid_email_format),

    body('gender')
      .optional()
      .isIn(['male', 'female'])
      .withMessage($.gender_must_be_either_male_or_female),

    body('full_name')
      .optional()
      .isString()
      .withMessage($.first_name_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 50 })
      .withMessage($.full_name_cannot_exceed_50_characters),

    ValidationHandler.handleValidationResult,
  ];
}

function updateCV() {
  return [
    val.anyThingToUpdate(['pdf_cv']),
    val.removeNullAndEmpty(),
    ValidationHandler.handleValidationResult,
  ];
}
function getProfile() {
  const validateObjectId = id => ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  return [
    body().custom(async (_, { req }) => {
      if (!req.params.id) req.params.id = req.user.id;

      if (!validateObjectId(req.params.id)) {
        throw new Error($.invalid_objectid);
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        req.statusCode = 404;
        throw new Error($.user_not_found);
      }

      if (user.approved === undefined) {
        req.statusCode = 404;

        throw new Error($.profile_not_found);
      }

      if (!user.deleted_at) {
        return true;
      }

      if (req.role === 'admin' || req.role === 'superAdmin') {
        return true;
      }
      req.statusCode = 403;

      throw new Error($.unauthorized_only_admins_can_access_deleted_accounts);
    }),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  update: update(),
  updateCV: updateCV(),
  getProfile: getProfile(),
};
