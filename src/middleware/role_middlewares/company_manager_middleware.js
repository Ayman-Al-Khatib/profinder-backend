const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

module.exports = (req, res, next) => {
  if (!req.admin.roles.includes('companyManager')) {
    return next(new ApiError($.you_should_have_company_manager_role_as_an_admin));
  }
  next();
};
