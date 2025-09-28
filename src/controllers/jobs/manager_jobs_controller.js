// This module contains the actions that can be done by the company manager
// in terms of the ' job ' feature .

const _ = require('lodash');

const { Job } = require('../../models/jobs_model');
const Company = require('../../models/companies_model');
const JobApplication = require('../../models/job_applications_model');
const User = require('../../models/users_model');
const ApiError = require('../../utils/api_error');
const factory = require('../../helper/handlers_factory');
const validCompany = require('../../utils/validation/companies/valid_company');
const { validJob } = require('../../utils/validation/jobs/valid_job');
const processTopics = require('../../helper/new_topics_processor');
const adjustArrayParam = require('../../helper/adjust_array_param');
const tr = require('../../helper/translate');
const $ = require('../../locales/keys');
const { default: mongoose } = require('mongoose');

// @desc create a job opportunity
// @route POST /api/manager/companies/:company_id/jobs/
// @access (authneticated, user (manager authority in the company))

exports.createJob = async (req, res, next) => {
  // fetch the company .
  const company = await Company.findById(req.params.company_id);

  // validate company : not soft deleted, not blocked , and the user is a manager within it .
  const error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // adjust the company obj the will be inside the job doc .
  req.body.company = {
    id: company.id,
    name: company.name,
  };

  // adjust the publishing_manager obj that will be inside the job doc .
  req.body.publishing_manager = {
    id: req.user.id,
    name: req.user.username,
    public: req.body.public_manager ?? false,
  };

  // increast the jobs count inside the company
  company.jobs_count++;
  company.save();

  const fields = [
    'company',
    'publishing_manager',
    'title',
    'description',
    'requirements',
    'topics',
    'location',
    'languages',
    'salary',
    'work_place',
    'job_type',
    'position_level',
    'experience',
    'closes_at',
    'public_manager',
  ];

  // attach the image of the company to the repsones through callback .
  const callback = async responseData => {
    responseData.job.company.image_url = company.image?.url || null;
    responseData.job.publishing_manager.image_url = req.user.profile_image || null;
    return responseData;
  };

  // the topics are validated that they exists and are unique in the validator .
  processTopics(req.body.topics);

  // sanitize the response .
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  return await factory.createOne({ Model: Job, fields, fieldsToOmitFromResponse, callback })(
    req,
    res,
    next,
  );
};

// @desc get one company all jobs
// @route GET /api/manager/companies/:company_id/jobs/
// @access (authenticated , user ( have manager authority in the company))

exports.getAllJobs = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.company_id);

  // validate the company : exists , not soft deleted , and the user is manager within it.
  const error = validCompany(
    company,
    { softDeleted: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // pick from the request query the fields that are available
  // for searching the jobs .
  req.query = _.pick(req.query, [
    'title',
    'description',
    'requirements',
    'topics',
    'location',
    'languages',
    'salary.min',
    'salary.max',
    'salary.currency',
    'work_place',
    'job_type',
    'position_level',
    'experience',
    'applications_count',
    'closes_at',
    'closed',
    'blocked',
    'created_at',
    'page',
    'limit',
    'current_page',
  ]);

  // no more than 100 docs in a single page ( as a limit for pagination )
  // if (req.query.limit > 100) req.query.limit = 100;

  // adjust the filter fields of type array
  if (req.query.languages) {
    req.query.languages = adjustArrayParam(req.query.languages);
  }
  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }

  // adjust the 'blocked' filteration if exists
  if (req.query.blocked) {
    req.query.exists = `blocked=true`;
    delete req.query.blocked;
  }
  // adjust the closed filteration if exists .
  if (req.query.closed) {
    if (req.query.closed === 'true') req.query.closes_at = { lt: new Date().toISOString() };
    else {
      delete req.query.closes_at;
      req.query.$or = [
        { closes_at: { $exists: false } }, // closes_at field does not exist
        { closes_at: { $gte: new Date() } }, // closes_at is bigger than now
      ];
    }
  }

  // where to serach for the query parameter 'search'
  const fieldsToSearch = ['title', 'location'];

  // respond with the jobs  of the company_id only and that are not soft deleted ,
  // (in order to avoid manipulation) .
  const filterDeveloper = {
    deleted_at: '',
    'company.id': req.params.company_id, // using the index on the job
  };

  // embedd the company image inside every job .
  const callback = async responseData => {
    let jobs = responseData.jobs;
    jobs = await Promise.all(
      jobs.map(async job => {
        // const corrComp = await Company.findById(job.company.id);
        job.company.image_url = company.image?.url || null;
        const publishing_manager = await User.findById(job.publishing_manager.id);
        job.publishing_manager.image_url = publishing_manager.profile_image;
        return job;
      }),
    );
    return { ...responseData, jobs };
  };

  // sanitize the response
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  // response
  return factory.getAll({
    Model: Job,
    fieldsToSearch,
    filterDeveloper,
    fieldsToOmitFromResponse,
    callback,
  })(req, res, next);
};

