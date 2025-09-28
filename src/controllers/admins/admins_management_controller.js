const factory = require('../../helper/handlers_factory');
const Admin = require('../../models/admins_model');
const documentsCounter = require('../../helper/documents_counter');
const $ = require('../../locales/keys');
const tr = require('../../helper/translate');
const ApiError = require('../../utils/api_error');
/**
 * @desc    Create a new admin
 * @route   POST /api/super-admins/admins/
 * @access  Private (authenticated, superAdmin)
 */
exports.createAdmin = factory.createOne({
  Model: Admin,
  fields: ['username', 'password', 'email', 'roles'],
  fieldsToOmitFromResponse: ['password', '__v'],
});

/**
 * @desc    Get all admin accounts with API features
 * @route   GET /api/super-admins/admins/
 * @access  Private (authenticated, superAdmin)
 */
exports.getAdmins = (req, res, next) => {
  let rolesCondition;
  // If roles are specified in the query, create a condition to match all roles
  if (req.query.roles) rolesCondition = { $all: req.query.roles.split(',') };
  // If size is specified in the query, set the size condition
  if (req.query.size) {
    if (!rolesCondition) rolesCondition = {};
    rolesCondition.$size = req.query.size;
  }
  // Remove size and roles from the query to avoid interference
  delete req.query.size;
  delete req.query.roles;

  factory.getAll({
    Model: Admin,
    fieldsToOmitFromResponse: ['__v', 'password'],
    fieldsToSearch: ['email', 'username'],
    filterDeveloper: { ...(rolesCondition != null ? { roles: rolesCondition } : {}) },
  })(req, res, next);
};

/**
 * @desc    Delete multiple admins
 * @route   DELETE /api/super-admins/admins/
 * @access  Private (authenticated, superAdmin)
 */
exports.deleteManyAdmin = factory.deleteMany({ Model: Admin });

/**
 * @desc    Get specific admin by id
 * @route   GET /api/super-admins/admins/:id
 * @access  Private (authenticated, superAdmin)
 */
exports.getAdmin = factory.getOne({
  Model: Admin,
  fieldsToOmitFromResponse: ['__v', 'password'],
});

/**
 * @desc    Get count of admins based on roles and other filters
 * @route   GET /api/super-admins/admins/count
 * @access  Private (authenticated, superAdmin)
 */
exports.getCountAdmins = async (req, res) => {
  let rolesCondition;
  // If roles are specified in the query, create a condition to match all roles
  if (req.query.roles) rolesCondition = { $all: req.query.roles };
  // If size is specified in the query, set the size condition
  if (req.query.size) {
    if (!rolesCondition) rolesCondition = {};
    rolesCondition.$size = req.query.size;
  }
  // Remove size and roles from the query to avoid interference
  delete req.query.size;
  delete req.query.roles;

  // Count the number of admins based on the query and roles condition
  const count_admins = await documentsCounter({
    Model: Admin,
    query: rolesCondition
      ? {
          roles: rolesCondition,
          ...req.query,
        }
      : req.query,
  });
  // Return the count of admins
  return res.status(200).json({ status: 'success', count_admins });
};

/**
 * @desc    Update specific admin by id
 * @route   PUT /api/super-admins/admins/:id
 * @access  Private (authenticated, superAdmin)
 */
exports.updateAdmin = async (req, res, next) => {
  if (req.body.profile_image) req.body.profile_image = req.body.profile_image[0];
  if (req.body.background_image) req.body.background_image = req.body.background_image[0];
  return factory.updateOne({
    Model: Admin,
    fields: ['username', 'password', 'profile_image', 'background_image', 'roles'],
    fieldsToOmitFromResponse: ['__v', 'password'],
  })(req, res, next);
};

/**
 * @desc    Delete specific admin by id
 * @route   DELETE /api/super-admins/admins/:id
 * @access  Private (authenticated, superAdmin)
 */ exports.deleteAdmin = factory.deleteOne({ Model: Admin });

/**
 * @desc    UnDelete specific admin by id
 * @route   PUT /api/super-admins/admins/:id/un-delete
 * @access  Private (authenticated, superAdmin)
 */
exports.unDeleteAdmin = async (req, res, next) => {
  const admin = await Admin.findById(req.params.id);

  // If the admin is not found or not deleted, return a conflict error
  if (!admin || !admin.deleted_at) {
    return next(new ApiError($.admin_is_not_deleted_or_does_not_exist, 404));
  }

  // Un-delete the admin
  admin.deleted_at = undefined;
  await admin.save();

  return res.status(200).json({
    status: 'success',
    message: tr($.admin_undeleted_successfully),
  });
};
