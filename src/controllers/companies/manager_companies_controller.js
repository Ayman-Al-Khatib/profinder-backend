// This controller have the actions that can be done by the managers//
// in terms of the ' company account ' feature .

const _ = require('lodash');

const User = require('../../models/users_model');
const Company = require('../../models/companies_model');
const CompanyBlock = require('../../models/company_blocks_model');
const CopmanyExperience = require('../../models/company_experiences_model');
const ManagerRequest = require('../../models/manager_requests_model');
const validCompany = require('../../utils/validation/companies/valid_company');
const ApiError = require('../../utils/api_error');
const adjustCompany = require('../../helper/adjust_company_images');
const factory = require('../../helper/handlers_factory');
const tr = require('../../helper/translate');
const $ = require('../../locales/keys');

// @desc get all the companies that the user is an admin within
// @route Get /api/manager/companies/
// @access (authenticated, user (has manager authority in the company))

exports.getCompanies = async (req, res) => {
  // fetch the user and populate his manager_at array .
  const populatedUser = await User.findById(req.user.id).populate('manager_at.company_id');

  // adjust the companies from the populated array
  let companies = populatedUser.manager_at.map(obj => obj.company_id);

  // omit the missing or soft deleted .
  companies = companies.filter(company => company && !company.deleted_at);

  // sanitize the response .
  companies = await Promise.all(
    companies.map(async company => {
      company = _.omit(company.toObject(), [
        '__v',
        'application_id',
        'timestamps',
        'total_reports',
        'unhandled_reports',
      ]);
      company = await adjustCompany(company);
      return company;
    }),
  );

  // response
  res.status(200).json({
    message: 'success',
    companies,
  });
};

// @desc get a company that the user is manager within
// @route Get /api/manager/companies/:id
// @access (authenticted, user (has manager authority in the company))

exports.getCompany = async (req, res, next) => {
  // fetch the company
  let company = await Company.findById(req.params.id);

  // assure that : the company exists, not soft deleted
  // and the user is manager within it
  const error = validCompany(company, { softDeleted: true, userIsManager: true }, req);
  if (error) return next(error);

  // sanitize the response
  company = _.omit(company.toObject(), [
    '__v',
    'application_id',
    'timestamps',
    'total_reports',
    'unhandled_reports',
  ]);

  company = await adjustCompany(company);

  // send response
  return res.status(200).json({
    status: 'success',
    company,
  });
};

// @desc block a user from interacting with a company
// @route POST /api/manager/companies/:id/block-user
// @access (authenticated, user (has manager authority in the company))

exports.blockUserFromCompany = async (req, res, next) => {
  // fetch the company
  let company = await Company.findById(req.params.id);

  // assure that : the user_id correspond to a user that does exist .
  const user = await User.findById(req.body.user_id);
  if (!user || user.deleted_at) {
    return next(new ApiError([$.this_user_id_not_found, req.body.user_id], 400, { merge: true }));
  }

  // assure that : the user is not a manager inside this company .
  if (company.managers.some(m => m._id.toString() === req.body.user_id.toString())) {
    return next(new ApiError($.the_company_cannot_block_one_of_its_managers, 400));
  }

  // validate the company : exists, not deleted, not blocked and the request user have access to it .
  const error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    req,
  );
  if (error) return next(error);

  // assure that : the user is not already blocked .
  const alreadyBlocked = await CompanyBlock.findOne({
    company_id: company._id,
    user_id: req.body.user_id,
  });
  if (alreadyBlocked) {
    return next(new ApiError($.this_user_is_already_blocked_from_this_company, 400));
  }

  // block the user
  const block = new CompanyBlock({
    company_id: company._id,
    user_id: req.body.user_id,
  });
  await block.save();

  await ManagerRequest.findOneAndDelete({
    'company.id': company._id,
    'receiver.id': req.body.user_id,
    status: 'pending',
  });

  // response
  return res.status(200).json({
    status: 'success',
    message: [tr($.user_was_successfully_blocked_from_company)],
  });
};

// @desc un-block a user from interacting with the company
// @route POST /api/manager/companies/:id/un-block-user
// @access (authenticated, user (has manager authority in the company)) .

exports.unBlockUserFromCompany = async (req, res, next) => {
  // fetch the company
  let company = await Company.findById(req.params.id);

  // validate company : exists, not soft deleted, not blocked and the request user has access to it .
  const error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    req,
  );
  if (error) return next(error);

  // assure that : the user is blocked and needs to be unblocked .
  const block = await CompanyBlock.findOne({
    user_id: req.body.user_id,
    company_id: req.params.id,
  });
  if (!block) {
    return next(new ApiError($.this_user_is_not_blocked_from_this_company, 400));
  }

  // un-block the user
  await CompanyBlock.findByIdAndDelete(block._id);

  // response
  res.status(200).json({
    status: 'success',
    message: [tr($.the_user_was_successfully_un_blocked_from_company)],
  });
};

