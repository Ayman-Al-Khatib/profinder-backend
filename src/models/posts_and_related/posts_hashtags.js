const mongoose = require('mongoose');

const postHashtagSchema = new mongoose.Schema({
  post_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Posts' },
  hashtag_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hashtags' },
});
postHashtagSchema.index({ post_id: 1, hashtag_id: 1 }, { unique: true });

const PostHashtag = mongoose.model('PostsHashtags', postHashtagSchema);

module.exports = PostHashtag;
