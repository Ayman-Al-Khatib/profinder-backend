// This module contains the actions that an explore user (not an admin nor the company account creator)
// can do in terms of ' company account ' feature .

const _ = require('lodash');

const Company = require('../../models/companies_model');
const CompanyBlock = require('../../models/company_blocks_model');
const CompanyExperience = require('../../models/company_experiences_model');
const User = require('../../models/users_model.js');
const ManagerRequest = require('../../models/manager_requests_model');
const Notification = require('../../models/notifications_model.js');
const Report = require('../../models/posts_and_related/reports_model');
const notificationController = require('../../service/notifications_service.js');
const handleAcceptedRequest = require('../../helper/handle_accepted_request.js');
const ApiError = require('../../utils/api_error');
const factory = require('../../helper/handlers_factory');
const validCompany = require('../../utils/validation/companies/valid_company');
const compareDate = require('../../helper/compare_date');
const getFullName = require('../../helper/get_full_name.js');
const convertValues = require('../../helper/convert_values.js');
const buildFilterWithMerge = require('../../helper/build_filter_with_merge.js');
const stringSortConvert = require('../../helper/string_sort_converter.js');
const tr = require('../../helper/translate.js');
const $ = require('../../locales/keys');

// @desc search companies by name for explorer user
// @route Get api/explore/companies/
// @access (authenticated, any)

exports.searchCompanies = async (req, res, next) => {
  // Extract the pagination params
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const sort = req.query.sort ? stringSortConvert(req.query.sort) : null;

  req.query = _.pick(req.query, [
    'name',
    'industry',
    'size',
    'size.min',
    'size.max',
    'description',
    'website',
    'location',
  ]);
  req.query = buildFilterWithMerge(req.query, Company, null);
  req.query = convertValues(req.query);

  // ensure that : there is some fields to search
  // if (Object.keys(req.query).length < 1) {
  //   return res.status(200).json({
  //     status: 'success',
  //     companies: [],
  //   });
  // }

  // ensure that : each string search text is at least two chars long .
  for (const key in req.query) {
    if (Object.prototype.hasOwnProperty.call(req.query, key)) {
      if (
        typeof req.query[key] === 'string' &&
        !req.query[key].startsWith('$') &&
        req.query[key].length < 2
      ) {
        return next(new ApiError($.the_search_word_cannot_be_less_than_2_chars, 400));
      }
    }
  }

  const matchFilters = {
    deleted_at: { $exists: false },
    blocked: { $exists: false },
    ...req.query,
  };
  // console.log(matchFilters);

  const pipeline = [{ $match: matchFilters }];

  if (sort) pipeline.push({ $sort: sort });

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'founder._id',
        foreignField: '_id',
        as: 'founder',
      },
    },
    { $unwind: '$founder' },
    {
      $match: {
        'founder.blocked': { $exists: false },
        'founder.deleted_at': { $exists: false },
      },
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          {
            $project: {
              founder: 0,
              application_id: 0,
              managers: 0,
              updated_at: 0,
              created_at: 0,
              __v: 0,
              jobs_count: 0,
              total_reports: 0,
              unhandled_reports: 0,
            },
          },
          {
            $skip: skip,
          },
          { $limit: limit },
        ],
      },
    },
  );
  const aggregation = await Company.aggregate(pipeline);

  const response = {
    status: 'success',
    pagination: {
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
      page,
      limit,
    },
    companies: aggregation[0]?.data || [],
  };

  return res.status(200).json(response);
};

// @desc get a company for explorer user
// @route GET /api/explore/companies/:id
// @access (authenticated, user)

exports.getCompany = async (req, res, next) => {
  // fetch the company .
  let company = await Company.findById(req.params.id);

  // assure that : the company does exist, not soft deleted and not blocked .
  const error = validCompany(company, { softDeleted: true, blocked: true }, req);
  if (error) return next(new ApiError([$.company_not_found, req.params.id], 404, { merge: true }));

  company = _.omit(company.toObject(), [
    'founder',
    'application_id',
    'managers',
    'updated_at',
    'created_at',
    '__v',
    'jobs_count',
    'total_reports',
    'unhandled_reports',
  ]);

  return res.status(200).json({
    status: 'success',
    company,
  });
};

