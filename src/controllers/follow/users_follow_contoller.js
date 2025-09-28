const documentCount = require('../../helper/documents_counter');
const Follow = require('../../models/follow_model');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');
const ApiError = require('../../utils/api_error');
const { default: mongoose } = require('mongoose');
const notificationController = require('../../service/notifications_service.js');
const getName = require('../../helper/get_full_name.js');
const Notification = require('../../models/notifications_model.js');
/**
 * @desc    Create a follow relationship between the current user and another user
 * @route   POST /api/users/follow
 * @access  Private (authenticated user)
 */

exports.createFollowRelationship = async (req, res, next) => {
  // Get the follower (current user) and following (target user) IDs
  const follower_id = req.user.id;
  const following_id = req.body.following;
  // Check if the follow relationship already exists, and create it if it doesn't
  let follow = await Follow.findOneAndUpdate(
    { follower_id, following_id },
    { $setOnInsert: { follower_id, following_id } },
    { upsert: true, new: false, select: '-__v' },
  );

  // If the relationship already exists, return an error
  if (follow) {
    return next(new ApiError($.existing_follow_relationship_found, 409));
  }

  res.status(200).json({ status: 'success', message: tr($.new_follow_relationship_created) });

  // Get notification tokens for the target user
  const tokens = await notificationController.getTokens(following_id);

  if (tokens && tokens.idsList.length > 0) {
    const name = await getName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.has_started_following_you,
      tokens.idsList[0],
    );

    const notification = new Notification({
      title: name,
      body: $.has_started_following_you,
      reason: 'Follow',
      reason_id: req.user.id,
      notification_type: 'token',
      sent_by: req.user.id,
      receivers: tokens.idsList,
      special_data: {
        data: req.user.id,
        type: 'Users',
      },
    });
    notification.save();
  }
};

/**
 * @desc    Delete a follow relationship between the current user and another user
 * @route   DELETE /api/users/follow/:followingId
 * @access  Private (authenticated user)
 */
exports.deleteFollowRelationship = async (req, res, next) => {
  // Get the follower (current user) and following (target user) IDs
  const follower_id = req.user.id;
  const following_id = req.params.followingId;
  let deletedFollow = await Follow.findOneAndDelete({ follower_id, following_id });
  // If the relationship is deleted, send a 204 response
  if (deletedFollow) {
    return res.status(204).send();
  } else {
    return next(new ApiError($.follow_relationship_not_found, 404));
  }
};

/**
 * @desc    Get a follow relationship where the current user is the follower
 * @route   GET /api/users/follows/my-follower/:followingId
 * @access  Private (authenticated user)
 */
exports.getFollowRelationshipByIdForFollower = async (req, res, next) => {
  // Get the follower (current user) and following (target user) IDs
  const following_id = req.params.followingId;
  const follower_id = req.user.id;

  let follow = await Follow.findOne({ following_id, follower_id }).select('-__v');

  if (follow) {
    return res.status(200).json({ status: 'success', follow });
  } else {
    return next(new ApiError($.follow_relationship_not_found, 404));
  }
};

/**
 * @desc    Get a follow relationship where the current user is the followed
 * @route   GET /api/users/follows//my-following/:followerId
 * @access  Private (authenticated user)
 */
exports.getFollowRelationshipByIdForFollowing = async (req, res, next) => {
  const following_id = req.user.id;
  const follower_id = req.params.followerId;

  let follow = await Follow.findOne({ following_id, follower_id }).select('-__v');

  if (follow) {
    return res.status(200).json({ status: 'success', follow });
  } else {
    return next(new ApiError($.follow_relationship_not_found, 404));
  }
};

/**
 * @desc    Get all followings for the current user
 * @route   GET /api/users/follows/all-following
 * @access  Private (authenticated user)
 */
