const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minLength: 1,
    maxLength: 64,
    set: value => value.toLowerCase(),
  },

  blocked: {
    type: {
      _id: false,
      blocked_at: Date,
      username: String,
      support_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Admins',
      },
    },
  },
});

const Hashtag = mongoose.model('Hashtags', hashtagSchema);
hashtagSchema.index({ name: 1 });

module.exports = Hashtag;
