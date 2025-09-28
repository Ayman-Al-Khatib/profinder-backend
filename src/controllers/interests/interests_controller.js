const User = require('../../models/users_model');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');

/**
 * @desc    Add a new interest to the current user
 * @route   POST /api/users/interests
 * @access  Private (authenticated user)
 */
exports.addInterest = async (req, res) => {
  let { interests } = req.body;
  const user = await User.findById(req.user._id);

  // Normalize input to array if it's a string
  interests = Array.isArray(interests) ? interests : [interests];

  // Convert all interests to lowercase and remove duplicates
  interests = interests.map(int => int.toLowerCase());
  interests = [...new Set(interests)];

  user.interests = interests;
  await user.save();
  return res.status(201).json({
    status: 'success',
    message:
      interests.length === 0
        ? tr($.interest_removed_successfully)
        : tr($.interest_added_successfully),
    interests: user.interests,
  });
};

/**
 * @desc    Get all interests of the current user
 * @route   GET /api/users/interests
 * @access  Private (authenticated user)
 */
exports.getInterest = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    status: 'success',
    message: tr($.retrieved_successfully),
    interests: user.interests,
  });
};

/**
 * @desc    Update an existing interest of the current user
 * @route   PUT /api/users/interests
 * @access  Private (authenticated user)
 */
exports.updateInterest = async (req, res, next) => {
  const { old_interest, new_interest } = req.body;
  const user = await User.findById(req.user._id);

  if (old_interest.toLowerCase() === new_interest.toLowerCase()) {
    return next(new ApiError('New interest is the same as old interest', 400));
  }
  if (user.interests.includes(new_interest.toLowerCase())) {
    return next(new ApiError('New interest already exists in the list', 409));
  }
  const interestIndex = user.interests.indexOf(old_interest.toLowerCase());
  if (interestIndex === -1) {
    return next(new ApiError('Old interest not found', 404));
  }
  user.interests[interestIndex] = new_interest.toLowerCase();
  user.interests = [...new Set(user.toObject().interests)];
  await user.save();
  res.status(200).json({
    status: 'success',
    message: tr($.interest_updated_successfully),
    interests: user.interests,
  });
};

/**
 * @desc    Remove an interest from the current user
 * @route   DELETE /api/users/interests/:interest
 * @access  Private (authenticated user)
 */
exports.removeInterest = async (req, res, next) => {
  const { interest } = req.params;
  const user = await User.findById(req.user._id);

  const interestIndex = user.interests.indexOf(interest.toLowerCase());
  if (interestIndex === -1) {
    return next(new ApiError($.interest_not_found, 404));
  }
  user.interests.splice(interestIndex, 1);
  await user.save();
  res.status(200).json({
    status: 'success',
    message: tr($.interest_removed_successfully),
    interests: user.interests,
  });
};

/**
 * @desc    Remove all interests of the current user
 * @route   DELETE /api/users/interests
 * @access  Private (authenticated user)
 */
exports.removeAllInterests = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.interests = [];
  await user.save();
  res.status(200).json({ status: 'success', message: tr($.all_interests_deleted_successfully) });
};
