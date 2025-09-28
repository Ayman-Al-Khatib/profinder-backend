// This module contains the actions that can be done by the admins
// in terms of the ' job ' feature

const _ = require('lodash');

const { Job } = require('../../models/jobs_model');
const Company = require('../../models/companies_model');
const User = require('../../models/users_model');
const Report = require('../../models/posts_and_related/reports_model');
const documentsCounter = require('../../helper/documents_counter');
const factory = require('../../helper/handlers_factory');
const ApiError = require('../../utils/api_error');
const validCompany = require('../../utils/validation/companies/valid_company');
const { validJob } = require('../../utils/validation/jobs/valid_job');
const adjustArrayParam = require('../../helper/adjust_array_param');
const $ = require('../../locales/keys');

// @desc get all jobs
// @route /api/admin/jobs/
// @access (authenticated, admin)

exports.getAllJobs = async (req, res, next) => {
  // specify the fields that the admin can filter on
  const fields = [
    'title',
    'location',
    'topics',
    'company.name',
    'company.id',
    'languages',
    'salary.min',
    'salary.max',
    'salary.currency',
    'job_type',
    'position_levels',
    'experience',
    'work_place',
    'blocked.blocked_at',
    'closes_at',
    'deleted_at',
    'exists',
    'closed',
    'sort',
    'total_reports',
    'unhandled_reports',
    'page',
    'limit',
    'current_page',
  ];

  // pick only these fields from the query
  req.query = _.pick(req.query, fields);

  // adjust the filter fields of type array (if exists)
  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }
  if (req.query.languages) {
    req.query.languages = adjustArrayParam(req.query.languages);
  }

  let developerSort, developerProjection, filterDeveloper;

  // adjust the 'closed' filter if exists .
  if (req.query.closed !== undefined) {
    filterDeveloper =
      req.query.closed === 'true'
        ? { closes_at: { $lt: new Date() } } // closes at less than now .
        : {
            $or: [
              { closes_at: { $exists: false } }, // closes_at field does not exist
              { closes_at: { $gte: new Date() } }, // closes_at is bigger than now
            ],
          };
  }

  // if the 'title' filter exists , use the text index .
  if (req.query.title) {
    const title = req.query.title;
    delete req.query.title;

    filterDeveloper = { ...filterDeveloper, $text: { $search: title } };
    developerProjection = { score: { $meta: 'textScore' } };
    developerSort = { score: { $meta: 'textScore' } };
  }

  // attach the company image for each job .
  const callback = async responseData => {
    let jobs = responseData.jobs;
    jobs = await Promise.all(
      jobs.map(async job => {
        const comp = await Company.findById(job.company.id);
        job.company.image_url = comp.image?.url || null;

        const publishing_manager = await User.findById(job.publishing_manager.id);
        job.publishing_manager.image_url = publishing_manager.profile_image || null;

        return job;
      }),
    );
    return { ...responseData, jobs };
  };

  // sanitize the response
  const fieldsToOmitFromResponse = ['__v', 'score'];

  return factory.getAll({
    Model: Job,
    fieldsToOmitFromResponse,
    filterDeveloper,
    developerProjection,
    developerSort,
    callback,
  })(req, res, next);
};

// @desc get one jobs
// @route GET /api/admin/jobs/:id
// @access (authenticated, admin)

exports.getJob = async (req, res, next) => {
  // fetch the job
  let job = await Job.findById(req.params.id);

  // assure that : the jobs does exist .
  if (!job) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // attach the image of the company to the job
  const company = await Company.findById(job.company.id);
  job = job.toObject();
  job.company.image_url = company.image?.url || null;

  const publishing_manager = await User.findById(job.publishing_manager.id);
  job.publishing_manager.image_url = publishing_manager.profile_image || null;

  return res.status(200).json({
    status: 'success',
    job,
  });
};

// @desc block one job
// @route PUT /api/admin/jobs/:id/block
// @access (authenticated, admin (company manager role))

exports.blockJob = async (req, res, next) => {
  // fetch the job
  const job = await Job.findById(req.params.id);

  // assure that : the job does exist
  if (!job) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // the job is soft deleted => inform the admin
  if (job.deleted_at) {
    return next(new ApiError($.job_is_soft_deleted, 400));
  }

  // assure that : the job is not already blocked
  if (job.blocked) {
    return next(new ApiError([$.job_is_already_blocked, req.params.id], 409, { merge: true }));
  }

  // block the job
  job.blocked = {
    blocked_at: new Date(),
    responsibile_support_id: req.admin.id,
    responsibile_support_name: req.admin.username,
  };
  await job.save();

  return res.status(200).json({
    status: 'success',
    job,
  });
};

// @desc unblock a job
// @route PUT /api/admin/jobs/:id/unblock
// @access (authenticated, admin (company manager role))

