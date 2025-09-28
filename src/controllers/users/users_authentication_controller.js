const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const ApiError = require('../../utils/api_error');
const createToken = require('../../utils/create_token');
const User = require('../../models/users_model');
const factory = require('../../helper/handlers_factory');
const emailVerificationHandler = require('../../helper/email_verification_handler');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');
const Profile = require('../../models/profile');
const Follow = require('../../models/follow_model');
const Report = require('../../models/posts_and_related/reports_model');
const Wallet = require('../../models/wallets_model');
const Topic = require('../../models/topics/topics_fcm_model');
const notificationController = require('../../service/notifications_service');
const mongoose = require('mongoose');
/**
 * @desc    User Signup
 * @route   POST /api/users/signup
 * @access  Public
 */
exports.signup = async (req, res) => {
  // Pick username, password, and email fields from the request body
  const fieldsToCreateNewItem = _.pick(req.body, ['username', 'password', 'email']);
  // Create a new user in the database with the picked fields
  const user = await User.create(fieldsToCreateNewItem);
  // Send email for verification
  await emailVerificationHandler(user);

  res.status(201).json({
    status: 'success',
    message: tr($.user_created_successfully_please_check_your_email_for_a_verification_code),
  });
};

/**
 * @desc    User Login
 * @route   POST /api/users/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email });

  if (!user || !user.password) {
    return next(new ApiError($.incorrect_email_or_password, 401));
  }
  // Check if user exists and password matches
  if (!(await bcrypt.compare(req.body.password, user.password))) {
    // If authentication fails, return error with status code 401
    return next(new ApiError($.incorrect_email_or_password, 401));
  }

  // Check if user account is not deleted
  if (user.deleted_at) {
    // If user account is not deleted, return error with status code 404
    return next(new ApiError($.user_account_has_been_marked_as_deleted, 404));
  }

  // Check if user account is not blocked
  if (user.blocked) {
    return next(
      new ApiError($.your_account_has_been_blocked_Please_contact_support_for_assistance, 403),
    );
  }

  // Check if user account is approved
  if (!user.approved) {
    // If user account is not approved, return error with status code 403
    return next(new ApiError($.account_not_approved, 403));
  }

  // Generate JWT token
  const token = createToken({ info: { id: user._id, role: 'user' } });

  // Omit sensitive data from user object
  const userWithoutSensitiveData = _.omit(user.toObject(), [
    'password',
    '__v',
    'password_changed_at',
    'verify_code',
    'deleted_at',
    'blocked',
    'unhandled_reports',
    'total_reports',
    'last_login',
  ]);

  user.last_login = new Date();
  user.save();

  res.status(200).json({ status: 'success', user: userWithoutSensitiveData, token });
};

/**
 * @desc    Send Verification Code
 * @route   POST /api/users/send-verify-code
 * @access  Public
 */
exports.sendVerifyCode = async (req, res) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email });

  // Send email for verification
  await emailVerificationHandler(user);

  res.status(200).json({ status: 'success', message: tr($.verification_code_sent_successfully) });
};

/**
 * @desc    Reset User Password
 * @route   POST /api/users/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  const { email, verify_code, password } = req.body;

  // Find the user by email
  const user = await User.findOne({ email });
  // Check if user exists
  if (!user) {
    // If no user found, throw an error with status code 404
    return next(new ApiError([$.there_is_no_user_with_that_email, email], 404, { merge: true }));
  }

  // Check if the verification code exists
  if (!user.verify_code) {
    // If no verification code found, throw an error with status code 400
    return next(new ApiError($.no_verification_code_found_for_this_user, 400));
  }

  // Verify the provided verification code
  const decoded = jwt.verify(user.verify_code, process.env.JWT_SECRET_KEY);

  if (decoded.verify_code.toString() !== verify_code.toString()) {
    // If verification code does not match, throw an error with status code 400
    return next(new ApiError($.invalid_verification_code, 400));
  }

  // Update user's password and clear the verification code
  user.password = password;
  if (!user.approved) {
    user.approved = Date.now();
    await Profile.create({ _id: user._id });
    const wallet = await Wallet.create({ user_id: user._id, user_name: user.username });
    user.wallet_id = wallet._id;
  }
  user.verify_code = undefined;

  await user.save();

  res.status(200).json({ status: 'success', message: tr($.password_reset_successful) });
};

/**
 * @desc    Approve User Account
 * @route   POST /api/users/approve
 * @access  Public
 */
