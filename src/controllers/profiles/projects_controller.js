const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new project entry
 * @route   POST /api/users/profile/projects
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: [
    'title',
    'description',
    'start_date',
    'end_date',
    'skills_used',
    'images',
    'contributors',
  ],
  targetField: 'projects',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific project entry from the authenticated user's profile
 * @route   DELETE /api/users/profile/projects/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'projects',
});

/**
 * @desc    Remove multiple project entries from the authenticated user's profile
 * @route   DELETE /api/users/profile/projects
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'projects',
});

/**
 * @desc    Update details of a specific project entry in the authenticated user's profile
 * @route   PUT /api/users/profile/projects/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: [
    'title',
    'description',
    'start_date',
    'end_date',
    'skills_used',
    'images',
    'contributors',
  ],
  targetField: 'projects',
  fieldsToOmitFromResponse: ['__v'],
});
