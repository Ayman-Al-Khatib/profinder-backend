const factory = require('../../helper/handlers_factory');
const User = require('../../models/users_model');
const Wallet = require('../../models/wallets_model');
const Profile = require('../../models/profile');
const Report = require('../../models/posts_and_related/reports_model');
const documentsCounter = require('../../helper/documents_counter');
const fs = require('fs');
const path = require('path');
const ApiError = require('./../../utils/api_error');
const $ = require('./../../locales/keys');
const tr = require('../../helper/translate');

/**
 * @desc    Create a new user
 * @route   POST /api/admins/users
 * @access  Private (authenticated, admin)
 */
exports.createUser = async (req, res, next) => {
  // Set the approval date to the current date
  req.body.approved = new Date();
  // Use the factory function to create a new user account

  const user = await factory.createOne({
    Model: User,
    fields: ['username', 'password', 'email', 'approved'],
    fieldsToOmitFromResponse: ['password', '__v'],
  })(req, res, next);
  let pro;
  if (user) {
    pro = await Profile.create({ _id: user._id });
    const wallet = await Wallet.create({ user_id: user._id, user_name: user.username });
    user.wallet_id = wallet._id;
    await user.save();
  }
  console.log('🚀 ~ exports.createUser= ~ pro:', pro);
};

/**
 * @desc    Get all users
 * @route   GET /api/admins/users
 * @access  Private (authenticated, admin)
 */
exports.getUsers = async (req, res, next) => {
  factory.getAll({
    Model: User,
    fieldsToOmitFromResponse: ['__v', 'password', 'verify_code'],
    fieldsToSearch: ['username', 'email'],
    populateDeveloper: [{ path: 'companies.company_id', select: 'cover_image image' }],
    callback: response => {
      response.users = response.users.map(user => {
        user.companies = user.companies.map(company => {
          return {
            company_id: company.company_id,
            image: company.image,
            cover_image: company.cover_image,
            company_name: company.company_name,
          };
        });
        return user;
      });

      return response;
    },
  })(req, res, next);
};

/**
 * @desc    Delete multiple users
 * @route   DELETE /api/admins/users
 * @access  Private (authenticated, admin)
 */
exports.deleteManyUsers = factory.deleteMany({ Model: User });

/**
 * @desc    Get specific user by ID
 * @route   GET /api/admins/users/:id
 * @access  Private (authenticated, admin)
 */
exports.getUser = async (req, res, next) => {
  if (
    req.query.file &&
    (req.query.file === 'profile_image' || req.query.file === 'background_image')
  ) {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return next(new ApiError($.user_not_found, 404));
    }
    const image = path.join('uploads', user[req.query.file] || '');
    fs.readFile(image, (err, data) => {
      if (err) {
        console.error(err);
        next(new ApiError($.error_reading_image_file_or_file_not_found, 500));
        return;
      }
      const contentType = 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.send(data);
    });
  } else {
    let populate = {};
    if (req.query.populate && req.query.populate.split(',').includes('profile_id')) {
      populate = [
        {
          path: 'profile_id',
          populate: {
            path: 'social_media_links.platform_id',
          },
        },
      ];
    }

    factory.getOne({
      Model: User,
      fieldsToOmitFromResponse: ['__v', 'password', 'verify_code'],
      populationOpt: populate,
    })(req, res, next);
  }
};

/**
 * @desc    Update specific user by ID
 * @route   PATCH /api/admins/users/:id
 * @access  Private (authenticated, admin)
 */
exports.updateUser = async (req, res, next) => {
  // Check if the 'approved' field is provided in the request body
  if (req.body.approved !== undefined) {
    req.body.approved = req.body.approved.toString() === 'true' ? new Date() : undefined;
  }

  if (req.body.background_image) req.body.background_image = req.body.background_image[0];
  if (req.body.profile_image) req.body.profile_image = req.body.profile_image[0];

  factory.updateOne({
    Model: User,
    fields: ['username', 'password', 'approved', 'profile_image', 'background_image'],
    fieldsToOmitFromResponse: ['__v', 'password', 'verify_code'],
  })(req, res, next);
};

/**
 * @desc    Delete specific user by ID
 * @route   DELETE /api/admins/users/:id
 * @access  Private (authenticated, admin)
 */
exports.deleteUser = factory.deleteOne({ Model: User });

/**
 * @desc    Block a user
 * @route   PATCH /api/admins/users/:id/block
 * @access  Private (authenticated, admin)
 */
exports.blockUser = factory.blockOne({ Model: User });