// @desc resign from the company
// @route /api/manager/companies/:id/resign
// @access (authenticted, user (manager in the company))

exports.resign = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate the company : exists , not soft deleted and the user is manager within it .
  const error = validCompany(company, { softDeleted: true, userIsManager: true }, req);
  if (error) return next(error);

  // edit the managers array in the company
  company.managers = company.managers.filter(
    manager => manager._id.toString() !== req.user.id.toString(),
  );

  // delete the corresponding manager request
  // await ManagerRequest.findOneAndDelete({
  //   'sender.id': company.founder._id,
  //   'receiver.id': req.user.id,
  //   'company.id': company._id,
  //   status: 'accepted',
  // });

  // fetch the user
  const user = await User.findById(req.user.id);

  // edit the manager at array in the user
  user.manager_at = user.manager_at.filter(
    obj => obj.company_id.toString() !== company._id.toString(),
  );

  // save the company and the user
  await company.save();
  await user.save();

  // respone
  return res.status(200).json({
    status: 'success',
    message: [tr($.you_successfully_resigned_from_the_company)],
  });
};

// @desc get all the company work experience
// @route GET /api/manager/companies/:id/company-experiences
// @access (authenticated, user (has manager authority in the company))

exports.getAllCompanyExperiences = async (req, res, next) => {
  // load the request query with only these fields (if exists)
  // in order to permit filter ONLY ON THEM .
  req.query = _.pick(req.query, [
    'user_id',
    'user_name',
    'start_date',
    'end_date',
    'verification',
    'page',
    'limit',
    'current_page',
  ]);

  // load the request query with the company_id
  // in order for this route to return only the experiences of the company that holds this id.
  req.query.company_id = req.params.id;

  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate the company : exists , not soft deleted , not blocked and the user has access to it.
  const error = validCompany(company, { softDeleted: true, userIsManager: true }, req);
  if (error) return next(error);

  // if the company has a valid state => respone using factory .
  return factory.getAll({
    Model: CopmanyExperience,
    fieldsToSearch: ['user_name'],
    fieldsToOmitFromResponse: ['__v'],
  })(req, res, next);
};

// @desc get a specific experience for this company
// @route /api/companies/:id/company-experience/:experience_id
// @access (authenticated, user (have manager authority in this company))

exports.getOneCompanyExperience = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate the company: exists , not soft deleted and the user has access to it.
  const error = validCompany(company, { softDeleted: true, userIsManager: true }, req);
  if (error) return next(error);

  // fetch the experience
  let experience = await CopmanyExperience.findById(req.params.experience_id);

  // assure that : the experience does exist , and the experience and company match
  if (!experience || experience.company_id.toString() !== company._id.toString()) {
    return next(
      new ApiError([$.work_connection_not_found, req.params.experience_id], 404, { merge: true }),
    );
  }

  // sanitize the response
  experience = _.omit(experience.toObject(), ['__v']);

  // response with the connection
  return res.status(200).json({
    status: 'success',
    experience,
  });
};

// @desc reject a company experience
// @route DELETE /api/companies/:id/company-experiences/:experience_id
// @access (authenticated, user (have manager authority in the company))

exports.rejectCompanyExperience = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate the company : exists, not soft deleted , not blocked and the user has access to it.
  const error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    req,
  );
  if (error) return next(error);

  // fetch the connection
  const experience = await CopmanyExperience.findById(req.params.experience_id);

  // assure that : the connection does exist.
  if (!experience || experience.company_id.toString() !== company._id.toString()) {
    return next(
      new ApiError([$.work_connection_not_found, req.params.experience_id], 404, { merge: true }),
    );
  }

  // delete the connection
  await CopmanyExperience.findByIdAndDelete(experience._id);

  // response
  return res.status(204).send();
};

// @desc accept a company experience
// @route PUT /api/companies/:id/company-experiences/:connection_id
// @access (authenticated, user (have manager authority in this company))

exports.acceptCompanyExperience = async (req, res, next) => {
  // fethc the comapny
  const company = await Company.findById(req.params.id);

  // validate the company : exists , not soft deleted , not blocked and the user has access to it.
  const error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    req,
  );
  if (error) return next(error);

  // fethc the experience
  let experience = await CopmanyExperience.findById(req.params.experience_id);

  // assure that : the connection does exist .
  if (!experience || experience.company_id.toString() !== company._id.toString()) {
    return next(
      new ApiError([$.work_connection_not_found, req.params.experience_id], 404, { merge: true }),
    );
  }

  // assure that : the connection is not already accepted .
  if (experience.verification === 'accepted') {
    return res.status(409).json({
      status: 'success',
      messages: [tr($.you_already_accepeted_this_experience)],
    });
  }

  // accept the connection.
  experience.verification = 'accepted';
  await experience.save();

  // sanitize the response
  experience = _.omit(experience.toObject(), ['__v']);

  // response
  return res.status(200).json({
    status: 'success',
    experience,
  });
};
