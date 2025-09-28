const SocialMediaPlatform = require('../../models/social_media_platforms_model');
const Profile = require('../../models/profile');
const factory = require('../../helper/handlers_factory');
const { getSingularFromList } = require('../../helper/fix_key_model_name');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

/**
 * @desc    Create a new social media platform
 * @route   POST /api/admins/social-media-platforms
 * @access  Private (authenticated user)
 */
exports.createOne = factory.createOne({
  Model: SocialMediaPlatform,
  fields: ['name', 'image'],
  fieldsToOmitFromResponse: ['__v'],
});

/**
 * @desc    Delete a social media platform by ID
 * @route   DELETE /api/admins/social-media-platforms/:id
 * @access  Private (authenticated user)
 */
exports.deleteOne = async (req, res, next) => {
  const { id } = req.params;
  const platform = await SocialMediaPlatform.findOneAndDelete({ _id: id });
  if (!platform) {
    return next(
      new ApiError(
        [
          $.no_found,
          getSingularFromList(SocialMediaPlatform.modelName),
          $.for_this_id,
          req.params.id,
        ],
        404,
        { merge: true },
      ),
    );
  }
  await Profile.updateMany(
    { 'social_media_links._id': id },
    { $pull: { social_media_links: { _id: id } } },
  );
  res.status(204).send();
};

/**
 * @desc    Update a social media platform by ID
 * @route   PUT /api/admins/social-media-platforms/:id
 * @access  Private (authenticated user)
 */
exports.updateOne = factory.updateOne({
  Model: SocialMediaPlatform,
  fields: ['name', 'image'],
  fieldsToOmitFromResponse: ['__v'],
});