/**
 * @desc    Unblock a user
 * @route   PATCH /api/admins/users/:id/unblock
 * @access  Private (authenticated, admin)
 */
exports.unBlockUser = factory.unBlockOne({ Model: User });

/**
 * @desc    Get count of users based on query
 * @route   GET /api/admins/users/count
 * @access  Private (authenticated, admin)
 */
exports.getCountUsers = async (req, res) => {
  const count_users = await documentsCounter({
    Model: User,
    query: req.query,
  });
  return res.status(200).json({ status: 'success', count_users });
};

exports.getUserWithReports = async (req, res, next) => {
  const user = await User.findById(req.params.id).lean().select('-__v');

  factory.getAll({
    Model: Report,
    filterDeveloper: { type: 'Users', reported_item_id: req.params.id },
    callback: responseData => {
      const message = responseData.message;
      const status = responseData.status;
      delete responseData.message;
      delete responseData.status;

      return {
        message,
        status,
        user,
        reports: {
          pagination: responseData.pagination,
          total_count: responseData.total_count,
          count: responseData.count,
          docs: responseData.reports,
        },
      };
    },
  })(req, res, next);
};

/**
 * @desc    Block multiple users by their IDs
 * @route   PUT /api/admins/users/block
 * @access  Private (authenticated, admin)
 */
exports.blockManyUsers = async (req, res, next) => {
  // Extract IDs from the request body
  const { ids } = req.body;
  let idsNotFound = [];
  let blockedIds = [];

  // If IDs are provided and they are in array format
  if (Array.isArray(ids) && ids.length) {
    // Find documents with the provided IDs that are not soft-deleted
    const foundDocuments = await User.find({
      _id: { $in: ids },
      blocked: { $exists: false },
      deleted_at: { $exists: false },
    }).select('_id');

    const foundIds = foundDocuments.map(doc => doc._id.toString());

    // Filter out IDs that were not found
    idsNotFound = ids.filter(id => !foundIds.includes(id));

    // If some identifiers are not found, return a 404 error
    if (idsNotFound.length) {
      return next(new ApiError($.unable_to_find_some_identifiers, 404, { data: { idsNotFound } }));
    }

    // Store the IDs to be blocked
    blockedIds = foundIds;
  }

  // Construct a filter to block documents with the provided IDs
  const filter = ids
    ? { _id: { $in: blockedIds } }
    : { blocked: { $exists: false }, deleted_at: { $exists: false } };

  // Update documents based on the filter
  const { modifiedCount } = await User.updateMany(filter, {
    $set: {
      blocked: {
        blocked_at: new Date(),
        username: req.admin.username,
        support_id: req.admin._id,
      },
    },
  });

  // If no documents were modified, return a 404 error
  if (!modifiedCount) {
    return next(new ApiError($.no_users_found_for_blocking, 404));
  }

  res.status(200).json({
    status: 'success',
    message: tr($.users_blocked_successfully),
  });
};

/**
 * @desc    Unblock multiple users by their IDs
 * @route   PUT /api/admins/users/unblock
 * @access  Private (authenticated, admin)
 */
exports.unblockManyUsers = async (req, res, next) => {
  // Extract IDs from the request body
  const { ids } = req.body;
  let idsNotFound = [];
  let unblockedIds = [];

  // If IDs are provided and they are in array format
  if (Array.isArray(ids) && ids.length) {
    // Find documents with the provided IDs that are not soft-deleted
    const foundDocuments = await User.find({
      _id: { $in: ids },
      deleted_at: { $exists: false },
    }).select('_id');

    const foundIds = foundDocuments.map(doc => doc._id.toString());

    // Filter out IDs that were not found
    idsNotFound = ids.filter(id => !foundIds.includes(id));

    // If some identifiers are not found, return a 404 error
    if (idsNotFound.length) {
      return next(new ApiError($.unable_to_find_some_identifiers, 404, { data: { idsNotFound } }));
    }

    // Store the IDs to be unblocked
    unblockedIds = foundIds;
  }

  // Construct a filter to unblock documents with the provided IDs
  const filter = ids ? { _id: { $in: unblockedIds } } : {};

  // Update documents based on the filter
  const { modifiedCount } = await User.updateMany(filter, {
    $unset: {
      blocked: '',
    },
  });

  // If no documents were modified, return a 404 error
  if (!modifiedCount) {
    return next(new ApiError($.no_users_found_for_unblocking, 404));
  }

  res.status(200).json({
    status: 'success',
    message: tr($.users_unblocked_successfully),
  });
};
