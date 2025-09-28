const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new certification for the authenticated user's profile
 * @route   POST /api/users/profiles/certifications
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: [
    'title',
    'organization',
    'description',
    'issue_date',
    'expiration_date',
    'link',
    'certification_image',
  ],
  targetField: 'certifications',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific certification from the authenticated user's profile
 * @route   DELETE /api/users/profiles/certifications/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'certifications',
});

/**
 * @desc    Remove multiple certifications from the authenticated user's profile
 * @route   DELETE /api/users/profiles/certifications
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'certifications',
});

/**
 * @desc    Update details of a specific certification in the authenticated user's profile
 * @route   PUT /api/users/profiles/certifications/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: [
    'title',
    'organization',
    'description',
    'issue_date',
    'expiration_date',
    'link',
    'certification_image',
  ],
  targetField: 'certifications',
  fieldsToOmitFromResponse: ['__v'],
});
