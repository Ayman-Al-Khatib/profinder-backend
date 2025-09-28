const factory = require('../../../helper/handlers_factory.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const Comment = require('../../../models/posts_and_related/comments_model.js');
const Report = require('../../../models/posts_and_related/reports_model.js');

/**
 * @desc    Get all posts with optional user population, filtering, and search
 * @route   GET /api/admins/posts
 * @access  Private (authenticated admin)
 */
exports.getAllPosts = (req, res, next) => {
  return factory.getAll({
    Model: Post,
    ...(req.query.user == 'true' ? { populateDeveloper: 'publisher_id' } : {}),
    fieldsToOmitFromResponse: ['__v'],
    fieldsToSearch: ['text', 'topics'],
  })(req, res, next);
};

/**
 * @desc    Block a post
 * @route   PUT /api/admins/posts/:id/block
 * @access  Private (authenticated admin)
 */

exports.blockPost = (req, res, next) => {
  return factory.blockOne({ Model: Post })(req, res, next);
};

/**
 * @desc    Get post by Id with comments and reports
 * @route   GET /api/admins/posts/:id/comments-reports
 * @access  Private (authenticated admin)
 */

exports.getPostWithCommentsAndReports = (req, res, next) => {
  factory.getOne({
    Model: Post,
    populationOpt: [
      {
        path: 'publisher_id',
        select: '-__v',
      },
      {
        path: 'company_id',
        select: '-__v',
      },
    ],
    fieldsToOmitFromResponse: '__v',
    callback: async response => {
      const comments = await Comment.find({ post_id: req.params.id })
        .populate({
          path: 'user_id',
          select: '-__v',
        })
        .select('-__v')
        .lean();
      const reports = await Report.find({ type: 'Posts', reported_item_id: req.params.id })
        .populate({
          path: 'reporter_id',
          select: '-__v',
        })
        .select('-__v')
        .lean();
      return { ...response, comments, reports };
    },
  })(req, res, next);
};
