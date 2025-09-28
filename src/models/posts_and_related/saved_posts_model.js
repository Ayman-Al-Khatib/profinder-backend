const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Users' },
    post_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Posts' },
  },
  {
    timestamps: { createdAt: 'created_at' },
  },
);

const SavedPost = mongoose.model('SavedPosts', savedPostSchema);

module.exports = SavedPost;
