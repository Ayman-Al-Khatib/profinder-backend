const { body } = require('express-validator');
const ValidationHandler = require('../../helper/validation_handler');
const $ = require('../../locales/keys');
const SocialMediaPlatform = require('../../models/social_media_platforms_model');
const val = require('../../helper/custon_validation');

function createOne() {
  return [
    body('name')
      .notEmpty()
      .withMessage($.name_is_required)
      .bail()
      .isString()
      .withMessage($.name_must_be_a_string)
      .bail()
      .isLength({ min: 3, max: 50 })
      .withMessage($.name_must_be_between_3_and_50_characters)
      .bail()
      .custom(async value => {
        const platform = await SocialMediaPlatform.findOne({ name: value });
        if (platform) {
          throw new Error($.name_already_exists);
        }
        return true;
      }),

    body().custom((value, { req }) => {
      if (!req.file || Object.keys(req.file).length === 0) {
        throw new Error($.image_is_required);
      }
      return true;
    }),

    ValidationHandler.handleValidationResult,
  ];
}

function updateOne() {
  return [
    val.anyThingToUpdate(['name', 'image']),

    body('name')
      .optional()
      .notEmpty()
      .withMessage($.name_is_required)
      .bail()

      .isString()
      .withMessage($.name_must_be_a_string)
      .bail()

      .isLength({ min: 3, max: 50 })
      .withMessage($.name_must_be_between_3_and_50_characters)
      .bail()

      .custom(async value => {
        const platform = await SocialMediaPlatform.findOne({ name: value });
        if (platform) {
          throw new Error($.name_already_exists);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createOne: createOne(),
  updateOne: updateOne(),
  ...ValidationHandler,
};
