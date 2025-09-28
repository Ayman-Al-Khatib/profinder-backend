const factory = require('../../../helper/handlers_factory.js');
const SavePost = require('../../../models/posts_and_related/saved_posts_model.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const User = require('../../../models/users_model.js');
const ApiError = require('../../../utils/api_error.js');
const get = require('../query.js');
const $ = require('../../../locales/keys');

/**
 * @desc    Save a post for a user
 * @route   POST /api/users/saved-posts
 * @access  Private (authenticated user)
 */
exports.createSavePost = (req, res, next) => {
  req.body.user_id = req.user._id;
  return factory.createOne({
    Model: SavePost,
    fields: ['user_id', 'post_id'],
  })(req, res, next);
};

/**
 * @desc    Get all saved posts
 * @route   GET /api/users/saved-posts
 * @access  Private (authenticated user)
 */
exports.getAllsavedPosts = async (req, res, next) => {
  get.getAllDocuments({ Model: SavePost, nameFieldInResponse: 'saved_posts' })(req, res, next);
};

/**
 * @desc    Delete a saved post for a user
 * @route   DELETE /api/users/saved-posts/:id
 * @access  Private (authenticated user)
 */
exports.deleteOne = async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post || post.deleted_at || post.blocked) {
    return next(new ApiError($.check_the_id_and_try_again_later, 403));
  }
  const user = await User.findById(post.publisher_id);
  if (!user || user.deleted_at || user.blocked) {
    return next(new ApiError($.check_the_id_and_try_again_later, 403));
  }

  const savedPost = await SavePost.findOneAndDelete({
    user_id: req.user.id,
    post_id: req.params.id,
  });
  if (savedPost) {
    return res.status(204).send();
  }
  return res.status(404).json({
    status: 'failure',
    messgae: $.you_have_not_interacted_with_this_post,
  });
};
