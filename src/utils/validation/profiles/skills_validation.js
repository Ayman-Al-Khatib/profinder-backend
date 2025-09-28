const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
const val = require('../../../helper/custon_validation');
const Profile = require('../../../models/profile');

function create() {
  return [
    body('skill')
      .isString()
      .withMessage($.skill_must_be_a_string)
      .bail()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage($.skill_must_be_between_3_and_100_characters)

      .bail()
      .custom(async (value, { req }) => {
        const profile = await Profile.findById(req.user.id);
        if (!profile || !profile.skills) return true;
        const skills = profile.skills.map(skill => skill.skill.toLowerCase());
        if (skills.includes(value.toLowerCase())) {
          throw new Error('Skill already exists in the profile');
        }
        return true;
      }),

    body('proficiency')
      .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
      .withMessage($.proficiency_level_must_be_one_of_beginner_intermediate_advanced_expert),
    ValidationHandler.handleValidationResult,
  ];
}

function update() {
  return [
    val.anyThingToUpdate(['skill', 'proficiency']),

    body('skill')
      .optional()
      .isString()
      .withMessage($.skill_must_be_a_string)
      .bail()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage($.skill_must_be_between_3_and_100_characters)
      .bail()

      .custom(async (value, { req }) => {
        const profile = await Profile.findById(req.user.id);
        if (!profile || !profile.skills) return true;
        const skills = profile.skills.map(skill => skill.skill.toLowerCase());
        if (skills.includes(value.toLowerCase())) {
          throw new Error('Skill already exists in the profile');
        }
        return true;
      }),

    body('proficiency')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
      .withMessage($.proficiency_level_must_be_one_of_beginner_intermediate_advanced_expert),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  create: create(),
  update: update(),
  ...ValidationHandler,
};
