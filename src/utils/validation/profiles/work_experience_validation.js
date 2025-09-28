const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const Profile = require('../../../models/profile');
const val = require('../../../helper/custon_validation');
const $ = require('../../../locales/keys');

function create() {
  return [
    val.removeNullAndEmpty(['end_date', 'responsibilities', 'location', 'company']),

    body('position')
      .notEmpty()
      .withMessage($.position_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.position_must_be_a_string)
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage($.position_length_must_be_between_3_and_255_characters),

    body('start_date')
      .isISO8601()
      .toDate()
      .withMessage($.start_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(value => {
        const startDate = new Date(value);
        if (startDate > new Date()) {
          throw new Error($.start_date_date_cannot_be_in_the_future);
        }
        if (startDate.getFullYear() < 1900 || startDate.getFullYear() > 2100) {
          throw new Error($.start_date_must_be_between_1900_and_2100);
        }
        return true;
      }),

    body('end_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.end_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom((value, { req }) => {
        if (value) {
          const endDate = new Date(value);
          const startDate = new Date(req.body.start_date);
          if (endDate <= startDate) {
            throw new Error($.end_date_must_be_after_the_start_date);
          }
          if (endDate.getFullYear() < 1900 || endDate.getFullYear() > 2100) {
            throw new Error($.end_date_must_be_between_1900_and_2100);
          }
        }
        return true;
      }),

    body('company')
      .optional()
      .isString()
      .withMessage($.company_must_be_a_string)
      .bail()
      .notEmpty()
      .withMessage($.company_cannot_be_empty)
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage($.company_length_must_be_between_3_and_255_characters),

    body('location')
      .optional()
      .isString()
      .withMessage($.location_must_be_a_string)
      .bail()
      .notEmpty()
      .withMessage($.location_cannot_be_empty)
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage($.location_length_must_be_between_3_and_255_characters),

    body('responsibilities')
      .optional()
      .isString()
      .withMessage($.responsibilities_must_be_a_string)
      .bail()
      .notEmpty()
      .withMessage($.responsibilities_cannot_be_empty)
      .bail()
      .trim()
      .isLength({ min: 3, max: 1000 })
      .withMessage($.responsibilities_length_must_be_between_3_and_1000_characters),

    ValidationHandler.handleValidationResult,
  ];
}

function update() {
  let isSendEndDate = false;

  return [
    val.anyThingToUpdate([
      'company',
      'position',
      'location',
      'start_date',
      'end_date',
      'location',
      'responsibilities',
    ]),

    (req, res, next) => {
      isSendEndDate = req.body.end_date != null;
      next();
    },

    val.removeNullAndEmpty(['responsibilities', 'location', 'end_date', 'company']),

    body('position')
      .optional()
      .isString()
      .withMessage($.position_must_be_a_string)
      .bail()
      .notEmpty()
      .withMessage($.position_cannot_be_empty)
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage($.position_length_must_be_between_3_and_255_characters),

    body('start_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.start_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(async (value, { req }) => {
        const startDate = new Date(value);

        if (startDate > new Date()) {
          throw new Error($.start_date_date_cannot_be_in_the_future);
        }
        if (startDate.getFullYear() < 1900 || startDate.getFullYear() > 2100) {
          throw new Error($.start_date_must_be_between_1900_and_2100);
        }

        if (isSendEndDate && req.body.end_date == null) {
          return true;
        }

        if (req.body.end_date) {
          if (new Date(req.body.end_date) <= new Date(req.body.start_date)) {
            throw new Error($.start_date_must_precede_the_end_date);
          }
          return true;
        }

        const profile = await Profile.findById(req.user.id);
        const listWorkExperiences = profile.work_experiences || [];
        const item = listWorkExperiences.find(
          workExperience => workExperience.id === req.params.itemId,
        );

        if (!item) {
          const err = new Error($.no_found_work_experience_for_this_id);
          req.statusCode = 404;
          throw err;
        }

        if (!item.end_date) return true;

        const end_date = item.end_date;

        if (new Date(value) >= new Date(end_date)) {
          throw new Error($.start_date_must_precede_the_end_date);
        }

        return true;
      }),

    body('end_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.end_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(async (value, { req }) => {
        const endDate = new Date(value);

        if (endDate.getFullYear() < 1900 || endDate.getFullYear() > 2100) {
          throw new Error($.end_date_must_be_between_1900_and_2100);
        }

        if (value && req.body.start_date) {
          if (new Date(value) <= new Date(req.body.start_date)) {
            throw new Error($.end_date_must_be_after_the_start_date);
          }
          return true;
        }

        const profile = await Profile.findById(req.user.id);
        const listWorkExperiences = profile.work_experiences;
        const item = listWorkExperiences.find(
          workExperience => workExperience.id === req.params.itemId,
        );

        if (!item || (item && !item.start_date)) {
          const err = new Error($.no_found_work_experience_for_this_id);
          req.statusCode = 404;
          throw err;
        }

        const start_date = item.start_date;
        if (new Date(value) <= new Date(start_date)) {
          throw new Error($.start_date_must_precede_the_end_date);
        }
        req.body.end_date = undefined;
        return true;
      }),

    body('company')
      .optional()
      .isString()
      .withMessage($.company_must_be_a_string)
      .bail()
      .notEmpty()
      .withMessage($.company_cannot_be_empty)
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage($.company_length_must_be_between_3_and_255_characters),

    body('location')
      .optional()
      .isString()
      .bail()
      .withMessage($.location_must_be_a_string)
      .notEmpty()
      .bail()
      .withMessage($.location_cannot_be_empty)
      .bail()

      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage($.location_length_must_be_between_3_and_255_characters),

    body('responsibilities')
      .optional()
      .isString()
      .bail()
      .withMessage($.responsibilities_must_be_a_string)
      .notEmpty()
      .bail()
      .withMessage($.responsibilities_cannot_be_empty)
      .trim()
      .isLength({ min: 3, max: 1000 })
      .withMessage($.responsibilities_length_must_be_between_3_and_1000_characters),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  create: create(),
  update: update(),
  ...ValidationHandler,
};
