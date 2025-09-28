const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
const Profile = require('../../../models/profile');
const val = require('../../../helper/custon_validation');

function create() {
  return [
    val.removeNullAndEmpty(['expiration_date', 'link', 'description', 'certification_image']),

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

    body('organization')
      .notEmpty()
      .withMessage($.organization_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.organization_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.organization_must_be_between_3_and_255_characters),

    body('description')
      .optional()
      .notEmpty()
      .withMessage($.description_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.description_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 1000, min: 24 })
      .withMessage($.description_must_be_between_24_and_1000_characters),

    body('issue_date')
      .isISO8601()
      .toDate()
      .withMessage($.issue_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(value => {
        const issueDate = new Date(value);
        if (issueDate > new Date()) {
          throw new Error($.issue_date_cannot_be_in_the_future);
        }
        if (issueDate.getFullYear() < 1900 || issueDate.getFullYear() > 2100) {
          throw new Error($.issue_date_must_be_between_1900_and_2100);
        }
        return true;
      }),

    body('expiration_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.expiration_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom((value, { req }) => {
        if (value) {
          const expirationDate = new Date(value);
          const issueDate = new Date(req.body.issue_date);
          if (expirationDate <= issueDate) {
            throw new Error($.expiration_date_must_be_after_the_issue_date);
          }
          if (expirationDate.getFullYear() < 1900 || expirationDate.getFullYear() > 2100) {
            throw new Error($.expiration_date_must_be_between_1900_and_2100);
          }
        }
        return true;
      }),

    body('link').optional().isURL().withMessage($.link_must_be_a_valid_url),

    ValidationHandler.handleValidationResult,
  ];
}

function update() {
  let isSendEndDate;
  return [
    val.anyThingToUpdate([
      'title',
      'organization',
      'description',
      'issue_date',
      'expiration_date',
      'link',
      'certification_image',
    ]),
    (req, res, next) => {
      isSendEndDate = req.body.expiration_date != null;
      next();
    },
    val.removeNullAndEmpty(['expiration_date', 'link', 'description', 'certification_image']),

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

    body('organization')
      .optional()
      .notEmpty()
      .withMessage($.organization_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.organization_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 255, min: 3 })
      .withMessage($.organization_must_be_between_3_and_255_characters),

    body('description')
      .optional()
      .notEmpty()
      .withMessage($.description_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.description_must_be_a_string)
      .bail()
      .trim()
      .isLength({ max: 1000, min: 24 })
      .withMessage($.description_must_be_between_24_and_1000_characters),

    body('issue_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.issue_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(async (value, { req }) => {
        const issueDate = new Date(value);
        if (issueDate > new Date()) {
          throw new Error($.issue_date_cannot_be_in_the_future);
        }

        if (issueDate.getFullYear() < 1900 || issueDate.getFullYear() > 2100) {
          throw new Error($.issue_date_must_be_between_1900_and_2100);
        }

        if (isSendEndDate && req.body.expiration_dates == null) {
          return true;
        }

        if (req.body.expiration_date) {
          if (new Date(req.body.expiration_date) <= new Date(req.body.issue_date)) {
            throw new Error($.the_issue_date_must_precede_the_expiration_date);
          }
          return true;
        }

        const profile = await Profile.findById(req.user.id);
        const listCertifications = profile.certifications || [];
        const item = listCertifications.find(
          certification => certification.id === req.params.itemId,
        );

        if (!item) {
          const err = new Error(`${$.no_found_certification_for_this_id} (${req.params.itemId}).`);
          req.statusCode = 404;
          throw err;
        }

        if (!item.expiration_date) return true;

        const expiration_date = item.expiration_date;

        if (issueDate >= new Date(expiration_date)) {
          throw new Error($.the_issue_date_must_precede_the_expiration_date); //TODO
        }

        return true;
      }),

    body('expiration_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage($.expiration_date_must_be_a_valid_date_in_iso_8601_format)
      .bail()
      .custom(async (value, { req }) => {
        const expirationDate = new Date(value);

        if (expirationDate.getFullYear() < 1900 || expirationDate.getFullYear() > 2100) {
          throw new Error($.expiration_date_must_be_between_1900_and_2100);
        }

        if (value && req.body.issue_date) {
          if (new Date(value) <= new Date(req.body.issue_date)) {
            throw new Error($.expiration_date_must_be_after_the_issue_date);
          }
          return true;
        }

        const profile = await Profile.findById(req.user.id);

        const listCertifications = profile.certifications;
        const item = listCertifications.find(
          certification => certification.id === req.params.itemId,
        );

        if (!item || (item && !item.issue_date)) {
          const err = new Error(`${$.no_found_certification_for_this_id}(${req.params.itemId}).`);
          req.statusCode = 404;
          throw err;
        }

        const issueDate = item.issue_date;
        if (new Date(value) <= new Date(issueDate)) {
          throw new Error($.expiration_date_must_be_after_the_issue_date);
        }

        return true;
      }),

    body('link').optional().isURL().withMessage($.link_must_be_a_valid_url),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  create: create(),
  update: update(),
  ...ValidationHandler,
};
