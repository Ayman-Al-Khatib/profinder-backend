const SocialMediaPlatform = require('../../models/social_media_platforms_model');
const factory = require('../../helper/handlers_factory');

/**
 * @desc    Get a single social media platform by ID
 * @route   GET /api/public/social-media-platforms/:id
 * @access  Private (authenticated any)
 */
exports.getOne = factory.getOne({
  Model: SocialMediaPlatform,
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Get all social media platforms with optional search by name
 * @route   GET /api/public/social-media-platforms
 * @access  Private (authenticated any)
 */
exports.getAll = factory.getAll({
  Model: SocialMediaPlatform,
  fieldsToOmitFromResponse: ['__v'],
  fieldsToSearch: ['name'],
});