exports.getAllFollowingForCurrentUser = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const follower_id = req.user._id;

  const followingForCurrentUser = await Follow.aggregate([
    {
      $match: {
        follower_id: follower_id,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'following_id',
        foreignField: '_id',
        as: 'following',
      },
    },
    {
      $unwind: '$following',
    },
    {
      $match: {
        'following.deleted_at': { $exists: false },
        'following.blocked': { $exists: false },
      },
    },
    {
      $lookup: {
        from: 'follows',
        let: { following_id: '$following._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$following_id', '$$following_id'] },
                  { $ne: ['$follower_id', follower_id] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'follower_id',
              foreignField: '_id',
              as: 'followerDetails',
            },
          },
          {
            $match: {
              'followerDetails.deleted_at': { $exists: false },
              'followerDetails.blocked': { $exists: false },
            },
          },
          {
            $unwind: '$followerDetails',
          },
          {
            $project: {
              _id: 0,
              follower_id: '$followerDetails._id',
              username: '$followerDetails.username',
              email: '$followerDetails.email',
              profile_image: '$followerDetails.profile_image',
              background_image: '$followerDetails.background_image',
            },
          },
        ],
        as: 'mutualFollowers',
      },
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
        [Follow.modelName.toLowerCase()]: [
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              following_id: '$following._id',
              username: '$following.username',
              email: '$following.email',
              profile_image: '$following.profile_image',
              background_image: '$following.background_image',
              mutual_followers: '$mutualFollowers',
            },
          },
        ],
      },
    },
    {
      $unwind: '$metadata',
    },
  ]);

  const metadata = followingForCurrentUser.length > 0 ? followingForCurrentUser[0].metadata : {};

  const documents =
    followingForCurrentUser.length > 0
      ? followingForCurrentUser[0][Follow.modelName.toLowerCase()]
      : [];

  const response = {
    status: 'success',
    message: tr($.retrieved_successfully),
    total_count: metadata.total_count || 0,
    count: documents.length,
    pagination: {
      current_page: metadata.current_page,
      limit: metadata.limit,
      number_of_pages: metadata.number_of_pages,
    },
    [Follow.modelName.toLowerCase()]: documents,
  };

  if (skip + limit < metadata.total_count) {
    response.pagination.next = page + 1;
  }
  if (skip > 0) {
    response.pagination.prev = page - 1;
  }

  res.status(200).json(response);
};

/**
 * @desc    Get all followers for the current user
 * @route   GET /api/users/follows/all-followers
 * @access  Private (authenticated user)
 */
exports.getAllFollowersForCurrentUser = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const following_id = req.user._id;

  const followersForCurrentUser = await Follow.aggregate([
    {
      $match: {
        following_id: following_id,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'follower_id',
        foreignField: '_id',
        as: 'follower',
      },
    },
    {
      $unwind: '$follower',
    },
    {
      $match: {
        'follower.deleted_at': { $exists: false },
        'follower.blocked': { $exists: false },
      },
    },
    {
      $lookup: {
        from: 'follows',
        let: { follower_id: '$follower._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$follower_id', '$$follower_id'] },
                  { $ne: ['$following_id', following_id] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'following_id',
              foreignField: '_id',
              as: 'followingDetails',
            },
          },
          {
            $match: {
              'followingDetails.deleted_at': { $exists: false },
              'followingDetails.blocked': { $exists: false },
            },
          },
          {
            $unwind: '$followingDetails',
          },
          {
            $project: {
              _id: 0,
              follower_id: '$followingDetails._id',
              username: '$followingDetails.username',
              email: '$followingDetails.email',
              profile_image: '$followingDetails.profile_image',
              background_image: '$followingDetails.background_image',
            },
          },
        ],
        as: 'mutualFollowers',
      },
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
        [Follow.modelName.toLowerCase()]: [
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              follower_id: '$follower._id',
              username: '$follower.username',
              email: '$follower.email',
              profile_image: '$follower.profile_image',
              background_image: '$follower.background_image',
              mutual_followers: '$mutualFollowers',
            },
          },
        ],
      },
    },
    {
      $unwind: '$metadata',
    },
  ]);

  const metadata = followersForCurrentUser.length > 0 ? followersForCurrentUser[0].metadata : {};

  const documents =
    followersForCurrentUser.length > 0
      ? followersForCurrentUser[0][Follow.modelName.toLowerCase()]
      : [];

  const response = {
    status: 'success',
    message: tr($.retrieved_successfully),
    total_count: metadata.total_count || 0,
    count: documents.length,
    pagination: {
      current_page: metadata.current_page,
      limit: metadata.limit,
      number_of_pages: metadata.number_of_pages,
    },
    [Follow.modelName.toLowerCase()]: documents,
  };

  if (skip + limit < metadata.total_count) {
    response.pagination.next = page + 1;
  }
  if (skip > 0) {
    response.pagination.prev = page - 1;
  }

  res.status(200).json(response);
};