// @desc get company specific job
// @route GET /api/manager/companies/:company_id/jobs/:id
// @access (authenticated, user ( has manager authority in the company))

exports.getOneJob = async (req, res, next) => {
  // fetch the job .
  let job = await Job.findById(req.params.id);

  // valildate the job : not soft deleted.
  let error = validJob(job, { softDeleted: true }, req);
  if (error) return next(error);

  // assure that : the company_id and job id are compatible
  if (job.company.id.toString() !== req.params.company_id.toString()) {
    return next(new ApiError($.the_job_id_and_company_id_does_not_match, 400));
  }

  // fetch the company .
  const company = await Company.findById(req.params.company_id);

  // validate the company : not soft deleted, and the user is manager .
  error = validCompany(
    company,
    { softDeleted: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // sanitize the response .
  job = _.omit(job.toObject(), ['__v', 'total_reports', 'unhandled_reports']);

  // attach the company image to the response .
  job.company.image = company.image?.url || null;

  const publishing_manager = await User.findById(job.publishing_manager.id);
  job.publishing_manager.image_url = publishing_manager.profile_image;

  // response
  return res.status(200).json({
    status: 'success',
    job,
  });
};

// @desc delete a job of a company
// @route DELETE /api/manager/companies/:company_id/jobs/:id
// @access (authenticted, user (has manager authority in the company, or is the founder))

exports.deleteJob = async (req, res, next) => {
  // fetch the job .
  const job = await Job.findById(req.params.id);

  // validate the job : not soft deleted .
  let error = validJob(job, { softDeleted: true }, req);
  if (error) return next(error);

  // assure that the company id and job id match
  if (job.company.id.toString() !== req.params.company_id.toString()) {
    return next(new ApiError($.the_job_id_and_company_id_does_not_match, 400));
  }

  // fetch the company .
  const company = await Company.findById(req.params.company_id);

  // validate the company : not soft deleted, not blocked and the user is manager .
  error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // assure that : the user is either the manager who posted the job or he is the founder .
  if (
    company.founder._id.toString() !== req.user.id.toString() &&
    job.publishing_manager.id.toString() !== req.user.id.toString()
  ) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // reduce the number of the jobs in the company
  company.jobs_count--;

  // delete the job .
  job.deleted_at = new Date();
  await company.save();
  await job.save();

  // response .
  return res.status(204).send();
};

// @desc close or open the application for the job
// @route PUT /api/manager/companies/:company_id/jobs/:id?option
// @access (authenticated , user (has manager authority or is the founder ))

exports.updateJobApplication = async (req, res, next) => {
  // fetch the job
  let job = await Job.findById(req.params.id);

  // validate the job : not soft deleted and not blocked .
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) return next(error);

  // assure that : the job and the company id match
  if (job.company.id.toString() !== req.params.company_id.toString()) {
    return next(new ApiError($.the_job_id_and_company_id_does_not_match, 400));
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company
  error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // assure that : the user is either the manager who posted the job or he is the founder .
  if (
    company.founder._id.toString() !== req.user.id.toString() &&
    job.publishing_manager.id.toString() !== req.user.id.toString()
  ) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // update the job
  let updatedClosesAt;
  if (req.query.option === 'close') {
    updatedClosesAt = new Date();
  } else if (req.query.option === 'update') {
    updatedClosesAt = req.body.closes_at;
  } else {
    updatedClosesAt = undefined;
  }
  job.closes_at = updatedClosesAt;
  await job.save();

  // sanitize the response
  job = _.omit(job.toObject(), ['__v', 'total_reports', 'unhandled_reports']);

  // attach the company image into the response .
  job.company.image_url = company.image?.url || null;

  const publishing_manager = await User.findById(job.publishing_manager.id);
  job.publishing_manager.image_url = publishing_manager.profile_image;

  return res.status(200).json({
    status: 'success',
    job,
  });
};

// @desc get all the applications for a job of a company
// @route GET /api/manager/companies/:company_id/jobs/:id/applications
// @access (authenticated, user)
exports.getJobApplications = async (req, res, next) => {
  // Extract the pagination params
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  // fetch the job
  const job = await Job.findById(req.params.id);

  // validate the job .
  let error = validJob(job, { softDeleted: true }, req);
  if (error) return next(error);

  // assure that : the job id and the company id does match
  if (job.company.id.toString() !== req.params.company_id.toString()) {
    return next(new ApiError($.the_job_id_and_company_id_does_not_match, 400));
  }

  // fetch the company
  const company = await Company.findById(req.params.company_id);

  // validate the company : not soft deleted and the user is manager .
  error = validCompany(
    company,
    { softDeleted: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  const pipeline = [
    {
      $match: {
        job_id: job._id,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'profiles',
        localField: 'user.profile_id',
        foreignField: '_id',
        as: 'profile',
      },
    },
    { $unwind: '$profile' },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          {
            $project: {
              checked: 1,
              'user._id': 1,
              'user.username': 1,
              'user.email': 1,
              'user.profile_image': 1,
              'profile._id': 1,
              'profile.bio': 1,
              'profile.full_name': 1,
            },
          },
          { $skip: skip },
          { $limit: limit },
        ],
      },
    },
    { $unwind: '$metadata' },
    {
      $project: {
        total_count: '$metadata.total',
        data: 1,
      },
    },
  ];

  const aggregation = await JobApplication.aggregate(pipeline);

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
    },
    job_applications: aggregation[0]?.data || [],
  };

  return res.status(200).json(response);
};

