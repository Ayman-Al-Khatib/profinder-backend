const factory = require('../../../helper/handlers_factory.js');
const Comment = require('../../../models/posts_and_related/comments_model.js');

/**
 * @desc    Get all comments with optional sorting and search
 * @route   GET /api/admin/comments
 * @access  Private (authenticated admin)
 */
exports.getAllComments = (req, res, next) => {
  // Set default sorting if not provided in query parameters
  if (!req.query.sort) req.query.sort = '-created_at';

  return factory.getAll({
    Model: Comment,
    fieldsToOmitFromResponse: ['__v'],
    fieldsToSearch: ['text'],
  })(req, res, next);
};

/**
 * @desc    Block a comment by its ID
 * @route   PUT /api/admin/comments/:id/block
 * @access  Private (admin only)
 */
exports.blockComment = (req, res, next) => {
  return factory.blockOne({ Model: Comment })(req, res, next);
};
