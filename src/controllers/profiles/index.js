const Profile = require('../../models/profile');
const User = require('../../models/users_model');
const factory = require('../../helper/handlers_factory');
const printProfile = require('../../helper/print_profile');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

const checkCompleteInfo = profile => {
  return profile.full_name && profile.date_of_birth && profile.gender && profile.email;
};

/**
 * @desc    Retrieve details of a specific profile
 * @route   GET /api/users/profile/:id
 * @access  Private (authenticated user)
 */
exports.getOne = async (req, res, next) => {
  if (!req.params.id) req.params.id = req.user.id;

  factory.getOne({
    Model: Profile,
    fieldsToOmitFromResponse: ['__v'],
    // populationOpt: ['social_media_links.platform_id'],
  })(req, res, next);
};

/**
 * @desc    Retrieve all profiles matching the search criteria
 * @route   GET /api/users/profiles
 * @access  Private (authenticated user)
 */
exports.getAll = factory.getAll({ Model: Profile, fieldsToSearch: ['bio', 'full_name'] });

/**
 * @desc    Update profile details for the authenticated user
 * @route   PUT /api/users/profile
 * @access  Private (authenticated user)
 */
exports.updateOne = async (req, res, next) => {
  req.params.id = req.user.id;
  factory.updateOne({
    Model: Profile,
    fields: ['phone', 'email', 'date_of_birth', 'bio', 'gender', 'full_name'],
    fieldsToOmitFromResponse: ['__v'],
    populationOpt: [{ path: 'social_media_links.platform_id', select: '-__v' }],
  })(req, res, next);
};

/**
 * @desc    Update CV (PDF resume) for the authenticated user's profile
 * @route   PUT /api/users/profile/cv
 * @access  Private (authenticated user)
 */
exports.updateCV = async (req, res, next) => {
  req.params.id = req.user.id;
  factory.updateOne({
    Model: Profile,
    fields: ['pdf_cv'],
    fieldsToOmitFromResponse: ['__v'],
    populationOpt: [{ path: 'social_media_links.platform_id', select: '-__v' }],
  })(req, res, next);
};

/**
 * @desc    Print and download the profile as PDF for the authenticated user
 * @route   GET /api/users/profile/print-and-download
 * @access  Private (authenticated user)
 */
exports.printAndDownload = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  let profile = await Profile.findById(req.params.id).populate('social_media_links.platform_id');

  if (!profile || !user) {
    return next(new ApiError([$.no_user_found_for_this_Id, req.params.id], 404, { merge: true }));
  }

  profile = profile.toObject();
  profile.profile_image = user.profile_image;

  if (!checkCompleteInfo(profile)) {
    return next(new ApiError($.please_compelete_your_profile_information, 400));
  }

  try {
    const pdfBytes = await printProfile(profile);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=profile.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.log(error);
    console.log('this');
    return next(new ApiError($.something_went_wrong));
  }
};
