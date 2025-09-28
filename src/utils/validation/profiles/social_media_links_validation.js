const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');
const SocialMediaPlatform = require('../../../models/social_media_platforms_model');
const { ObjectId } = require('mongoose').Types;
const Profile = require('../../../models/profile');
const val = require('../../../helper/custon_validation');
function socialMediaLinkValidation() {
  return [
    val.anyThingToUpdate(['link', 'platform_id']),
    body('link')
      .notEmpty()
      .withMessage($.link_cannot_be_empty)
      .bail()
      .isString()
      .withMessage($.link_must_be_a_string)
      .bail()
      // .isURL()
      // .withMessage($.link_must_be_a_valid_URL)
      // .bail()
      .custom(async (value, { req }) => {
        const validateObjectId = id => ObjectId.isValid(id) && new ObjectId(id).toString() === id;
        if (!validateObjectId(req.body.platform_id)) {
          throw new Error($.invalid_platform_id);
        }
        const platform = await SocialMediaPlatform.findById(req.body.platform_id);
        if (!platform) {
          throw new Error($.no_matching_platform_found_for_this_id);
        }

        // const linkDomain = new URL(value).hostname.replace('www.', '').split('.')[0].toLowerCase();
        // if ( platform.name.toLowerCase() === linkDomain )
        return true;

        // throw new Error($.link_platform_does_not_match_specified_platform);
      })
      .bail()
      .custom(async (value, { req }) => {
        const profile = await Profile.findById(req.user.id);
        if (!profile || !profile.social_media_links) return true;

        const socialMediaLinks = profile.social_media_links.map(link => link.link.toLowerCase());
        if (socialMediaLinks.includes(value.toLowerCase())) {
          throw new Error('Link already exists in the profile');
        }

        return true;
      }),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  socialMediaLinkValidation: socialMediaLinkValidation(),
  ...ValidationHandler,
};