// @desc apply for a work experience in this company to be verified
// @route POST /api/explore/companies/:id/company-experiences
// @access (authenticated, user)

exports.createCompanyExperience = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.id);

  // vaildate the company : exists, not soft deleted and not blocked .
  const error = validCompany(company, { softDeleted: true, blocked: true }, req);
  if (error) return next(new ApiError([$.company_not_found, req.params.id], 404, { merge: true }));

  // assure that : the user is not blocked from interacting with the company
  const block = await CompanyBlock.findOne({ user_id: req.user.id, company_id: company.id });
  if (block) {
    return next(new ApiError($.you_are_blocked_from_this_company, 403));
  }

  // assure that : the user can have only one pending company experience to the same company
  const pendingExperience = await CompanyExperience.findOne({
    user_id: req.user.id,
    company_id: company._id,
    verification: 'pending',
  });
  if (pendingExperience) {
    return next(new ApiError($.you_can_request_one_conneciton_for_the_same_company_at_a_time, 400));
  }

  const acceptedExperience = await CompanyExperience.findOne({
    user_id: req.user.id,
    company_id: company._id,
    verification: 'accepted',
  });

  // assure that : the user does not have a similar connection
  if (acceptedExperience && compareDate(acceptedExperience.start_date, req.body.start_date)) {
    return next(new ApiError($.you_already_have_this_connection, 400));
  }

  // load the request with the appropriate information
  req.body.user_id = req.user.id;
  req.body.user_name = req.user.username;
  req.body.company_id = company._id;
  req.body.company_name = company.name;

  // assure that : that start date preceeds the end date
  if (req.body.end_date) {
    if (new Date(req.body.end_date) < new Date(req.body.start_date))
      return next(new ApiError($.the_start_date_must_precede_the_end_date, 400));
  }

  // creation
  factory.createOne({
    Model: CompanyExperience,
    fields: ['company_id', 'company_name', 'user_id', 'user_name', 'start_date', 'end_date'],
    fieldsToOmitFromResponse: ['__v'],
  })(req, res, next);
};

// @desc get all companies experience for a user
// @route GET /api/explore/companies/company-experiences
// @access (authenticated, user)

exports.getAllCompanyExperiences = async (req, res, next) => {
  // get only the request of this user .
  req.query = {
    ..._.pick(req.query, 'company_name', 'company_id', 'verification', 'creatd_at'),
    user_id: req.user.id,
  };

  // response
  return factory.getAll({
    Model: CompanyExperience,
    populateDeveloper: [{ path: 'company_id', select: '_id image' }],
    fieldsToOmitFromResponse: ['__v'],
    fieldsToSearch: [],
  })(req, res, next);
};

// @desc delete company experience for a user
// @route DELETE /api/explore/company-experiences/:id
// @access (authenticated, user)

exports.deleteCompanyExperience = async (req, res, next) => {
  // fetch the company experience
  const experience = await CompanyExperience.findById(req.params.id);

  // assure the experience exists
  if (!experience) {
    return next(new ApiError([$.work_connection_not_found, req.params.id], 404, { merge: true }));
  }

  // assure the user has access to this experience
  if (experience.user_id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission), 403);
  }

  // delete the connection
  await CompanyExperience.findByIdAndDelete(req.params.id);

  // response
  return res.status(204).send();
};

// @desc get all manager requests for a user
// @route GET /api/explore/companies/manager-requests
// @access (authenticated, user)

exports.getManagerRequests = async (req, res, next) => {
  // fields the user can filter on
  const fields = ['sender.name', 'company.name', 'status', 'page', 'limit', 'current_page'];

  // extract these fields only from the query
  req.query = _.pick(req.query, fields);

  // arrange in descending order of created_at
  req.query.sort = '-created_at';

  // get only the requests of token user
  const filterDeveloper = {
    'receiver.id': req.user.id,
  };

  const fieldsToOmitFromResponse = ['__v'];

  const callback = response => {
    response.recieved_manager_requests = response.managerrequests;
    delete response.managerrequests;
    return response;
  };

  // response
  return factory.getAll({
    Model: ManagerRequest,
    fieldsToOmitFromResponse,
    filterDeveloper,
    callback,
  })(req, res, next);
};

