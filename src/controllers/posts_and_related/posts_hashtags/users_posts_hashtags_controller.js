const PostHashtag = require('../../../models/posts_and_related/posts_hashtags');
const Hashtag = require('../../../models/posts_and_related/hashtags_model');
const get = require('../query');
const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');
/**
 * @desc    Get all posts associated with a specific hashtag
 * @route   GET /api/users/posts-hashtags/:name
 * @access  Private (authenticated any)
 */

exports.getAllPostForHashtages = async (req, res, next) => {
  const name = req.params.name.toLowerCase();
  const hashtag = await Hashtag.findOne({ name, blocked: { $exists: false } });

  if (!hashtag) return next(new ApiError($.hashtag_not_found, 404));
  const hashtag_id = hashtag._id;

  req.match = {
    hashtag_id: hashtag_id,
  };

  return get.getAllDocuments({ Model: PostHashtag })(req, res, next);
};
