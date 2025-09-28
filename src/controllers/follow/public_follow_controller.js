const Follow = require('../../models/follow_model');
const mongoose = require('mongoose');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');

/**
 * @desc    Get all follow relationships for a user where the user is the follower
 * @route   GET /api/public/all-following/:followerId
 * @access  Pubilc (authenticated any)
 */
exports.getAllFollowingForUser = async (req, res) => {
  // Convert followerId from request params to a Mongoose ObjectId
  const follower_id = new mongoose.Types.ObjectId(req.params.followerId);

  // Pagination parameters
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const followingForUser = await Follow.aggregate([
    {
      $match: {
        // Match documents where the user is the follower
        follower_id: follower_id,
      },
    },
    // Lookup details of the following users
    {
      $lookup: {
        from: 'users',
        localField: 'following_id',
        foreignField: '_id',
        as: 'following',
      },
    },
    {
      // Unwind the resulting array to work with individual following user documents
      $unwind: '$following',
    },
    {
      $match: {
        // Filter out deleted or blocked users
        'following.deleted_at': { $exists: false },
        'following.blocked': { $exists: false },
      },
    },

    {
      $lookup: {
        from: 'profiles',
        let: { following_id: '$following._id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$following_id'] },
            },
          },
        ],
        as: 'profile',
      },
    },
    {
      $unwind: {
        path: '$profile',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup mutual followers' details
    {
      $lookup: {
        from: 'follows',
        let: { following_id: '$following._id' },
        pipeline: [
          {
            // Match documents where other users follow the same following user
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
            // Lookup details of the mutual followers
            $lookup: {
              from: 'users',
              localField: 'follower_id',
              foreignField: '_id',
              as: 'followerDetails',
            },
          },
          {
            // Filter out deleted or blocked mutual followers
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

    // Facet to handle both metadata and documents in one step
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
              full_name: '$profile.full_name',
              bio: '$profile.bio',
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

  const metadata = followingForUser.length > 0 ? followingForUser[0].metadata : {};

  const documents =
    followingForUser.length > 0 ? followingForUser[0][Follow.modelName.toLowerCase()] : [];

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

//  الحصول على جميع المتابعين لمستخدم معين حيث هذا المستخدم هو المتابَع
/**
 * @desc    Get all followers for a user where the user is the followed
 * @route   GET /api/public/all-followers/:followingId
 * @access  Pubilc (authenticated any)
 */
exports.getAllFollowersForUser = async (req, res) => {
  const following_id = new mongoose.Types.ObjectId(req.params.followingId);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const followersForUser = await Follow.aggregate([
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
        from: 'profiles',
        let: { follower_id: '$follower._id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$follower_id'] },
            },
          },
        ],
        as: 'profile',
      },
    },
    {
      $unwind: {
        path: '$profile',
        preserveNullAndEmptyArrays: true,
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
              full_name: '$profile.full_name',
              bio: '$profile.bio',
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

  const metadata = followersForUser.length > 0 ? followersForUser[0].metadata : {};

  const documents =
    followersForUser.length > 0 ? followersForUser[0][Follow.modelName.toLowerCase()] : [];

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
 * @desc    Get the count of followers for a user where the user is the followed
 * @route   GET /api/follows/followers/:followingId/count
 * @access  Pubilc (authenticated any)
 */
exports.getFollowerCount = async (req, res) => {
  const following_id = req.params.followingId;
  const follower_count = await Follow.countDocuments({ following_id });
  return res.status(200).json({ status: 'success', follower_count });
};

/**
 * @desc    Get the count of users followed by a user where the user is the follower
 * @route   GET /api/follows/following/:followerId/count
 * @access  Pubilc (authenticated any)
 */
exports.getFollowingCount = async (req, res) => {
  const follower_id = req.params.followerId;
  const following_count = await Follow.countDocuments({ follower_id });
  return res.status(200).json({ status: 'success', following_count });
};