/**
 * @desc    Get the count of users who follow the current user
 * @route   GET /api/users//users/follow/follower/count
 * @access  Private (authenticated user)
 */
exports.getFollowerCount = async (req, res) => {
  const following_id = req.user.id;
  const follower_count = await documentCount({
    Model: Follow,
    filterDeveloper: { following_id },
    query: req.query,
  });
  return res.status(200).json({ status: 'success', follower_count });
};

/**
 * @desc    Get the count of users whom the current user follows
 * @route   GET /api//users/follow/following/count
 * @access  Private (authenticated user)
 */
exports.getFollowingCount = async (req, res) => {
  const follower_id = req.user.id;

  const following_count = await documentCount({
    Model: Follow,
    filterDeveloper: { follower_id },
    query: req.query,
  });

  return res.status(200).json({ status: 'success', following_count });
};

/**
 * @desc    Get the common followers between the current user and another user
 * @route   GET /api/users/follow/common-followers/:followingId
 * @access  Private (authenticated user)
 */
exports.getCommonFollowers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const user1Id = new mongoose.Types.ObjectId(req.user._id); // Current user ID
  const user2Id = new mongoose.Types.ObjectId(req.params.followingId); // Other user ID

  const commonFollowers = await Follow.aggregate([
    {
      $match: {
        $or: [{ following_id: user1Id }, { following_id: user2Id }],
      },
    },
    {
      $group: {
        _id: '$follower_id',
        followedUsers: { $addToSet: '$following_id' },
      },
    },
    {
      $match: {
        followedUsers: {
          $all: [user1Id, user2Id],
        },
      },
    },
    {
      $lookup: {
        from: 'users', // Name of the User collection
        localField: '_id',
        foreignField: '_id',
        as: 'followerDetails',
      },
    },
    {
      $unwind: '$followerDetails',
    },
    {
      $lookup: {
        from: 'follows',
        let: { follower_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$follower_id', '$$follower_id'] },
                  { $ne: ['$following_id', user1Id] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'following_id',
              foreignField: '_id',
              as: 'followingDetails',
            },
          },
          {
            $match: {
              'followingDetails.deleted_at': { $exists: false },
              'followingDetails.blocked': { $exists: false },
            },
          },
          {
            $unwind: '$followingDetails',
          },
          {
            $project: {
              _id: 0,
              follower_id: '$followingDetails._id',
              username: '$followingDetails.username',
              email: '$followingDetails.email',
              profile_image: '$followingDetails.profile_image',
              background_image: '$followingDetails.background_image',
            },
          },
        ],
        as: 'mutualFollowers',
      },
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
        [Follow.modelName.toLowerCase()]: [
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              follower_id: '$followerDetails._id',
              username: '$followerDetails.username',
              email: '$followerDetails.email',
              profile_image: '$followerDetails.profile_image',
              background_image: '$followerDetails.background_image',
              mutual_followers: '$mutualFollowers',
            },
          },
        ],
      },
    },
    {
      $unwind: '$metadata',
    },
  ]);

  const metadata = commonFollowers.length > 0 ? commonFollowers[0].metadata : {};

  const documents =
    commonFollowers.length > 0 ? commonFollowers[0][Follow.modelName.toLowerCase()] : [];

  const response = {
    status: 'success',
    message: tr($.retrieved_successfully),
    total_count: metadata.total_count || 0,
    count: documents.length,
    pagination: {
      current_page: metadata.current_page,
      limit: metadata.limit,
      number_of_pages: metadata.number_of_pages,
    },
    [Follow.modelName.toLowerCase()]: documents,
  };

  if (skip + limit < metadata.total_count) {
    response.pagination.next = page + 1;
  }
  if (skip > 0) {
    response.pagination.prev = page - 1;
  }

  res.status(200).json(response);
};