// @desc mark an application to the job as checked .
// @route PUT /api/manager/companies/:company_id/jobs/:id/applications/:application_id/mark?check=true
// @access (authenticated, user)
exports.markApplicationAsChecked = async (req, res, next) => {
  // fetch the job
  let job = await Job.findById(req.params.id);

  // validate the job : not soft deleted and not blocked .
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) return next(error);

  // assure that : the job and the company id match
  if (job.company.id.toString() !== req.params.company_id.toString()) {
    return next(new ApiError($.the_job_id_and_company_id_does_not_match, 400));
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company
  error = validCompany(
    company,
    { softDeleted: true, blocked: true, userIsManager: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // assure that : the user is either the manager who posted the job or he is the founder .
  if (
    company.founder._id.toString() !== req.user.id.toString() &&
    job.publishing_manager.id.toString() !== req.user.id.toString()
  ) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // fetch the application .
  const app = await JobApplication.findById(req.params.application_id);

  // assure that : the application exists
  if (!app) {
    return next(new ApiError($.no_job_application_was_found, 404));
  }

  const check = req.query.check === 'false' ? false : true;
  app.checked = check;
  await app.save();

  const message = check
    ? $.the_application_successfully_marked_as_checked
    : $.the_application_successfully_unmarked;

  return res.status(200).json({
    status: 'success',
    messages: [tr(message)],
  });
};

exports.statistics = async (req, res, next) => {
  let { start_date, end_date } = req.query;

  end_date = new Date(end_date);
  end_date.setDate(end_date.getDate() + 1);

  let result = await Job.aggregate([
    {
      $match: {
        'company.id': new mongoose.Types.ObjectId(req.params.company_id),
        blocked: { $exists: false },
        deleted_at: { $exists: false },
        created_at: {
          $gte: new Date(start_date),
          $lte: new Date(end_date),
        },
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company.id',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: '$company' },
    {
      $match: {
        'company.blocked': { $exists: false },
        'company.deleted_at': { $exists: false },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'company.founder._id',
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
      $group: {
        _id: null,
        total_application_count: { $sum: '$applications_count' },
        max_application_count: { $max: '$applications_count' },
        min_application_count: { $min: '$applications_count' },
        jobs_count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        total_application_count: 1,
        max_application_count: 1,
        min_application_count: 1,
        average_application_count: {
          $round: [{ $divide: ['$total_application_count', '$jobs_count'] }, 0],
        },
        jobs_count: 1,
      },
    },
  ]);

  const response = {
    status: 'success',
    ...(result.length !== 0
      ? { statiscs: result[0] }
      : { messages: [tr($.no_statistics_for_this_interval)] }),
  };

  return res.status(200).json(response);
};
