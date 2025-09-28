const mongoose = require('mongoose');
const factory = require('../../../helper/handlers_factory.js');
const Post = require('../../../models/posts_and_related/posts_model.js');
const Hashtag = require('../../../models/posts_and_related/hashtags_model.js');
const PostHashtag = require('../../../models/posts_and_related/posts_hashtags.js');
const GarbageTopics = require('../../../models/topics/garbage_topics_model.js');
const Topic = require('../../../models/topics/topics_model.js');
const Follow = require('../../../models/follow_model.js');
const Report = require('../../../models/posts_and_related/reports_model.js');
const User = require('../../../models/users_model.js');
const SavedPost = require('../../../models/posts_and_related/saved_posts_model.js');
const Like = require('../../../models/posts_and_related/likes_model.js');
const Company = require('../../../models/companies_model.js');
const ApiError = require('../../../utils/api_error.js');
const notificationController = require('../../../service/notifications_service.js');
const { extractHashtags } = require('../../../helper/extract_hashtags.js');
const getName = require('../../../helper/get_full_name.js');
const $ = require('../../../locales/keys');
const tr = require('../../../helper/translate');
const _ = require('lodash');
const extractQueryParameters = require('../../../helper/extract_query_parameters');
const buildFilterWithMerge = require('../../../helper/build_filter_with_merge');
const convertValues = require('../../../helper/convert_values.js');
const parseSortString = require('../../../helper/parse_sort_string.js');
const Notification = require('../../../models/notifications_model.js');

/**
 * @desc    Create a new post
 * @route   POST /api/users/posts
 * @access  Private (authenticated user)
 */
exports.createPost = async (req, res, next) => {
  // Set the publisher_id to the id of the logged-in user
  req.body.publisher_id = req.user.id;

  // Create the post using the factory function
  const post = await factory.createOne({
    Model: Post,
    fieldsToOmitFromResponse: ['total_reports', 'unhandled_reports', '__v'],
    fields: ['text', 'publisher_id', 'images', 'topics', 'company_id'],
    callback: response => {
      if (req.company && req.query.company === 'true') {
        response.post.company_id = _.pick(req.company, [
          '_id',
          'cover_image',
          'image',
          'website',
          'name',
        ]);
      }
      if (req.query.publisher === 'true') {
        response.post.publisher_id = _.pick(req.user, [
          '_id',
          'username',
          'profile_image',
          'background_image',
        ]);
      }
      return response;
    },
  })(req, res, next);
  //! after send response (behind the scenes)

  if (!post) return;

  // Extract hashtags from the post text
  const hashtags = extractHashtags(post.text);

  // Bulk upsert hashtags (insert or update if they already exist)
  const hashtagOperations = hashtags.map(hashtag => ({
    updateOne: {
      filter: { name: hashtag },
      update: { $set: { name: hashtag } },
      upsert: true,
    },
  }));

  await Hashtag.bulkWrite(hashtagOperations);

  // Retrieve the IDs of the hashtags
  const hashtagIds = await Hashtag.find({ name: { $in: hashtags } }).select('_id');

  // Create post-hashtag relationships
  const postHashtagRelationships = hashtagIds.map(hashtagDoc => ({
    hashtag_id: hashtagDoc._id,
    post_id: post._id,
  }));

  await PostHashtag.insertMany(postHashtagRelationships);

  if (post.topics && post.topics.length == 0) return;

  // Update or insert garbage topics
  const uniqueTopics = Array.from(new Set(req.body.topics));
  if (uniqueTopics.length > 0) {
    // Update GarbageTopics count
    const bulkOperations = uniqueTopics.map(topic => ({
      updateOne: {
        filter: { topic: topic },
        update: { $inc: { count: 1 } },
        upsert: true,
      },
    }));

    // Execute bulk write operations
    await GarbageTopics.bulkWrite(bulkOperations);
  }

  // Promote garbage topics to good topics if their count is 4 or more
  const popularTopics = await GarbageTopics.find({
    topic: { $in: post.topics },
    count: { $eq: 50 },
  });

  if (popularTopics.length > 0) await Topic.insertMany(popularTopics);

  const followersIds = await Follow.find({ following_id: req.user._id }).select('follower_id -_id');
  const listIds = followersIds.map(e => e.follower_id.toString());
  const tokens = await notificationController.getTokens(listIds);

  let image;
  if (post.images && process.env.NODE_ENV === 'production') {
    image = process.env.URL_API_HOSTING + '/' + post.images[0];
  }

  if (tokens && tokens.idsList.length > 0) {
    const name = await getName(req);
    notificationController.sendNotificationToMultipleTokens(
      tokens.tokensList,
      name,
      post.text,
      tokens.idsList,
      undefined,
      image,
    );

    const notification = new Notification({
      title: name,
      body: post.text,
      reason: 'Posts',
      reason_id: post.id,
      notification_type: 'token',
      sent_by: req.user.id,
      receivers: tokens.idsList,
      special_data: {
        data: post.company_id ?? post.publisher_id,
        type: post.company_id == null ? 'Users' : 'Companies',
      },
    });
    notification.save();
  }
};

/**
 * @desc    Get all my posts
 * @route   GET /api/users/posts
 * @access  Private (authenticated user)
 */
exports.getAllPosts = async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const retCompany = req.query.company === 'true';
  const retPublisher = req.query.publisher === 'true';

  const userId = req.user._id;

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
    publisher_id: new mongoose.Types.ObjectId(userId),

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

/**
 * @desc    Update a post
 * @route   PUT /api/users/posts/:id
 * @access  Private (authenticated user)
 */
