const factory = require('../../../helper/handlers_factory');
const Hashtag = require('../../../models/posts_and_related/hashtags_model');

/**
 * @desc    Get all hashtags
 * @route   GET /api/public/hashtags
 * @access  Private (authenticated admin)
 */
exports.getAllHashtages = async (req, res, next) => {
  factory.getAll({
    Model: Hashtag,
  })(req, res, next);
};

/**
 * @desc    Block a hashtag
 * @route   PUT /api/public/hashtags/:id/block
 * @access  Private (authenticated admin)
 */
exports.blockHashtage = async (req, res, next) => {
  factory.blockOne({
    Model: Hashtag,
  })(req, res, next);
};

/**
 * @desc    Unblock a hashtag
 * @route   PUT /api/public/hashtags/:id/unblock
 * @access  Private (authenticated admin)
 */
exports.unBlockHashtage = async (req, res, next) => {
  factory.unBlockOne({
    Model: Hashtag,
  })(req, res, next);
};