// @desc accept a manager request
// @route PUT /api/explore/companies/manager-requests/:id/accept
// @access (authenticated, user)

exports.acceptManagerRequest = async (req, res, next) => {
  // fetch the request
  const request = await ManagerRequest.findById(req.params.id);

  // assure that : the request exists .
  if (!request) {
    return next(new ApiError([$.request_not_found, req.params.id], 404, { merge: true }));
  }

  // assure that : the user has access to the request
  if (request.receiver.id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // assure that : the request is not already handled .
  if (request.status !== 'pending') {
    return next(new ApiError($.request_is_handled, 400));
  }

  // handle the acception of the request (add the user as a manager to the company)
  const result = await handleAcceptedRequest(request);
  if (result !== true) return next(result);

  // accept the request
  request.status = 'accepted';
  await request.save();

  // sending a notification to the user .
  const user = await User.findById(request.sender.id);
  const tokens = await notificationController.getTokens(user._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    const name = await getFullName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.accepted_your_request,
      tokens.idsList[0],
      { request_id: request._id.toString(), company_id: request.company.id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.accepted_your_request,
      reason: 'ManagerRequests',
      reason_id: request._id,
      notification_type: 'token',
      sent_by: req.user._id,
      receivers: tokens.idsList,
      special_data: {
        data: req.user._id,
        type: 'Users',
      },
    });
    notification.save();
  }

  // response
  return res.status(200).json({
    status: 'success',
    request,
  });
};

// @desc reject a manager request
// @route PUT /api/explore/companies/manager-requests/:id/reject
// @access (authenticted, user)

exports.rejectManagerRequest = async (req, res, next) => {
  // fetch the request
  const request = await ManagerRequest.findById(req.params.id);

  // assure that : the request exists .
  if (!request) {
    return next(new ApiError([$.request_not_found, req.params.id], 404, { merge: true }));
  }

  // assure that : the user has access to the request
  if (request.receiver.id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // assure that : the request is not already handled .
  if (request.status !== 'pending') {
    return next(new ApiError($.request_is_handled, 400));
  }

  // reject the request
  request.status = 'rejected';
  await request.save();

  // response
  return res.status(200).json({
    status: 'success',
    request,
  });
};

// @desc report a company
// @api POST /api/explore/copmanies/:id/report
// @access (authenticate, user)

exports.reportCopmany = async (req, res, next) => {
  // fetch the copmany
  const company = await Company.findById(req.params.id);

  // validate the copmany : not soft deleted and not blocked .
  const error = validCompany(company, { softDeleted: true, blocked: true }, req);
  if (error) return next(new ApiError([$.company_not_found, req.params.id], 404, { merge: true }));

  // assure that : the user did not report the company already .
  let report = await Report.findOne({
    reporter_id: req.user.id,
    reported_item_id: company._id,
    type: 'Companies',
  });
  if (report) return next(new ApiError($.you_already_reported_this_company, 409));

  // create the report
  report = new Report({
    reporter_id: req.user.id,
    reported_item_id: company._id,
    reason: req.body.reason,
    type: 'Companies',
  });

  // save the report
  await report.save();

  // increase the total reports and unhandled reports count in the company
  company.total_reports++;
  company.unhandled_reports++;
  await company.save();

  return res.status(200).json({
    status: 'success',
    messages: [tr($.the_report_successfully_sent)],
  });
};

exports.getUserCompanyExperience = async (req, res, next) => {
  // get only the request of this user .
  req.query = {
    ..._.pick(req.query, 'company_name', 'company_id', 'creatd_at'),
    verification: 'accepted',
    user_id: req.params.id,
  };

  // response
  return factory.getAll({
    Model: CompanyExperience,
    populateDeveloper: [{ path: 'company_id', select: '_id image' }],
    fieldsToOmitFromResponse: ['__v'],
    fieldsToSearch: [],
  })(req, res, next);
};
