const factory = require('../../../helper/handlers_factory.js');
const Comment = require('../../../models/posts_and_related/comments_model.js');
const Report = require('../../../models/posts_and_related/reports_model.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const User = require('../../../models/users_model.js');
const ApiError = require('../../../utils/api_error.js');
const get = require('../query.js');
const $ = require('../../../locales/keys');
const tr = require('../../../helper/translate');

/**
 * @desc    Create a new comment on a post
 * @route   POST /api/users/comments
 * @access  Private (authenticated user)
 */
exports.createComment = (req, res, next) => {
  req.body.user_id = req.user._id;

  return factory.createOne({
    Model: Comment,
    fields: ['text', 'post_id', 'user_id'],
    fieldsToOmitFromResponse: ['total_reports', 'unhandled_reports', '__v'],
    callback: async response => {
      const post = await Post.findById(req.body.post_id);
      post.comments_count++;
      post.save();
      return response;
    },
  })(req, res, next);
};

/**
 * @desc    Get all comments with optional sorting and search
 * @route   GET /api/users/comments
 * @access  Private (authenticated user)
 */
exports.getAllComments = async (req, res, next) => {
  get.getAllDocuments({ Model: Comment })(req, res, next);
};

/**
 * @desc    Update a comment by ID
 * @route   PUT /api/users/comments/:id
 * @access  Private (authenticated user)
 */
exports.updateComment = (req, res, next) => {
  return factory.updateOne({
    Model: Comment,
    fields: ['text'],
  })(req, res, next);
};

/**
 * @desc    Delete a comment by ID
 * @route   DELETE /api/users/comments/:id
 * @access  Private (authenticated user)
 */
exports.deleteOne = (req, res, next) => {
  return factory.deleteOne({
    Model: Comment,
    filterDeveloper: { user_id: req.user.id },
    callback: async doc => {
      const post = await Post.findById(doc.post_id);
      post.comments_count--;
      post.save();
      return doc;
    },
  })(req, res, next);
};

/**
 * @desc    Report a comment for moderation
 * @route   POST /api/users/comments/:id/report
 * @access  Private (authenticated user)
 */
exports.reportComments = async (req, res, next) => {
  // Find the post by ID
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return next(new ApiError($.comment_not_found, 404));
  }

  // Check if the post is deleted or blocked
  if (comment.deleted_at || comment.blocked) {
    return next(new ApiError($.comment_is_not_available, 403));
  }

  const post = await Post.findById(comment.post_id);
  if (!post || post.deleted_at || post.blocked) {
    next(new ApiError($.comment_is_not_available, 403));
  }
  const user = await User.findById(post.publisher_id);
  if (!user || user.deleted_at || user.blocked) {
    next(new ApiError($.comment_is_not_available, 403));
  }

  // Check if the report already exists
  let report = await Report.findOne({
    reporter_id: req.user.id,
    reported_item_id: comment._id,
    type: 'Comments',
  });
  if (report) {
    return next(new ApiError($.you_have_already_reported_this_comment, 409));
  }

  // Create the new report
  report = new Report({
    reporter_id: req.user.id,
    reported_item_id: comment._id,
    reason: req.body.reason,
    type: 'Comments',
  });

  // Save the report
  await report.save();

  // Increase the total reports and unhandled reports count in the post
  comment.total_reports++;
  comment.unhandled_reports++;
  await comment.save();

  return res.status(200).json({
    status: 'success',
    msg: tr($.the_report_has_been_successfully_sent),
  });
};
