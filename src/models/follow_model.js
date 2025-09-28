const mongoose = require('mongoose');
const extendSchema = require('../utils/extentions_mongoose');

const followSchema = new mongoose.Schema({
  following_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    validate: {
      validator: function (value) {
        return this.follower_id !== value;
      },
      message: 'follower_id and following_id must be different',
    },
  },
  follower_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

followSchema.index({ following_id: 1 });
followSchema.index({ follower_id: 1 });
followSchema.index({ following_id: 1, follower_id: 1 }, { unique: true });

extendSchema(followSchema);

const Follow = mongoose.model('Follow', followSchema);

module.exports = Follow;
