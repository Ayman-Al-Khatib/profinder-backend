const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');
const Profile = require('../../../models/profile');

function create() {
  return [
    val.removeNullAndEmpty(['end_date', 'description']),

    body('institution')
      .notEmpty()
      .withMessage($.institution_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.institution_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.institution_must_be_between_3_and_255_characters),

    body('degree')
      .notEmpty()
      .withMessage($.degree_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.degree_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.degree_must_be_between_3_and_255_characters),

    body('field_of_study')
      .notEmpty()
      .withMessage($.field_of_study_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.field_of_study_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.field_of_study_must_be_between_3_and_255_characters),

    body('description')
      .optional()
      .notEmpty()
      .withMessage($.description_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.description_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 1000, min: 3 })
      .withMessage($.description_must_be_between_3_and_1000_characters),

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
          const startDate = new Date(req.body.issue_date);
          if (endDate <= startDate) {
            throw new Error($.end_date_must_be_after_the_start_date);
          }
          if (endDate.getFullYear() < 1900 || endDate.getFullYear() > 2100) {
            throw new Error($.end_date_must_be_between_1900_and_2100);
          }
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function update() {
  let isSendEndDate = false;

  return [
    val.anyThingToUpdate([
      'institution',
      'degree',
      'field_of_study',
      'description',
      'start_date',
      'end_date',
    ]),

    (req, res, next) => {
      isSendEndDate = req.body.end_date != null;
      next();
    },
    val.removeNullAndEmpty(['description', 'end_date']),

    body('institution')
      .optional()
      .notEmpty()
      .withMessage($.institution_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.institution_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.institution_must_be_between_3_and_255_characters),

    body('degree')
      .optional()
      .notEmpty()
      .withMessage($.degree_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.degree_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.degree_must_be_between_3_and_255_characters),

    body('field_of_study')
      .optional()
      .notEmpty()
      .withMessage($.field_of_study_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.field_of_study_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.field_of_study_must_be_between_3_and_255_characters),

    body('description')
      .optional()
      .notEmpty()
      .withMessage($.description_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.description_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 1000, min: 3 })
      .withMessage($.description_must_be_between_3_and_1000_characters),

    body('start_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.start_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(async (value, { req }) => {
        const startDate = new Date(value);

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
        const listEducations = profile.educations;
        const item = listEducations.find(education => education.id === req.params.itemId);

        if (!item) {
          const err = new Error(`${$.no_found_certification_for_this_id}(${req.params.itemId}).`);
          req.statusCode = 404;
          throw err;
        }

        if (!item.end_date) return true;

        const end_date = item.end_date;

        if (new Date(value) >= new Date(end_date)) {
          throw new Error($.the_start_date_must_precede_the_end_date);
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
        const listEducations = profile.educations;
        const item = listEducations.find(education => education.id === req.params.itemId);

        if (!item || (item && !item.start_date)) {
          const err = new Error(`${$.no_found_certification_for_this_id}(${req.params.itemId}).`);
          req.statusCode = 404;
          throw err;
        }

        const start_date = item.start_date;
        if (new Date(value) <= new Date(start_date)) {
          throw new Error($.end_date_must_be_after_the_start_date);
        }

        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  create: create(),
  update: update(),
  ...ValidationHandler,
};
