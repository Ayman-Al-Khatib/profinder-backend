const factory = require('../../../helper/handlers_factory.js');
const Like = require('../../../models/posts_and_related/likes_model.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const User = require('../../../models/users_model.js');
const Company = require('../../../models/companies_model.js');
const ApiError = require('../../../utils/api_error.js');
const get = require('../query.js');
const $ = require('../../../locales/keys');

/**
 * @desc    Create a new like for a post
 * @route   POST /api/users/likes
 * @access  Private (authenticated user)
 */
exports.createLike = async (req, res, next) => {
  req.body.user_id = req.user._id;
  return factory.createOne({
    Model: Like,
    fields: ['post_id', 'user_id'],
    callback: async response => {
      const post = await Post.findById(req.body.post_id);
      post.likes_count++;
      post.save();
      return response;
    },
  })(req, res, next);
};

/**
 * @desc    Get all likes with optional filtering and population
 * @route   GET /api/users/likes
 * @access  Private (authenticated user)
 */
exports.getAllLikes = async (req, res, next) => {
  get.getAllDocuments({ Model: Like })(req, res, next);
};

/**
 * @desc    Delete a like for a specific post
 * @route   DELETE /api/users/likes/:id
 * @access  Private (authenticated user)
 */
exports.deleteOne = async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.deleted_at || post.blocked) {
    return next(new ApiError($.reaction_to_this_post_cannot_be_deleted_because_it_is_pending, 403));
  }

  if (post.company_id) {
    const company = await Company.findById(post.company_id);
    if (!company || company.deleted_at || company.blocked) {
      return next(new ApiError($.you_have_not_interacted_with_this_post, 403));
    }
    const founder = await User.findById(company.founder._id);
    if (!founder || founder.deleted_at || founder.blocked) {
      return next(new ApiError($.you_have_not_interacted_with_this_post, 403));
    }
  } else {
    const user = await User.findById(post.publisher_id);
    if (!user || user.deleted_at || user.blocked) {
      return next(
        new ApiError($.reaction_to_this_post_cannot_be_deleted_because_it_is_pending, 403),
      );
    }
  }

  const like = await Like.findOneAndDelete({ user_id: req.user.id, post_id: req.params.id });
  if (like) {
    post.likes_count--;
    await post.save();
    return res.status(204).send();
  }

  return res.status(404).json({
    status: 'failure',
    messgae: $.you_have_not_interacted_with_this_post,
  });
};
