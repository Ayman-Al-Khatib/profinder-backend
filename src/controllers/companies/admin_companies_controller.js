// This controller has the actions the admin can do
// in terms of the ' copmany account ' feature .

const _ = require('lodash');

const Company = require('../../models/companies_model');
const { Job } = require('../../models/jobs_model');
const User = require('../../models/users_model');
const Report = require('../../models/posts_and_related/reports_model');
const notificationController = require('../../service/notifications_service.js');
const adjustCompany = require('../../helper/adjust_company_images');
const factory = require('../../helper/handlers_factory');
const ApiError = require('../../utils/api_error');
const documentsCounter = require('../../helper/documents_counter');
const validCompany = require('../../utils/validation/companies/valid_company');
const $ = require('../../locales/keys');

// @desc get all the companies accounts with api features .
// @route GET /api/admin/companies/
// @access (authenticated, admin).

exports.getCompanies = async (req, res, next) => {
  const callback = async responseData => {
    let companies = responseData.companies;
    companies = await Promise.all(companies.map(async company => await adjustCompany(company)));

    return { ...responseData, companies };
  };

  return factory.getAll({
    Model: Company,
    fieldsToSearch: ['name', 'description'],
    callback,
    fieldsToOmitFromResponse: ['__v'],
  })(req, res, next);
};

// @desc get specific company
// @route GET /api/admin/companies/:id
// @access (authenticated, admin)

exports.getCompany = async (req, res, next) => {
  const callback = async responseData => {
    let company = responseData.company;
    company = await adjustCompany(company);
    return { ...responseData, company };
  };

  return factory.getOne({
    Model: Company,
    populationOpt: null,
    callback,
    fieldsToOmitFromResponse: ['__v'],
  })(req, res, next);
};

// @desc get all the companies that a specific user is manager on .
// @route GET /api/admin/companies/is-manager
// @access (authenticated, admins)

exports.getAllManagerCompanies = async (req, res, next) => {
  // fetch the user and populate his manager_at array .
  const populatedUser = await User.findById(req.body.user_id).populate('manager_at.company_id');

  if (!populatedUser) {
    return next(
      new ApiError([$.no_user_found_for_this_Id, req.body.user_id], 400, { merge: true }),
    );
  }

  // get the companies from the populated user .
  let companies = populatedUser.manager_at;

  // sanitize the compaines array from the population operation .
  companies = companies.map(obj => obj.company_id);

  // filter the companies ( if there is an absent company , omit it) .
  companies = companies.filter(company => company !== null);

  // sanitize the response
  companies = companies.map(company => _.omit(company.toObject(), ['__v']));

  // response
  return res.status(200).json({
    status: 'success',
    companies,
  });
};

// @desc block a company
// @route PUT /api/admin/companies/:id/block
// @access (authenticated, admin (company manager role))

exports.blockCompany = async (req, res, next) => {
  // fetch the company .
  let company = await Company.findById(req.params.id);

  // assure that : the company does exists .
  if (!company) {
    return next(new ApiError([$.company_not_found, req.params.id], 400, { merge: true }));
  }

  // if the company was soft deleted : inform the admin
  if (company.deleted_at) {
    return next(
      new ApiError([$.this_company_was_soft_deleted, req.params.id], 400, { merge: true }),
    );
  }

  // if the company is already blocked : inform the admin
  if (company.blocked) {
    return next(new ApiError([$.company_is_already_blocked, req.params.id], 400, { merge: true }));
  }

  const blockingDate = new Date();

  // block the company :
  company.blocked = {
    blocked_at: blockingDate,
    responsibile_support_id: req.admin.id,
    responsibile_support_name: req.admin.username,
    // responsibile_support: { _id: req.admin.id, name: req.admin.username },
  };

  // save the document
  await company.save();

  // sending a notification to the user .
  const user = await User.findById(company.founder._id);
  const tokens = await notificationController.getTokens(user._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      company.name.toString(),
      $.your_company_was_blocked,
      tokens.idsList[0],
      { company_id: company._id.toString() },
    );
  }

  // sanitize the response
  company = _.omit(company.toObject(), ['__v']);

  // attach the images to the company
  company = await adjustCompany(company);

  // response
  return res.status(200).json({
    status: 'success',
    company,
  });
};

// @desc remove the block of a company
// @route PUT /api/admin/companies/un-block/:id
// @access (authenticated, admin (company manager role))

exports.unBlockCompany = async (req, res, next) => {
  // fetch the company .
  let company = await Company.findById(req.params.id);

  // assure that : the company does exists .
  if (!company) {
    return next(new ApiError([$.company_not_found, req.params.id], 400, { merge: true }));
  }

  // if the company was soft deleted : inform the admin .
  if (company.deleted_at) {
    return next(
      new ApiError([$.this_company_was_soft_deleted, req.params.id], 400, { merge: true }),
    );
  }

  // if the company is not blocked : inform the admin .
  if (!company.blocked) {
    return next(new ApiError([$.the_company_is_not_blocked, req.params.id], 400, { merge: true }));
  }

  // sending a notification to the user .
  const user = await User.findById(company.founder._id);
  const tokens = await notificationController.getTokens(user._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      company.name.toString(),
      $.your_company_was_unblocked,
      tokens.idsList[0],
      { company_id: company._id.toString() },
    );
  }

  // unblock the company
  company.blocked = undefined;
  await company.save();

  // sanitize the response .
  company = _.omit(company.toObject(), ['__v']);

  // attach the images to the company
  company = await adjustCompany(company);

  // response
  res.status(200).json({
    status: 'success',
    company,
  });
};

// @desc count companies with specific filteration
// @route GET /api/admin/companies/count
// @access (authenticated, admin)
exports.countCompanies = async (req, res) => {
  const count = await documentsCounter({ Model: Company, query: req.query });

  return res.status(200).json({
    status: 'success',
    copmanies_count: count,
  });
};

// @desc get the company along with its reports .
// @route GET /api/admin/companies/:id/with-reports
// @access (authenticated, user)

exports.getCompanyAndReports = async (req, res, next) => {
  // fetch the company
  let company = await Company.findById(req.params.id);

  const error = validCompany(company, {}, req);
  if (error) return next(error);

  company = await adjustCompany(company.toObject());

  const filterDeveloper = {
    reported_item_id: req.params.id,
    type: 'Companies',
  };

  const developerSort = 'created_at';

  const callback = async responseData => {
    const message = responseData.message;
    const status = responseData.status;
    delete responseData.message;
    delete responseData.status;
    return {
      message,
      status,
      company,
      reports: { pagination: responseData.pagination, docs: responseData.reports },
    };
  };

  return factory.getAll({
    Model: Report,
    filterDeveloper,
    developerSort,
    fieldsToOmitFromResponse: ['__v'],
    callback,
  })(req, res, next);
};
