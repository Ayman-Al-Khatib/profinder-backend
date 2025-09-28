const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const Profile = require('../../../models/profile');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');

function create() {
  return [
    val.removeNullAndEmpty(['contributors', 'end_date', 'description', 'images']),

    body('title')
      .notEmpty()
      .withMessage($.title_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.title_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.title_must_be_between_3_and_255_characters),

    body('description')
      .optional()
      .notEmpty()
      .withMessage($.description_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.description_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
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

    body('skills_used')
      .notEmpty()
      .withMessage($.skills_used_cannot_be_empty)
      .bail()

      .isArray({ min: 1 })
      .withMessage($.at_least_one_skill_must_be_used_in_the_project)
      .bail()
      .custom(skills_used => {
        for (let i = 0; i < skills_used.length; i++) skills_used[i] = skills_used[i].trim();
        return skills_used.every(skill => skill && typeof skill === 'string');
      })
      .withMessage($.skill_must_be_a_string)
      .bail()
      .custom(skills_used => {
        return skills_used.every(
          contributor => contributor.length >= 3 && contributor.length <= 100,
        );
      })
      .withMessage($.skill_must_be_between_3_and_100_characters),

    body('contributors')
      .optional()
      .isArray()
      .withMessage($.contributors_must_be_an_array)
      .bail()
      .notEmpty()
      .withMessage($.contributors_cannot_be_empty)
      .bail()
      .custom(contributors => {
        for (let i = 0; i < contributors.length; i++) contributors[i] = contributors[i].trim();
        return contributors.every(contributor => contributor && typeof contributor === 'string');
      })
      .withMessage($.contributor_name_must_be_a_non_empty_string)
      .bail()
      .custom(contributors => {
        return contributors.every(contributor => contributor.length >= 3);
      })
      .withMessage($.contributor_name_must_have_more_than_three_letters)
      .bail()

      .custom(contributors => {
        return contributors.every(contributor => contributor.length <= 255);
      })
      .withMessage($.contributor_name_length_must_not_exceed_255_characters),

    ValidationHandler.handleValidationResult,
  ];
}

function update() {
  let isSendEndDate = false;
  return [
    val.anyThingToUpdate([
      'title',
      'description',
      'start_date',
      'end_date',
      'skills_used',
      'contributors',
      'images',
    ]),

    (req, res, next) => {
      isSendEndDate = req.body.end_date != null;
      next();
    },

    val.removeNullAndEmpty(['contributors', 'end_date', 'description', 'images']),

    body('title')
      .optional()
      .notEmpty()
      .withMessage($.title_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.title_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.title_must_be_between_3_and_255_characters),

    body('description')
      .optional()
      .notEmpty()
      .withMessage($.description_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.description_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.description_must_be_between_3_and_1000_characters),

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
        const listProjects = profile.projects;
        const item = listProjects.find(project => project.id === req.params.itemId);

        if (!item) {
          const err = new Error(`${$.no_project_found_for_this_id}`);
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
        const listProjects = profile.projects;
        const item = listProjects.find(project => project.id === req.params.itemId);

        if (!item || (item && !item.start_date)) {
          const err = new Error(`${$.no_project_found_for_this_id} (${req.params.itemId}).`);
          req.statusCode = 404;
          throw err;
        }

        const start_date = item.start_date;
        if (new Date(value) <= new Date(start_date)) {
          throw new Error($.end_date_must_be_after_the_start_date);
        }

        return true;
      }),

    body('skills_used')
      .optional()
      .notEmpty()
      .withMessage($.skills_used_cannot_be_empty)
      .bail()

      .isArray({ min: 1 })
      .withMessage($.at_least_one_skill_must_be_used_in_the_project)
      .bail()

      .bail()
      .custom(skills_used => {
        for (let i = 0; i < skills_used.length; i++) skills_used[i] = skills_used[i].trim();
        return skills_used.every(skill => skill && typeof skill === 'string');
      })
      .withMessage($.skill_must_be_a_string)
      .bail()
      .custom(skills_used => {
        return skills_used.every(
          contributor => contributor.length >= 3 && contributor.length <= 100,
        );
      })
      .withMessage($.skill_must_be_between_3_and_100_characters),

    body('contributors')
      .optional()
      .isArray()
      .withMessage($.contributors_must_be_an_array)
      .bail()
      .notEmpty()
      .withMessage($.contributors_cannot_be_empty)
      .bail()
      .custom(contributors => {
        for (let i = 0; i < contributors.length; i++) contributors[i] = contributors[i].trim();
        return contributors.every(contributor => contributor && typeof contributor === 'string');
      })
      .withMessage($.contributor_name_must_be_a_non_empty_string)
      .bail()
      .custom(contributors => {
        return contributors.every(contributor => contributor.length >= 3);
      })
      .withMessage($.contributor_name_must_have_more_than_three_letters)
      .bail()

      .custom(contributors => {
        return contributors.every(contributor => contributor.length <= 255);
      })
      .withMessage($.contributor_name_length_must_not_exceed_255_characters),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  create: create(),
  update: update(),
  ...ValidationHandler,
};
