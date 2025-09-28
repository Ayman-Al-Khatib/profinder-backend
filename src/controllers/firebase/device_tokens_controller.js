const redis = require('../../config/redis_config');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');
const Topic = require('../../models/topics/topics_fcm_model');
const admin = require('firebase-admin');
const cron = require('node-cron');
const notificationController = require('../../service/notifications_service');
/**
 * @desc    Get token associated with authenticated user
 * @route   GET /api/users/device-token/
 * @access  Private (authenticated, user)
 */
exports.getToken = async (req, res) => {
  const token = await redis.get(`${req.user._id}:token`);
  res.status(200).json({
    status: 'success',
    token,
  });
};

/**
 * @desc    Create/update user token for push notifications
 * @route   POST /api/users/device-token/
 * @access  Private (authenticated, user)
 */
exports.createToken = async (req, res) => {
  res.status(201).json({
    status: 'success',
  });
  const userId = req.user._id;
  const newToken = req.body.token;

  // Find existing user topics or create new if none exist
  let userTopics = await Topic.findOne({ user_id: userId });
  let topics = userTopics ? userTopics.topics : [];

  // Default to 'users' topic if user has no topics
  if (topics.length === 0) {
    topics = ['users'];
  }

  // Unsubscribe from old token's topics if exists
  if (userTopics && userTopics.token) {
    console.log(
      '🚀  ~  file: device_tokens_controller.js:37 ~  exports.createToken= ~  topics:',
      topics,
    );
    const unsubscribePromises = topics.map(topic =>
      notificationController.unsubscribeFromTopic([userTopics.token], topic, [req.user.id]),
    );
    console.log(unsubscribePromises.length);
    await Promise.all(unsubscribePromises);
  }

  await redis.set(`${req.user._id}:lang`, req.body.lang);
  // Subscribe to new token's topics
  const subscribePromises = topics.map(topic =>
    notificationController.subscribeToTopic([newToken], topic, [req.user.id]),
  );
  await Promise.all(subscribePromises);

  if (!userTopics) {
    userTopics = new Topic({
      user_id: userId,
      token: newToken,
      lang: req.body.lang,
      topics: topics,
    });
  } else {
    userTopics.token = newToken;
    userTopics.last_activity = Date.now();
    userTopics.lang = req.body.lang;
  }

  await userTopics.save();

  // Store new token in Redis with expiration
  await redis.set(`${req.user._id}:token`, req.body.token, { EX: process.env.TOKEN_DEVICE_TTL });
};

/**
 * @desc    Delete user token and associated topics
 * @route   DELETE /api/users/device-token/
 * @access  Private (authenticated, user)
 */
exports.deleteToken = async (req, res, next) => {
  const userId = req.user._id;

  // Find the user's topics and token from the database
  const userTopics = await Topic.findOne({ user_id: userId });

  if (userTopics && userTopics.token) {
    const token = userTopics.token;
    const topics = userTopics.topics;

    // Unsubscribe from all topics if topics exist
    if (topics && topics.length > 0) {
      const unsubscribePromises = topics.map(topic =>
        admin.messaging().unsubscribeFromTopic(token, topic),
      );
      await Promise.all(unsubscribePromises);
    }

    // Remove the user's topics record from the database
    userTopics.token = undefined;
    await userTopics.save();
  }

  // Delete the token from Redis
  const result = await redis.del(`${userId}:token`);

  // Respond with success
  if (result) return res.status(204).send();
  return next(new ApiError($.token_not_found_or_already_deleted, 404));
};

/**
 * @desc    Clean up inactive tokens older than 14 days
 * @route   Cron job scheduled daily at 12:00 PM
 */
const cleanupInactiveTokens = async () => {
  try {
    // Calculate the date 14 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    // Find all records where token is not null and last_activity is before cutoffDate
    const tokensToCleanup = await Topic.find({
      token: { $exists: true, $ne: null },
      last_activity: { $lt: cutoffDate },
    }).lean(); // Use lean() for faster performance

    console.log(`Found ${tokensToCleanup.length} tokens to cleanup.`);

    // Process each token to unsubscribe and update
    const unsubscribePromises = tokensToCleanup.map(async record => {
      const { token, topics } = record;

      // Unsubscribe from topics using Firebase Admin SDK
      if (topics && topics.length > 0) {
        await Promise.all(
          topics.map(topic => admin.messaging().unsubscribeFromTopic(token, topic)),
        );
      }
    });

    await Promise.all(unsubscribePromises);

    // Find tokens to clean up based on last_activity date
    await Topic.updateMany(
      {
        token: { $exists: true, $ne: null },
        last_activity: { $lt: cutoffDate },
      },
      { $unset: { token: '' } },
    );

    console.log('Cleanup process completed.');
  } catch (error) {
    console.error('Error cleaning up inactive tokens:', error);
    throw error;
  }
};

// Schedule cleanup function to run daily at 12:00 PM
cron.schedule('0 0 12 * * *', () => {
  cleanupInactiveTokens();
});
