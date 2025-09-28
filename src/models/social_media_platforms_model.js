const mongoose = require('mongoose');

const socialMediaPlatformSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    unique: true,
  },
  image: {
    type: String,
    required: true,
  },
});

const SocialMediaPlatform = mongoose.model('SocialMediaPlatforms', socialMediaPlatformSchema);

module.exports = SocialMediaPlatform;