exports.unblockJob = async (req, res, next) => {
  // fetch the job
  let job = await Job.findById(req.params.id);

  // assure that : the job does exist
  if (!job) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that: the job is not softdeleted
  if (job.deleted_at) {
    return next(new ApiError($.job_is_soft_deleted_so_there_is_no_reason_to_unblock_it, 400));
  }

  // assure that : the job is indeed blocked
  if (!job.blocked) {
    return next(new ApiError($.job_is_not_blocked, 409));
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // assure that : the company of the job is not blocked
  const error = validCompany(company, { blocked: true }, { params: job.company.id });
  if (error) return next(new ApiError($.the_job_company_is_blocked, 400));

  // unblock the job
  job.blocked = undefined;
  await job.save();

  return res.status(200).json({
    status: 'success',
    job,
  });
};

// @desc get job and its reports
// @route GET /api/admin/jobs/:id/with-reports
// @access (authenticated, user)

exports.getJobAndReports = async (req, res, next) => {
  // fethc the job
  let job = await Job.findById(req.params.id);
  const error = validJob(job, {}, req);
  if (error) return next(error);

  // attach the company and publishing manager image
  const company = await Company.findById(job.company.id);
  job = job.toObject();
  job.company.image_url = company.image?.url || null;

  const publishing_manager = await User.findById(job.publishing_manager.id);
  job.publishing_manager.image_url = publishing_manager.profile_image || null;

  const filterDeveloper = {
    reported_item_id: req.params.id,
    type: 'Jobs',
  };

  const developerSort = 'created_at';

  const callback = async responseData => {
    const message = responseData.message;
    const status = responseData.status;
    delete responseData.message;
    delete responseData.success;
    return {
      message,
      status,
      job,
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

// @desc count jobs with specific filteration
// @route GET  /api/admin/jobs/count
// @access (authenticated, admin)
exports.countJobs = async (req, res) => {
  const count = await documentsCounter({ Model: Job, query: req.query });

  return res.status(200).json({
    status: 'success',
    jobs_count: count,
  });
};

// @desc get the jobs that has the heighest application count this month
// @route GET /api/admin/jobs/most-popular
// @access (authenticated, admin)
exports.mostPopular = async (req, res) => {
  const pipeline = [
    {
      $match: {
        // published this month .
        created_at: { $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) },
        blocked: { $exists: false },
        deleted_at: { $exists: false },
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
      $lookup: {
        from: 'users',
        localField: 'publishing_manager.id',
        foreignField: '_id',
        as: 'publisher',
      },
    },
    { $unwind: '$publisher' },
    {
      $addFields: {
        'company.image_url': '$company.image.url',
        'company.id': '$company._id',
        'publishing_manager.image_url': '$publisher.profile_image',
      },
    },
    {
      $sort: { applications_count: -1 },
    },
    {
      $limit: 10,
    },
    {
      $project: {
        'company.id': 1,
        'company.name': 1,
        'company.image_url': 1,
        'publishing_manager.id': 1,
        'publishing_manager.public': 1,
        'publishing_manager.name': 1,
        'publishing_manager.image_url': 1,
        title: 1,
        description: 1,
        requirements: 1,
        topics: 1,
        languages: 1,
        salary: 1,
        work_place: 1,
        job_type: 1,
        position_level: 1,
        experience: 1,
        applications_count: 1,
        closes_at: 1,
        created_at: 1,
        update_at: 1,
      },
    },
  ];

  const result = await Job.aggregate(pipeline);

  return res.status(200).json({
    status: 'success',
    jobs: result,
  });
};

// @desc get the average salary of the jobs that have specific topic
// @route GET /api/admin/jobs/average-salary/
// @access (authenticated, admin)
exports.averageSalary = async (req, res) => {
  const topic = req.query.topic;
  const currency = req.query.currency;

  const pipeline = [
    {
      $match: {
        // published 6 months ago or later
        created_at: { $gte: new Date(new Date() - 6 * 30 * 24 * 60 * 60 * 1000) },
        // has the specific topic
        topics: {
          $in: [topic],
        },
        $or: [
          { 'salary.currency': { $regex: currency, $options: 'i' } },
          { 'salary.currency': currency },
        ],
        blocked: { $exists: false },
        deleted_at: { $exists: false },
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
        totalMinSalary: { $sum: '$salary.min' },
        totalMaxSalary: { $sum: '$salary.max' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        min_salary_average: { $divide: ['$totalMinSalary', '$count'] },
        max_salary_average: { $divide: ['$totalMaxSalary', '$count'] },
        salary_average: {
          $avg: [
            { $divide: ['$totalMinSalary', '$count'] },
            { $divide: ['$totalMaxSalary', '$count'] },
          ],
        },
        jobs_surveyed: '$count',
      },
    },
  ];

  const result = await Job.aggregate(pipeline);

  const response =
    result.length === 0
      ? { status: 'success', messages: ['No Jobs With this currency was found'] }
      : result;

  return res.status(200).json(response);
};
