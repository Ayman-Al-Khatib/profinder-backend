const factory = require('../../../helper/handlers_factory');
const PostHashtag = require('../../../models/posts_and_related/posts_hashtags');
const Hashtag = require('../../../models/posts_and_related/hashtags_model');
const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');

/**
 * @desc    Get all posts associated with a specific hashtag
 * @route   GET /api/admins/posts-hashtags/:name
 * @access  Private (authenticated admin)
 */

exports.getAllPostForHashtages = async (req, res, next) => {
  let name;
  let hashtag_id;
  if (req.params.name) {
    name = req.params.name.toLowerCase();
    hashtag_id = await Hashtag.findOne({ name });
    if (!hashtag_id) return next(new ApiError($.hashtag_not_found, 404));
  }

  factory.getAll({
    Model: PostHashtag,
    filterDeveloper: {
      ...(name != null ? { hashtag_id } : {}),
    },
    populateDeveloper: {
      path: 'post_id',
      select: '-__v',
    },
  })(req, res, next);
};
