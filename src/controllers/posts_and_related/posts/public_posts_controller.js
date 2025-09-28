const factory = require('../../../helper/handlers_factory.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const Comment = require('../../../models/posts_and_related/comments_model.js');
const Like = require('../../../models/posts_and_related/likes_model.js');
const SavedPost = require('../../../models/posts_and_related/saved_posts_model.js');
const User = require('../../../models/users_model.js');
const Company = require('../../../models/companies_model.js');
const ApiError = require('../../../utils/api_error.js');
const extractQueryParameters = require('../../../helper/extract_query_parameters');
const buildFilterWithMerge = require('../../../helper/build_filter_with_merge');
const convertValues = require('../../../helper/convert_values.js');
const mongoose = require('mongoose');
const $ = require('../../../locales/keys');
const tr = require('../../../helper/translate');
const parseSortString = require('../../../helper/parse_sort_string.js');

/**
 * @desc    Retrieve a single post along with its comments, likes, and details
 * @route   GET /api/public/posts/:id
 * @access  Private (authenticated user)
 */
exports.getPostWithComments = (req, res, next) => {
  const fieldToRemove = req.admin == null ? ['total_reports', 'unhandled_reports', '__v'] : ['__v'];
  const fieldToRemoveFromComments =
    req.admin == null ? ['-total_reports', '-unhandled_reports', '-__v'] : ['-__v'];

  return factory.getOne({
    Model: Post,
    fieldsToOmitFromResponse: fieldToRemove,
    populationOpt: [
      {
        path: 'publisher_id',
        select: '_id username email profile_id profile_image background_image',
        populate: { path: 'profile_id', select: '_id full_name' },
      },
      {
        path: 'company_id',
        select: '_id name industry website image cover_image',
      },
    ],
    callback: async responseData => {
      if (
        responseData.post.deleted_at ||
        responseData.post.blocked ||
        !(await User.findById(responseData.post.publisher_id))
      ) {
        return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
      }

      if (!responseData.post.company_id) {
        const publisher = await User.findById(responseData.post.publisher_id);
        if (!publisher || publisher.deleted_at || publisher.blocked) {
          return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
        }
      } else {
        const company = await Company.findById(responseData.post.company_id);
        if (!company || company.deleted_at || company.blocked) {
          return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
        }
        const founder = await User.findById(company.founder._id);
        if (!founder || founder.deleted_at || founder.blocked) {
          return next(new ApiError($.you_do_not_have_access_to_this_post, 403));
        }
      }
      let page = Math.max(1, parseInt(req.query.page) || 1);
      let limit = Math.max(1, parseInt(req.query.limit) || 10);

      const skip = (page - 1) * limit;
      const endIndex = page * limit;

      // Count the total number of comments for the given post_id
      const countDocuments = await Comment.countDocuments({
        post_id: req.params.id,
        deleted_at: { $exists: false },
        blocked: { $exists: false },
      });

      // Pagination result object
      const pagination = {};
      pagination.current_page = page;
      pagination.limit = limit;
      pagination.number_of_pages = Math.ceil(countDocuments / limit);

      // Calculate next and previous pages
      if (endIndex < countDocuments) {
        pagination.next = page + 1;
      }
      if (skip > 0) {
        pagination.prev = page - 1;
      }

      const like = !!(await Like.findOne({
        post_id: req.params.id,
        user_id: req.user._id,
      }).lean());

      const saved_post = !!(await SavedPost.findOne({
        post_id: req.params.id,
        user_id: req.user.id,
      }).lean());

      const comments = await Comment.find({
        post_id: req.params.id,
        deleted_at: { $exists: false },
        blocked: { $exists: false },
      })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select(fieldToRemoveFromComments)
        .populate({
          path: 'user_id',
          select: 'profile_image background_image username profile_id',
          populate: { path: 'profile_id', select: '_id full_name' },
        });

      const likes = await Like.find({ post_id: req.params.id })
        .sort({ created_at: -1 })
        .limit(10)
        .select('-__v')
        .populate({
          path: 'user_id',
          select: 'profile_image background_image username profile_id',
          populate: { path: 'profile_id', select: '_id full_name' },
        });

      const comments_details = {
        total_count: countDocuments,
        count: comments.length,
        pagination,
        comments,
      };
      const { status, message, post } = responseData;

      return { status, message, post: { ...post, like, saved_post }, likes, comments_details };
    },
  })(req, res, next);
};

/**
 * @desc    Retrieve suggested posts based on user interests
 * @route   GET /api/public/posts/suggested
 * @access  Private (authenticated user)
 */
exports.getSuggestPosts = async (req, res) => {
  // const fields = ['company_id', 'publisher_id', 'likes_count', 'comments_count', 'created_at'];

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const search = req.query.search;
  const retCompany = req.query.company;
  const retPublisher = req.query.publisher;
  const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null;

  // req.query = _.pick({ ...req.query }, fields);
  // let finalFilter = buildFilterWithMerge(req.query, Post, {});
  // finalFilter = convertValues(finalFilter);

  const interests = search || req.user.interests.join(' ');
  let interestsArray = search || req.user.interests;
  if (!Array.isArray(interestsArray)) interestsArray = [interestsArray];

  // Construct match filters excluding already returned posts
  const matchFilters = {
    // ...finalFilter,
    $or: [{ $text: { $search: interests } }, { topics: { $in: interestsArray } }],
    // publisher_id: { $ne: new mongoose.Types.ObjectId(req.user.id) },
    deleted_at: { $exists: false },
    blocked: { $exists: false },
  };

  // Function to get matching posts
  const getPosts = async (matchConditions, neededLimit, randomPostsNeeded) => {
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'companies',
          localField: 'company_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $unwind: {
          path: '$company',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'company.founder._id',
          foreignField: '_id',
          as: 'founder',
        },
      },
      {
        $unwind: {
          path: '$founder',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'publisher_id',
          foreignField: '_id',
          as: 'publisher',
        },
      },
      {
        $unwind: '$publisher',
      },

      {
        $match: {
          $or: [
            { company_id: { $exists: false } },
            {
              $and: [
                { 'founder.blocked': { $exists: false } },
                { 'founder.deleted_at': { $exists: false } },
                { 'company.blocked': { $exists: false } },
                { 'company.deleted_at': { $exists: false } },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'likes',
          let: { post_id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$$post_id', '$post_id'] } } },
            { $match: userId ? { user_id: userId } : {} },
          ],
          as: 'like',
        },
      },
      {
        $lookup: {
          from: 'savedposts',
          let: { post_id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$$post_id', '$post_id'] } } },
            { $match: userId ? { user_id: userId } : {} },
          ],
          as: 'savedposts',
        },
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'publisher_id',
          foreignField: '_id',
          as: 'profile',
        },
      },
      {
        $unwind: '$profile',
      },
      {
        $project: {
          _id: 1,
          text: 1,
          images: 1,
          topics: 1,
          likes_count: 1,
          comments_count: 1,
          created_at: 1,
          updated_at: 1,
          like: { $gt: [{ $size: { $ifNull: ['$like', []] } }, 0] },
          saved_post: { $gt: [{ $size: { $ifNull: ['$savedposts', []] } }, 0] },
          company_id: {
            $cond: {
              if: retCompany && '$company',
              then: {
                _id: '$company._id',
                name: '$company.name',
                industry: '$company.industry',
                website: '$company.website',
                image: '$company.image',
                cover_image: '$company.cover_image',
              },
              else: '$company._id',
            },
          },
          publisher_id: {
            $cond: {
              if: retPublisher,
              then: {
                _id: '$publisher._id',
                username: '$publisher.username',
                profile_image: '$publisher.profile_image',
                background_image: '$publisher.background_image',
                profile_id: {
                  _id: '$profile._id',
                  full_name: '$profile.full_name',
                },
              },
              else: '$publisher._id',
            },
          },
        },
      },
    ];

    if (neededLimit) {
      pipeline.push({ $sort: { created_at: -1 } }, { $skip: skip }, { $limit: neededLimit });
    } else {
      pipeline.push({ $sample: { size: randomPostsNeeded } });
    }

    return await Post.aggregate(pipeline);
  };

  // Get matching posts
  let matchedPosts = await getPosts(matchFilters, limit);
  const totalMatchedPosts = matchedPosts.length;

  if (totalMatchedPosts < limit) {
    const randomPostsNeeded = limit - totalMatchedPosts;

    // Get IDs of already returned matched posts
    const excludingIds = matchedPosts.map(post => post._id);

    const randomFilter = {
      _id: { $nin: excludingIds },
      // publisher_id: { $ne: new mongoose.Types.ObjectId(req.user.id) },
      deleted_at: { $exists: false },
      blocked: { $exists: false },
    };

    // Get random posts excluding already returned and matched posts
    const randomPosts = await getPosts(randomFilter, undefined, randomPostsNeeded);

    matchedPosts = matchedPosts.concat(randomPosts);
  }

  res.status(200).json({ status: 'success', posts: matchedPosts });
};

