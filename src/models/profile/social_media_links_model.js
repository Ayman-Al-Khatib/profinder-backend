const mongoose = require('mongoose');

const socialMediaLinkSchema = new mongoose.Schema({
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialMediaPlatforms',
    required: true,
  },

  link: {
    type: String,
    required: true,
  },
});

module.exports = socialMediaLinkSchema;