exports.approveUser = async (req, res, next) => {
  const { email, verify_code } = req.body;

  // Find the user by email
  const user = await User.findOne({ email });
  // Check if user exists
  if (!user) {
    // If no user found, throw an error with status code 404
    return next(new ApiError([$.no_user_found_with_email, ':', email], 404, { merge: true }));
  }

  // Check if user account is already approved
  if (user.approved) {
    // If user account is already approved, throw an error with status code 409
    return next(new ApiError($.user_is_already_approved, 409));
  }
  // Check if the verification code exists
  if (!user.verify_code) {
    // If no verification code found, throw an error with status code 400
    return next(new ApiError($.no_verification_code_found_for_this_user, 400));
  }

  let decoded;
  try {
    decoded = jwt.verify(user.verify_code, process.env.JWT_SECRET_KEY);
  } catch (error) {
    // Handle token verification errors
    if (error.name === 'JsonWebTokenError') {
      // If verification code is invalid, return error response with status code 400
      return next(new ApiError($.invalid_verification_code_Please_provide_a_valid_code, 400));
    } else if (error.name === 'TokenExpiredError') {
      // If verification code has expired, return error response with status code 400
      return next(new ApiError($.verification_code_has_expired, 400));
    }
  }

  // Check if decoded verification code matches the provided verification code

  if (decoded.verify_code.toString() !== verify_code.toString()) {
    // If verification code does not match, throw an error with status code 400
    return next(new ApiError($.invalid_verification_code, 400));
  }

  // Set user's approval date, clear verification code, and save changes
  user.approved = new Date();
  user.verify_code = undefined;

  await Profile.create({ _id: user._id });
  const wallet = await Wallet.create({ user_id: user._id, user_name: user.username });
  user.wallet_id = wallet._id;

  await user.save();

  res.status(200).json({ status: 'success', message: tr($.user_approved_successfully) });
};

/**
 * @desc    Update User Profile
 * @route   PATCH /api/users/:id
 * @access  Private (authenticated, user)
 */
exports.updateUser = async (req, res, next) => {
  // Set the user's ID for updating based on the authenticated user's ID from the request
  req.params.id = req.user._id;
  if (req.body.background_image) req.body.background_image = req.body.background_image[0];
  if (req.body.profile_image) req.body.profile_image = req.body.profile_image[0];
  // Use the factory function to update user details
  factory.updateOne({
    Model: User,
    fields: ['username', 'password', 'profile_image', 'background_image'],
    fieldsToOmitFromResponse: [
      'password',
      '__v',
      'password_changed_at',
      'verify_code',
      'deleted_at',
      'blocked',
      'unhandled_reports',
      'total_reports',
    ],
  })(req, res, next);
};

/**
 * @desc    Delete User Account
 * @route   DELETE /api/users/delete-user/:id
 * @access  Private (authenticated, user)
 */
exports.deleteUser = async (req, res, next) => {
  // Set the user's ID for deletion based on the authenticated user's ID from the request
  req.params.id = req.user._id;
  // Use the factory function to delete the user account
  factory.deleteOne({ Model: User })(req, res, next);
};

/**
 * @desc    Visit User Profile
 * @route   GET /api/users/:id/visit
 * @access  Private (authenticated, user)
 */
exports.visitUser = async (req, res, next) => {
  const user = await User.findOne({
    _id: req.params.id,
    deleted_at: { $exists: false },
    blocked: { $exists: false },
  })
    .populate({
      path: 'profile_id',
      select: '-created_at -updated_at  -__v -companies -manager_at',
      populate: {
        path: 'social_media_links.platform_id',
      },
    })
    .select(
      '-approved -password -source -created_at -updated_at -password_changed_at -__v -total_reports -unhandled_reports',
    );

  if (!user) {
    return next(new ApiError($.user_not_found, 404));
  }

  let is_following = false;
  if (req.user.id !== req.params.id) {
    is_following =
      (await Follow.exists({
        follower_id: req.user._id,
        following_id: req.params.id,
      }).lean()) != null;
  }

  const following_count = await Follow.countDocuments({ follower_id: req.params.id }).lean();
  const followers_count = await Follow.countDocuments({ following_id: req.params.id }).lean();

  res.status(200).json({
    status: 'success',
    user,
    is_following,
    following_count,
    followers_count,
  });
};

/**
 * @desc    Report User
 * @route   POST /api/users/:id//report
 * @access  Private (authenticated, user)
 */
exports.reportUsers = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deleted_at || user.blocked) {
    next(new ApiError($.user_not_found, 404));
  }

  // Check if the report already exists
  let report = await Report.findOne({
    reporter_id: req.user.id,
    reported_item_id: user._id,
    type: 'Users',
  });
  if (report) {
    return next(new ApiError($.you_have_already_reported_this_user, 409));
  }

  // Create the new report
  report = new Report({
    reporter_id: req.user.id,
    reported_item_id: user._id,
    reason: req.body.reason,
    type: 'Users',
  });

  // Save the report
  await report.save();

  // Increase the total reports and unhandled reports count in the post
  user.total_reports++;
  user.unhandled_reports++;
  await user.save();

  return res.status(200).json({
    status: 'success',
    msg: tr($.the_report_has_been_successfully_sent),
  });
};
/**
 * @desc    Logout User
 * @route   POST /api/users/logout
 * @access  Private (authenticated, user)
 */