/**
 * @desc    Retrieve all posts based on various filters and sorts
 * @route   GET /api/public/posts
 * @access  Private (authenticated user)
 */
exports.getAllPosts = async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const retCompany = req.query.company === 'true';
  const retPublisher = req.query.publisher === 'true';

  const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null;

  const allFields = [
    '_id',
    'text',
    'topics',
    'company_id',
    'publisher_id',
    'likes_count',
    'comments_count',
    'created_at',
  ];

  const { queryFilters, operationalParameters, orConditionsToSearch } = extractQueryParameters(
    allFields,
    req.query,
    ['topics', 'text'],
  );

  let finalFilter = buildFilterWithMerge(queryFilters, Post, {});
  finalFilter = convertValues(finalFilter);

  // Construct match filters excluding already returned posts
  const matchFilters = {
    ...finalFilter,
    ...orConditionsToSearch,
    deleted_at: { $exists: false },
    blocked: { $exists: false },
  };

  if (operationalParameters.sort) {
    operationalParameters.sort = parseSortString(operationalParameters.sort);
  }

  const pipeline = [
    {
      $match: matchFilters,
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company_id',
        foreignField: '_id',
        as: 'company',
      },
    },
    {
      $unwind: {
        path: '$company',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'company.founder._id',
        foreignField: '_id',
        as: 'founder',
      },
    },
    {
      $unwind: {
        path: '$founder',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'publisher_id',
        foreignField: '_id',
        as: 'publisher',
      },
    },
    {
      $unwind: '$publisher',
    },
    {
      $match: {
        $or: [
          {
            $and: [
              { 'publisher.deleted_at': { $exists: false } },
              { 'publisher.blocked': { $exists: false } },
              { deleted_at: { $exists: false } },
              { blocked: { $exists: false } },
              { company_id: { $exists: false } }, // Post not for company
            ],
          },
          {
            $and: [
              { deleted_at: { $exists: false } },
              { blocked: { $exists: false } },
              { 'company.deleted_at': { $exists: false } },
              { 'company.blocked': { $exists: false } },
              { 'founder.deleted_at': { $exists: false } },
              { 'founder.blocked': { $exists: false } },
              { company_id: { $exists: true } },
            ],
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'likes',
        let: { post_id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$$post_id', '$post_id'] } } },
          { $match: userId ? { user_id: userId } : {} },
        ],
        as: 'like',
      },
    },
    {
      $lookup: {
        from: 'savedposts',
        let: { post_id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$$post_id', '$post_id'] } } },
          { $match: userId ? { user_id: userId } : {} },
        ],
        as: 'savedposts',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        localField: 'publisher_id',
        foreignField: '_id',
        as: 'profile',
      },
    },
    {
      $unwind: '$profile',
    },
    {
      $facet: {
        metadata: [
          { $count: 'total_count' },
          {
            $addFields: {
              current_page: page,
              limit: limit,
              number_of_pages: { $ceil: { $divide: ['$total_count', limit] } },
            },
          },
        ],
        posts: [
          { $sort: operationalParameters.sort || { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              publisher_id: {
                $cond: {
                  if: retPublisher,
                  then: {
                    _id: '$publisher._id',
                    username: '$publisher.username',
                    profile_image: '$publisher.profile_image',
                    background_image: '$publisher.background_image',
                    profile_id: {
                      _id: '$profile._id',
                      full_name: '$profile.full_name',
                    },
                  },
                  else: '$publisher._id',
                },
              },
              company_id: {
                $cond: {
                  if: retCompany && '$company',
                  then: {
                    _id: '$company._id',
                    name: '$company.name',
                    industry: '$company.industry',
                    website: '$company.website',
                    image: '$company.image',
                    cover_image: '$company.cover_image',
                  },
                  else: '$company._id',
                },
              },
              text: 1,
              images: 1,
              topics: 1,
              likes_count: 1,
              comments_count: 1,
              created_at: 1,
              updated_at: 1,
              like: { $gt: [{ $size: { $ifNull: ['$like', []] } }, 0] },
              saved_post: { $gt: [{ $size: { $ifNull: ['$savedposts', []] } }, 0] },
            },
          },
        ],
      },
    },
    {
      $unwind: '$metadata',
    },
  ];

  try {
    const aggregationResult = await Post.aggregate(pipeline);

    const metadata = aggregationResult.length > 0 ? aggregationResult[0].metadata : {};
    const posts = aggregationResult.length > 0 ? aggregationResult[0].posts : [];

    const response = {
      status: 'success',
      message: tr($.retrieved_successfully),
      total_count: metadata.total_count || 0,
      count: posts.length,
      pagination: {
        current_page: metadata.current_page,
        limit: metadata.limit,
        number_of_pages: metadata.number_of_pages,
      },
      posts,
    };

    if (skip + limit < metadata.total_count) {
      response.pagination.next = page + 1;
    }
    if (skip > 0) {
      response.pagination.prev = page - 1;
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
