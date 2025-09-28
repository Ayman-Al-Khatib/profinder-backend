const Profile = require('../../models/profile');
const factory = require('../../helper/handel_list');

/**
 * @desc    Create a new social media link entry
 * @route   POST /api/users/profile/social-media-links
 * @access  Private (authenticated user)
 */
exports.create = factory.createOne({
  Model: Profile,
  fields: ['platform_id', 'link'],
  targetField: 'social_media_links',
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Remove a specific social media link entry from the authenticated user's profile
 * @route   DELETE /api/users/profile/social-media-links/:id
 * @access  Private (authenticated user)
 */
exports.removeOne = factory.removeOne({
  Model: Profile,
  targetField: 'social_media_links',
});

/**
 * @desc    Remove multiple social media link entries from the authenticated user's profile
 * @route   DELETE /api/users/profile/social-media-links
 * @access  Private (authenticated user)
 */
exports.removeMany = factory.removeMany({
  Model: Profile,
  targetField: 'social_media_links',
});

/**
 * @desc    Update details of a specific social media link entry in the authenticated user's profile
 * @route   PUT /api/users/profile/social-media-links/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: Profile,
  fields: ['platform_id', 'link', 'image'],
  targetField: 'social_media_links',
  fieldsToOmitFromResponse: ['__v'],
});
