const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new skill entry
 * @route   POST /api/users/profile/skills
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: ['skill', 'proficiency'],
  targetField: 'skills',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific skill entry from the authenticated user's profile
 * @route   DELETE /api/users/profile/skills/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'skills',
});

/**
 * @desc    Remove multiple skill entries from the authenticated user's profile
 * @route   DELETE /api/users/profile/skills
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'skills',
});

/**
 * @desc    Update details of a specific skill entry in the authenticated user's profile
 * @route   PUT /api/users/profile/skills/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: ['skill', 'proficiency'],
  targetField: 'skills',
  fieldsToOmitFromResponse: ['__v'],
});
