const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new work experience entry
 * @route   POST /api/users/profile/work-experiences
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: ['position', 'start_date', 'end_date', 'company', 'location', 'responsibilities'],
  targetField: 'work_experiences',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific work experience entry from the authenticated user's profile
 * @route   DELETE /api/users/profile/work-experiences/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'work_experiences',
});

/**
 * @desc    Remove multiple work experience entries from the authenticated user's profile
 * @route   DELETE /api/users/profile/work-experiences
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'work_experiences',
});

/**
 * @desc    Update details of a specific work experience entry in the authenticated user's profile
 * @route   PUT /api/users/profile/work-experiences/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: ['position', 'start_date', 'end_date', 'company', 'location', 'responsibilities'],
  targetField: 'work_experiences',
  fieldsToOmitFromResponse: ['__v'],
});
