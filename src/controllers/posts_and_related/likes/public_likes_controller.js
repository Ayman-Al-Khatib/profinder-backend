const factory = require('../../../helper/handlers_factory.js');
const Like = require('../../../models/posts_and_related/likes_model.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const Company = require('../../../models/companies_model.js');
const User = require('../../../models/users_model.js');
const ApiError = require('../../../utils/api_error.js');
const get = require('../query.js');
const $ = require('../../../locales/keys');

/**
 * @desc    Get all likes for a specific post with optional population of related fields
 * @route   GET /api/public/posts/:id/likes
 * @access  Private (authenticated any)
 */
exports.getAllLikesForPost = async (req, res, next) => {
  // Fetch the post and validate its status
  const post = await Post.findById(req.params.id);
  if (!post || post.deleted_at || post.blocked) {
    return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
  }

  if (post.company_id) {
    const company = await Company.findById(post.company_id);
    if (!company || company.deleted_at || company.blocked) {
      return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
    }
    if (company.founder._id != req.user._id) {
      const founder = await User.findById(post.publisher_id);
      if (!founder || founder.deleted_at || founder.blocked) {
        return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
      }
    }
  } else {
    const user = await User.findById(post.publisher_id);
    if (!user || user.deleted_at || user.blocked) {
      return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
    }
  }

  // Determine the fields to remove based on admin status
  const removeFieldsUser = req.admin
    ? '-__v'
    : 'username email background_image profile_image interests';
  const removeFieldsPost = req.admin ? '-__v' : 'text images likes_count comments_count';

  // Parse and validate the populate query parameter

  const populateFields = [];

  if (req.query.user === 'true') {
    populateFields.push({
      path: 'user_id',
      select: removeFieldsUser,
      populate: { path: 'profile_id', select: 'full_name' },
    });
  }
  if (req.query.post === 'true') {
    populateFields.push({ path: 'post_id', select: removeFieldsPost });
  }

  // Log the populateFields for debugging purposes
  // console.log('🚀 ~ exports.getAllLikesForPost= ~ populateFields:', populateFields);

  // Use the factory function to get all likes with the specified filtering and population options

  factory.getAll({
    Model: Like,
    filterDeveloper: { post_id: req.params.id },
    populateDeveloper: populateFields,
  })(req, res, next);
};

/**
 * @desc    Get all likes for a specific user
 * @route   GET /api/public/users/:userId/likes
 * @access  Private (authenticated any)
 */
exports.getAllLikesForUser = async (req, res, next) => {
  get.getAllDocuments({ Model: Like })(req, res, next);
};