exports.updatePost = async (req, res, next) => {
  // Update the post using the factory function
  const updatedPost = await factory.updateOne({
    Model: Post,
    fieldsToOmitFromResponse: ['total_reports', 'unhandled_reports', '__v'],
    fields: ['text', 'images', 'topics'],
    callback: async data => {
      const saved_post = !!(await SavedPost.findOne({
        user_id: req.user.id,
        post_id: req.params.id,
      }).lean());
      const like = !!(await Like.findOne({
        user_id: req.user.id,
        post_id: req.params.id,
      }).lean());

      if (req.company && req.query.company === 'true') {
        data.post.company_id = _.pick(req.company, [
          '_id',
          'cover_image',
          'image',
          'website',
          'name',
        ]);
      }
      if (req.query.publisher === 'true') {
        data.post.publisher_id = _.pick(req.user, [
          '_id',
          'username',
          'profile_image',
          'background_image',
        ]);
      }

      const { status, post, message } = data;
      return { status, message, post: { ...post, like, saved_post } };
    },
  })(req, res, next);

  if (!updatedPost) return;

  // Extract new hashtags from the updated post text
  const newHashtags = extractHashtags(updatedPost.text);

  // Get existing hashtags associated with the post
  const existingHashtagRelations = await PostHashtag.find({ post_id: req.params.id }).populate(
    'hashtag_id',
    'name',
  );
  const existingHashtags = existingHashtagRelations.map(rel => rel.hashtag_id.name);

  // Determine hashtags to add and remove
  const hashtagsToAdd = newHashtags.filter(tag => !existingHashtags.includes(tag));
  const hashtagsToRemove = existingHashtags.filter(tag => !newHashtags.includes(tag));

  // Bulk upsert new hashtags
  if (hashtagsToAdd.length > 0) {
    const upsertOperations = hashtagsToAdd.map(hashtag => ({
      updateOne: {
        filter: { name: hashtag },
        update: { $set: { name: hashtag } },
        upsert: true,
      },
    }));
    await Hashtag.bulkWrite(upsertOperations);
  }

  // Fetch new hashtag IDs
  const newHashtagInfo = await Hashtag.find({ name: { $in: hashtagsToAdd } }).select('_id');

  // Prepare relations for insertion
  const newHashtagRelations = newHashtagInfo.map(hashtag => ({
    hashtag_id: hashtag._id,
    post_id: req.params.id,
  }));

  // Remove outdated hashtag relations
  if (hashtagsToRemove.length > 0) {
    const removeHashtagInfo = await Hashtag.find({ name: { $in: hashtagsToRemove } }).select('_id');
    const removeHashtagIds = removeHashtagInfo.map(hashtag => hashtag._id);
    await PostHashtag.deleteMany({
      post_id: req.params.id,
      hashtag_id: { $in: removeHashtagIds },
    });
  }

  // Insert new hashtag relations
  if (newHashtagRelations.length > 0) {
    await PostHashtag.insertMany(newHashtagRelations);
  }

  if ((updatedPost.topics || []).length === 0) return;

  // Remove duplicate topics and update or insert garbage topics
  const uniqueTopics = Array.from(new Set(updatedPost.topics));
  if (uniqueTopics.length > 0) {
    // Update GarbageTopics count
    const bulkOperations = uniqueTopics.map(topic => ({
      updateOne: {
        filter: { topic: topic },
        update: { $inc: { count: 1 } },
        upsert: true,
      },
    }));

    // Execute bulk write operations
    await GarbageTopics.bulkWrite(bulkOperations);
  }

  // Promote garbage topics to good topics if their count is exactly 50
  const popularTopics = await GarbageTopics.find({
    topic: { $in: updatedPost.topics },
    count: { $eq: 50 },
  });

  if (popularTopics.length > 0) await Topic.insertMany(popularTopics);
};

/**
 * @desc    Delete a post
 * @route   DELETE /api/users/posts/:id
 * @access  Private (authenticated user)
 */
exports.deleteOne = (req, res, next) => {
  return factory.deleteOne({
    Model: Post,
  })(req, res, next);
};

/**
 * @desc    Report a post
 * @route   POST /api/users/posts/:id/report
 * @access  Private (authenticated user)
 */
exports.reportpost = async (req, res, next) => {
  // Find the post by ID
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new ApiError($.post_not_found, 404));
  }

  // Check if the post is deleted or blocked
  if (post.deleted_at || post.blocked) {
    return next(new ApiError($.post_is_not_available, 403));
  }

  if (post.company_id) {
    const company = await Company.findById(post.company_id);
    if (!company || company.deleted_at || company.blocked) {
      return next(new ApiError($.you_cannot_report_on_this_post, 403));
    }
    if (company.founder._id != req.user._id) {
      const founder = await User.findById(post.publisher_id);
      if (!founder || founder.deleted_at || founder.blocked) {
        return next(new ApiError($.you_cannot_report_on_this_post, 403));
      }
    }
  } else {
    const user = await User.findById(post.publisher_id);
    if (!user || user.deleted_at || user.blocked) {
      return next(new ApiError($.you_cannot_report_on_this_post, 403));
    }
  }

  // Check if the report already exists
  let report = await Report.findOne({
    reporter_id: req.user.id,
    reported_item_id: post._id,
    type: 'Posts',
  });
  if (report) {
    return next(new ApiError($.you_have_already_reported_this_post, 409));
  }

  // Create the new report
  report = new Report({
    reporter_id: req.user.id,
    reported_item_id: post._id,
    reason: req.body.reason,
    type: 'Posts',
  });

  // Save the report
  await report.save();

  // Increase the total reports and unhandled reports count in the post
  post.total_reports++;
  post.unhandled_reports++;
  await post.save();

  return res.status(200).json({
    status: 'success',
    message: tr($.the_report_has_been_successfully_sent),
  });
};
