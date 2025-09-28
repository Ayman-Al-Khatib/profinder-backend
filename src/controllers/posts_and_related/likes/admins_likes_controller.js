const factory = require('../../../helper/handlers_factory.js');
const Like = require('../../../models/posts_and_related/likes_model.js');

/**
 * @desc    Get all likes with optional population of related fields
 * @route   GET /api/admins/likes
 * @access  Private (authenticated admin)
 */
exports.getAllLikes = async (req, res, next) => {
  // Parse and validate the populate query parameter
  let populateFields = (req.query.populate || '')
    .split(',')
    .filter(field => ['user_id', 'post_id'].includes(field))
    .map(field => ({ path: field, select: '-__v' })); // Default selection to remove `__v` field

  // Use the factory function to get all likes with the specified population options
  return factory.getAll({
    Model: Like,
    populateDeveloper: populateFields,
  })(req, res, next);
};
