const Comment = require('../../../models/posts_and_related/comments_model.js');
const get = require('../query.js');

/**
 * @desc    Get comments for a specific user
 * @route   GET /api/public/users/:userId/comments
 * @access  Private (authenticated any)
 */
exports.getAllComments = async (req, res, next) => {
  get.getAllDocuments({ Model: Comment })(req, res, next);
};
