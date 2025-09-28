const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new language entry
 * @route   POST /api/users/profile/languages
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: ['language', 'proficiency'],
  targetField: 'languages',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific language entry from the authenticated user's profile
 * @route   DELETE /api/users/profile/languages/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'languages',
});

/**
 * @desc    Remove multiple language entries from the authenticated user's profile
 * @route   DELETE /api/users/profile/languages
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'languages',
});

/**
 * @desc    Update details of a specific language entry in the authenticated user's profile
 * @route   PUT /api/users/profile/languages/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: ['language', 'proficiency'],
  targetField: 'languages',
  fieldsToOmitFromResponse: ['__v'],
});
