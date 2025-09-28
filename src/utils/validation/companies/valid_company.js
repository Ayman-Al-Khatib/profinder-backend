// repeated company validation : exists , not soft deleted , not blocked and the user have access to it.
const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');

module.exports = (
  company,
  options = {
    softDeleted: false,
    permission: false,
    blocked: false,
    userIsManager: null,
    companyID: null,
  },
  req,
) => {
  // assure that : the company exists in the db (always checked).
  if (!company) {
    return new ApiError([$.company_not_found, options.companyID || req.params.id], 404, {
      merge: true,
    });
  }

  // assure that : not soft deleted .
  if (options.softDeleted && company.deleted_at) {
    return new ApiError([$.company_not_found, options.companyID || req.params.id], 404, {
      merge: true,
    });
  }

  // assure that : the user have access to this company .
  if (options.permission && company.founder._id.toString() !== req.user.id.toString()) {
    return new ApiError($.you_dont_have_permission, 403);
  }

  // assure that : the company is not blocked .
  if (options.blocked && company.blocked) {
    return new ApiError([$.company_is_blocked, options.companyID || req.params.id], 403, {
      merge: true,
    });
  }

  // assure that : the user is a manager in this company .
  if (options.userIsManager) {
    const managerExists = company.managers.some(
      manager => manager._id.toString() === req.user.id.toString(),
    );
    if (!managerExists) {
      return new ApiError($.you_dont_have_permission, 403);
    }
  }

  return null;
};
