const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const val = require('../../../helper/custon_validation');
const $ = require('../../../locales/keys');
const Profile = require('../../../models/profile');

function create() {
  return [
    body('language')
      .notEmpty()
      .withMessage($.language_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.language_must_be_a_string)
      .bail()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage($.language_must_be_between_2_and_100_characters)
      .bail()
      .custom(val.isValidLanguage)
      .withMessage($.invalid_language)
      .bail()
      .custom(async (value, { req }) => {
        const profile = await Profile.findById(req.user.id);
        if (!profile || !profile.languages) return true;
        const languages = profile.languages.map(lang => lang.language.toLowerCase());
        if (languages.includes(value.toLowerCase())) {
          throw new Error('Language already exists in the profile');
        }
        return true;
      }),

    body('proficiency')
      .notEmpty()
      .withMessage($.proficiency_cannot_be_empty)
      .bail()
      .isIn([
        'elementary_proficiency',
        'limited_working_proficiency',
        'professional_working_proficiency',
        'full_professional_proficiency',
        'native_or_bilingual_proficiency',
      ])
      .withMessage(
        $.proficiency_must_be_one_of_elementary_limited_professional_full_professional_native,
      ),

    ValidationHandler.handleValidationResult,
  ];
}

function update() {
  return [
    val.anyThingToUpdate(['proficiency', 'language']),

    body('language')
      .optional()
      .notEmpty()
      .withMessage($.language_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.language_must_be_a_string)
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage($.language_must_be_between_2_and_100_characters)
      .bail()

      .custom(val.isValidLanguage)
      .withMessage($.invalid_language)
      .bail()

      .custom(async (value, { req }) => {
        const profile = await Profile.findById(req.user.id);
        if (!profile || !profile.languages) return true;

        const languages = profile.languages.map(lang => lang.language.toLowerCase());

        if (languages.includes(value.toLowerCase())) {
          throw new Error('Language already exists in the profile');
        }
        return true;
      }),

    body('proficiency')
      .optional()
      .notEmpty()
      .withMessage($.proficiency_cannot_be_empty)
      .bail()
      .isIn([
        'elementary_proficiency',
        'limited_working_proficiency',
        'professional_working_proficiency',
        'full_professional_proficiency',
        'native_or_bilingual_proficiency',
      ])
      .withMessage(
        $.proficiency_must_be_one_of_elementary_limited_professional_full_professional_native,
      ),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  create: create(),
  update: update(),
  ...ValidationHandler,
};
