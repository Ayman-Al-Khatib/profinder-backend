const mongoose = require('mongoose');
const extendSchema = require('../../utils/extentions_mongoose');

const likeSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Users' },
    post_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Posts' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

likeSchema.index({ user_id: 1 });
likeSchema.index({ post_id: 1 });
likeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });
extendSchema(likeSchema);

const Like = mongoose.model('Likes', likeSchema);

module.exports = Like;
