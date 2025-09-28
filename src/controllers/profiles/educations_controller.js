const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new education entry for the authenticated user's profile
 * @route   POST /api/users/profiles/educations
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: ['institution', 'degree', 'field_of_study', 'start_date', 'end_date', 'description'],
  targetField: 'educations',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific education entry from the authenticated user's profile
 * @route   DELETE /api/users/profiles/educations/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'educations',
});

/**
 * @desc    Remove multiple education entries from the authenticated user's profile
 * @route   DELETE /api/users/profiles/educations
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'educations',
});

/**
 * @desc    Update details of a specific education entry in the authenticated user's profile
 * @route   PUT /api/users/profiles/educations/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: ['institution', 'degree', 'field_of_study', 'start_date', 'end_date', 'description'],
  targetField: 'educations',
  fieldsToOmitFromResponse: ['__v'],
});