exports.logout = async (req, res) => {
  const user = await User.findById(req.user.id);
  const topics = await Topic.findOne({ user_id: req.user.id });

  // Update user last logout time
  user.last_logout = new Date();
  user.save();
  if (topics && topics.topics) {
    // Collect all unsubscribe promises
    const unsubscribePromises = topics.topics.map(topic =>
      notificationController.unsubscribeFromTopic([topics.token], topic, [req.user.id]),
    );
    // Await all unsubscribe operations
    Promise.all(unsubscribePromises);
    topics.token = undefined;
    topics.save();
    // Delete notification tokens
  }
  notificationController.deleteTokens([req.user._id.toString()]);

  res.status(200).json({
    status: 'success',
    message: $.user_has_been_logged_out_successfully,
  });
};
/**
 * @desc    Search Users by Username
 * @route   GET /api/users/:username/search
 * @access  Private (authenticated, user)
 */
exports.searchByUsername = async (req, res) => {
  const username = req.params.username;

  // Step 1: Search for users and profiles, select only the 'id' field
  const users = await User.find({ username: { $regex: username, $options: 'i' } }).select('id');
  const profiles = await Profile.find({ username: { $regex: username, $options: 'i' } }).select(
    'id',
  );

  // Step 2: Merge results into a single list using Set to eliminate duplicates
  const mergedResults = new Set();

  users.forEach(user => mergedResults.add(user.id.toString()));
  profiles.forEach(profile => mergedResults.add(profile.id.toString()));

  let userIds = Array.from(mergedResults);
  userIds = userIds.filter(id => id.toString() !== req.user.id.toString());

  let detailedUsers = await User.find({ _id: { $in: userIds } })
    .select('username profile_image background_image')
    .populate({ path: 'profile_id', select: 'bio address full_name' })
    .lean();

  // Step 4: Add mutual followers information to each detailed user
  const detailedUsersWithFollowers = await Promise.all(
    detailedUsers.map(async user => {
      const mutualFollowers = await getCommonFollowers(req.user._id, user._id.toString());
      user.mutual_followers = mutualFollowers;
      return user;
    }),
  );

  res.status(200).json({ status: 'success', users: detailedUsersWithFollowers });
};

async function getCommonFollowers(user1, user2) {
  const page = 1;
  const limit = 3;
  const skip = (page - 1) * limit;
  const user1Id = new mongoose.Types.ObjectId(user1); // Current user ID
  const user2Id = new mongoose.Types.ObjectId(user2); // Other user ID

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
        metadata: [{ $count: 'total_count' }],

        [Follow.modelName.toLowerCase()]: [
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              followers: '$mutualFollowers',
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

  return {
    total_count: metadata.total_count || 0,
    count: documents.length,
    [Follow.modelName.toLowerCase()]: documents,
  };
}

/**
 * @desc    User Login OR SIGN UP
 * @route   POST /api/users/sign-in-google
 * @access  Public
 */
exports.signInGoogle = async (req, res, next) => {
  let response;
  try {
    response = await axios.get(`https://people.googleapis.com/v1/people/${req.body.google_id}`, {
      params: {
        personFields: 'names,emailAddresses',
      },
      headers: {
        Authorization: `Bearer ${req.body.access_token}`,
      },
    });

    if (
      response.status !== 200 ||
      !response.data.emailAddresses ||
      !response.data.emailAddresses[0] ||
      !response.data.names ||
      !response.data.names[0]
    ) {
      return next(new ApiError($.failed_to_user_data, 401));
    }
  } catch (error) {
    console.error('Error fetching data from Google API:', error.message);
    return next(new ApiError($.failed_to_user_data, 401));
  }

  const email = response.data.emailAddresses[0].value;
  const googleId = response.data.emailAddresses[0].metadata.source.id;
  const fullName = response.data.names[0].displayName;

  let user = await User.findOne({ email: email });
  if (user) {
    if (user.deleted_at) {
      return next(new ApiError($.user_account_has_been_marked_as_deleted, 404));
    }
    if (user.blocked) {
      return next(
        new ApiError($.your_account_has_been_blocked_Please_contact_support_for_assistance, 403),
      );
    }
  } else {
    let index = 1;
    let username = fullName
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/_+/g, '_')
      .replace(/^\.|\.$/g, '');

    if (username.length < 3) {
      const randomChars = '_abcdefghijklmnopqrstuvwxyz0123456789_';
      while (username.length < 10) {
        username += randomChars[Math.floor(Math.random() * randomChars.length)];
      }
    }

    while (await User.exists({ username })) {
      username = `${username}_${index}`;
      index += 1;
    }

    user = await User.create({
      email: email,
      source: 'google',
      google_id: googleId,
      username: username,
      approved: new Date(),
    });

    await Profile.create({ _id: user.id, full_name: fullName });
    const wallet = await Wallet.create({ user_id: user._id, user_name: user.username });
    user.wallet_id = wallet._id;
  }

  user.last_login = new Date();
  await user.save();

  const token = createToken({ info: { id: user._id, role: 'user' } });
  const userWithoutSensitiveData = _.omit(user.toObject(), [
    'password',
    '__v',
    'password_changed_at',
    'verify_code',
    'deleted_at',
    'blocked',
    'unhandled_reports',
    'total_reports',
    'last_login',
  ]);

  res.status(200).json({ status: 'success', user: userWithoutSensitiveData, token });
};
