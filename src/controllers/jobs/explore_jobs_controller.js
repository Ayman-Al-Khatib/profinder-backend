// this module contains the actions that can be done by the explore user
// in terms of the 'job' feature .

const _ = require('lodash');

const { Job } = require('../../models/jobs_model');
const Company = require('../../models/companies_model');
const CompanyBlock = require('../../models/company_blocks_model');
const JobApplication = require('../../models/job_applications_model');
const Report = require('../../models/posts_and_related/reports_model');
const User = require('../../models/users_model');
const SavedJob = require('../../models/saved_jobs_model');
const notificationController = require('../../service/notifications_service.js');
const getName = require('../../helper/get_full_name.js');
const ApiError = require('../../utils/api_error');
const validCompany = require('../../utils/validation/companies/valid_company');
const { validJob, jobIsClosed } = require('../../utils/validation/jobs/valid_job');
const buildFilterWithMerge = require('../../helper/build_filter_with_merge');
const convertValues = require('../../helper/convert_values');
const factory = require('../../helper/handlers_factory');
const tr = require('../../helper/translate');
const adjustArrayParam = require('../../helper/adjust_array_param');
const $ = require('../../locales/keys');
const { default: mongoose } = require('mongoose');
const moreSuggestion = require('../../helper/more_suggestions');

const MULTI_JOB_PIPELINE = (filter, skip, limit) => [
  {
    $match: {
      ...filter,
    },
  },
  {
    $lookup: {
      from: 'jobs',
      localField: 'job_id',
      foreignField: '_id',
      as: 'job',
    },
  },
  { $unwind: '$job' },
  {
    $match: {
      'job.blocked': { $exists: false },
      'job.deleted_at': { $exists: false },
    },
  },
  {
    $lookup: {
      from: 'companies',
      localField: 'job.company.id',
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
  {
    $unwind: '$founder',
  },
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
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
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

const SEARCH_PIPELINE = (title, limit, skip) => [
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
      as: 'publishing_manager_details',
    },
  },
  { $unwind: '$publishing_manager_details' },
  {
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        {
          $project: {
            ...(title ? { score: { $meta: 'textScore' } } : {}),
            total_reports: 0,
            unhandled_reports: 0,
            founder: 0,
            __v: 0,
          },
        },
        {
          $sort: {
            ...(title ? { score: { $meta: 'textScore' } } : {}),
            created_at: -1,
          },
        },
        { $skip: skip },
        { $limit: limit },
        { $project: { score: 0 } },
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

const jobAdjust = async (job, req) => {
  // if the publishing manager is not public => delete it .
  if (!job.publishing_manager.public) {
    delete job.publishing_manager;
  } else {
    // else adjust it .
    job.publishing_manager = {
      id: job.publishing_manager_details._id,
      name: job.publishing_manager_details.username,
      image_url: job.publishing_manager_details.profile_image,
      public: true,
    };
  }
  delete job.publishing_manager_details;
  // adjust the job company
  job.company = {
    id: job.company._id,
    name: job.company.name,
    image_url: job.company.image?.url,
  };
  const app = await JobApplication.findOne({ user_id: req.user.id, job_id: job._id });
  job.applied = app !== null;
  return job;
};

// @desc search for jobs
// @route GET /api/explore/jobs/search
// @access (authenticted, user)

exports.searchJobs = async (req, res, next) => {
  // Extract the pagination params
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  // main searching params .
  let { title } = req.query;
  let matchFilters = {};
  // adjust the topic filteration array
  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }
  // extract the filteration query params
  // and adjust them ( to work with aggregate properly )
  const fields = [
    // 'title',
    'topics',
    'location',
    'company.name',
    'languages',
    'salary.min',
    'salary.max',
    'salary.currency',
    'job_type',
    'position_levels',
    'experience',
    'work_place',
  ];
  req.query = _.pick({ ...req.query }, fields);
  req.query = buildFilterWithMerge(req.query, Job, null);
  req.query = convertValues(req.query);

  // if there are no searching params => send suggestions
  // depending on the user preferences .
  const suggestions = Object.keys(req.query).length === 0 && !title && !req.query.topics;
  if (suggestions) return jobSuggestions(req, res, next, limit, skip, page);

  // specify the returned jobs
  matchFilters = {
    ...matchFilters,
    deleted_at: { $exists: false },
    blocked: { $exists: false },
    $or: [
      { closes_at: { $exists: false } }, // closes_at field does not exist
      { closes_at: { $gte: new Date() } }, // closes_at is bigger than now
    ],
    ...req.query,
  };
  // now construct the pipeline
  let pipeline = [];

  // if title filter exists , it should be the first in the pipeline .
  if (title) {
    pipeline.push(
      { $match: { $text: { $search: title } } },
      { $addFields: { score: { $meta: 'textScore' } } },
    );
  }

  // add the match Filters
  pipeline.push({ $match: matchFilters });

  pipeline = [...pipeline, ...SEARCH_PIPELINE(title, limit, skip)];

  const aggregation = await Job.aggregate(pipeline);

  let resultArr = [];
  if (aggregation[0]?.data) {
    resultArr = await Promise.all(aggregation[0]?.data.map(job => jobAdjust(job, req)));
  }

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
    },
    jobs: resultArr,
  };
  return res.status(200).json(response);
};

// @desc get all jobs for one company
// @route GET /api/explore/jobs/company/:id
// @access (authenticted, user)

exports.getCompanyJobs = async (req, res, next) => {
  // specify the fields that the user can use in filtering this company jobs
  const fields = [
    'title',
    'location',
    'topics',
    'languages',
    'salary.min',
    'salary.max',
    'salary.currency',
    'job_type',
    'position_levels',
    'experience',
    'work_place',
    'page',
    'limit',
    'current_page',
  ];

  // extract the previous fields only
  req.query = _.pick(req.query, fields);

  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate the company: not soft deleted and not blocked .
  const error = validCompany(company, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(new ApiError([$.company_not_found, req.params.id], 404, { merge: true }));
  }

  // adjust the filter fields of type array .
  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }
  if (req.query.languages) {
    req.query.langauges = adjustArrayParam(req.query.languages);
  }

  // we want to retrieve the jobs that has these specifications:
  const filterDeveloper = {
    'company.id': req.params.id,
    $or: [
      { closes_at: { $exists: false } }, // closes_at field does not exist
      { closes_at: { $gte: new Date() } }, // closes_at is bigger than now
    ], // and both means that the job is open to be applied for
    deleted_at: { $exists: false }, // is not soft deleted
    blocked: { $exists: false }, // is not blocked
  };

  // we want to retrieve the jobs in descending order
  // in terms of the time of publish .
  req.query.sort = '-created_at';

  // embedd the company image inside every job .
  // also , delete the publishing_manager if it is not public .
  const callback = async responseData => {
    let jobs = responseData.jobs;
    jobs = await Promise.all(
      jobs.map(async job => {
        // attach the image of the company
        job.company.image_url = company.image?.url || null;

        // if the publishing manager not public => delete it
        if (!job.publishing_manager.public) {
          delete job.publishing_manager;
        } else {
          // attach the image of the manager
          const user = await User.findById(job.publishing_manager.id);
          job.publishing_manager.image_url = user.profile_image || null;
        }

        // did the user applied for this job ?
        const userApplied = await JobApplication.findOne({ user_id: req.user.id, job_id: job._id });
        job.applied = userApplied !== null;

        return job;
      }),
    );
    return { ...responseData, jobs };
  };

  // sanitize the response .
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  // response .
  return factory.getAll({
    Model: Job,
    fieldsToOmitFromResponse,
    filterDeveloper,
    callback,
  })(req, res, next);
};

// @desc get specifc job
// @route GET /api/explore/jobs/:id
// @access (authenticated, user)

exports.getJob = async (req, res, next) => {
  // fetch the job
  let job = await Job.findById(req.params.id);

  // validate the job : not softdeleted, not blocked and not closed for application .
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company : not softdeleted and not blocked .
  error = validCompany(
    company,
    { softDeleted: true, blocked: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  job = job.toObject();

  // embedd the company image into the job
  job.company.image_url = company.image?.url || null;

  // if the publishing manager is not public , delete it
  if (!job.publishing_manager.public) delete job.publishing_manager;
  else {
    // attach his image into the job
    const user = await User.findById(job.publishing_manager.id);
    job.publishing_manager.image_url = user.profile_image || null;
  }

  // did the user applied for this job ?
  const userApplied = await JobApplication.findOne({ user_id: req.user.id, job_id: job._id });
  job.applied = userApplied !== null;

  const userSaved = await SavedJob.findOne({ user_id: req.user.id, job_id: job._id });
  job.saved = userSaved !== null;

  // sanitize the response
  job = _.omit(job, ['__v', 'total_reports', 'unhandled_reports']);

  return res.status(200).json({
    status: 'success',
    job,
  });
};

// @desc apply for a job
// @route POST /api/explore/jobs/:id/apply
// @access (authenticated, user)

exports.applyForJob = async (req, res, next) => {
  // fetch the job
  const job = await Job.findById(req.params.id);

  // validate the job : not soft deleted and not blocked .
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the job is not closed
  if (jobIsClosed(job)) {
    return next(new ApiError($.the_job_is_closed, 403));
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company : not soft deleted and not blocked .
  error = validCompany(
    company,
    { softDeleted: true, blocked: true },
    { ...req, params: { id: req.params.company_id } },
  );
  if (error) return next(error);

  // assure that : the user is not blocked from the company
  const block = await CompanyBlock.findOne({ user_id: req.user.id, company_id: company._id });
  if (block) return next(new ApiError($.you_are_blocked_from_this_company, 403));

  // assure that : the user has not already applied for the job .
  let application = await JobApplication.findOne({ user_id: req.user.id, job_id: job._id });
  if (application) {
    return next(new ApiError($.you_already_applied_for_this_job, 409));
  }

  // apply for the job .
  application = await JobApplication.create({
    user_id: req.user.id,
    job_id: job._id,
  });

  job.applications_count++;
  await job.save();

  if (job.applications_count % 50 === 0) {
    // sending a notification to the user .
    const user = await User.findById(job.publishing_manager.id);
    const tokens = await notificationController.getTokens(user._id.toString());
    if (tokens && tokens.idsList.length > 0) {
      notificationController.sendNotificationToSingleToken(
        tokens.tokensList[0],
        $.more_appliers,
        $.more_appliers_50,
        tokens.idsList[0],
        { company_id: company._id.toString(), job_id: job._id.toString() },
      );
    }
  }

  // response
  return res.status(200).json({
    status: 'success',
    messages: [tr($.you_successfully_applied_for_the_job)],
  });
};

// @desc cancel appllication for a job
// @route DELETE /api/explore/jobs/:id/cancel-apply
// @access (authenticated, user)

exports.cancelApplyForJob = async (req, res, next) => {
  // fetch the application
  const application = await JobApplication.findOne({ user_id: req.user.id, job_id: req.params.id });
  if (!application) {
    return next(new ApiError($.you_didnt_applied_for_this_job, 409));
  }

  // fetch the job
  const job = await Job.findById(req.params.id);

  // assure that : the job is not closed
  if (jobIsClosed(job)) {
    return next(new ApiError($.the_job_is_closed, 403));
  }

  // delete the application .
  await JobApplication.findByIdAndDelete(application._id);

  job.applications_count--;
  await job.save();

  // response .
  return res.status(200).json({
    status: 'success',
    message: [tr($.you_successfully_canceled_apply_for_this_job)],
  });
};

// @desc get all jobs I am applying .
// @route GET /api/explore/jobs/my-applications
// @access (authenticated, user)

exports.getAllApplyingJobs = async (req, res) => {
  // extract the pagination params if exists
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const user_id = new mongoose.Types.ObjectId(req.user.id);
  const pipeline = MULTI_JOB_PIPELINE({ user_id }, skip, limit);

  const aggregation = await JobApplication.aggregate(pipeline);

  const resultArr = aggregation[0]?.data.map(app => {
    return {
      applied_at: app.created_at,
      job: {
        id: app.job._id,
        title: app.job.title,
      },
      company: {
        id: app.company._id,
        name: app.company.name,
        image_url: app.company.image?.url,
      },
    };
  });

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
    },
    job_applications: resultArr || [],
  };

  return res.status(200).json(response);
};

// @desc report a job
// @api POST /api/explore/jobs/:id/report
// @access (authenticate, user)

exports.reportJob = async (req, res, next) => {
  // fetch the job
  const job = await Job.findById(req.params.id);

  // validate the job : not soft deleted and not blocked
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company : not soft deleted and not blocked
  error = validCompany(
    company,
    { softDeleted: true, blocked: true },
    { params: { id: job.company.id } },
  );
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the use did not reported the job already .
  let report = await Report.findOne({
    reporter_id: req.user.id,
    reported_item_id: job._id,
    type: 'Jobs',
  });
  if (report) return next(new ApiError($.you_already_reported_this_job, 409));

  // create the report
  report = new Report({
    reporter_id: req.user.id,
    reported_item_id: job._id,
    reason: req.body.reason,
    type: 'Jobs',
  });

  // save the report
  await report.save();

  // increase the total reports and unhandled reports count
  job.total_reports++;
  job.unhandled_reports++;
  await job.save();

  return res.status(200).json({
    status: 'success',
    msg: [tr($.the_report_successfully_sent)],
  });
};

// @desc save a job
// @route POST /api/explore/jobs/:id/save
// @access (authenticated, user)
exports.saveJob = async (req, res, next) => {
  // fetch the job .
  const job = await Job.findById(req.params.id);

  // validate the job : not deleted nor blocked .
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company : not deleted nor blocked .
  error = validCompany(
    company,
    { softDeleted: true, blocked: true },
    { params: { id: company._id } },
  );
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the user did not save the job already
  let savedJob = await SavedJob.findOne({ job_id: job._id, user_id: req.user.id });
  if (savedJob) {
    return next(new ApiError($.you_already_saved_this_job, 409));
  }

  // create the save
  savedJob = await SavedJob.create({
    job_id: job._id,
    user_id: req.user.id,
  });

  return res.status(200).json({
    status: 'success',
    messages: [tr($.job_saved_successfully)],
  });
};

// @desc unsave the job
// @route DELETE /api/explore/jobs/:id/unsave
// @access (authenticated, user)
exports.unsaveJob = async (req, res, next) => {
  // fetch the job
  const job = await Job.findById(req.params.id);

  // validate the job : not deleted nor blocked
  let error = validJob(job, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the company
  const company = await Company.findById(job.company.id);

  // validate the company : not deleted and not blocked
  error = validCompany(
    company,
    { softDeleted: true, blocked: true },
    { params: { id: company._id } },
  );
  if (error) {
    return next(
      new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the user is indeed saving this job
  const savedJob = await SavedJob.findOne({ job_id: job._id, user_id: req.user.id });
  if (!savedJob) {
    return next(new ApiError($.this_job_is_not_saved_already, 409));
  }

  // delete the saved job.
  await SavedJob.findByIdAndDelete(savedJob._id);

  return res.status(204).send();
};

// @desc get user saved jobs
// @route GET /api/explore/jobs/saved-jobs
// @access (authenticated, user)
exports.savedJobs = async (req, res) => {
  // extract the pagination params if exists
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const user_id = new mongoose.Types.ObjectId(req.user.id);
  const pipeline = MULTI_JOB_PIPELINE({ user_id }, skip, limit);

  const aggregation = await SavedJob.aggregate(pipeline);

  const resultArr = aggregation[0]?.data.map(app => {
    return {
      saved_at: app.created_at,
      job: {
        id: app.job._id,
        title: app.job.title,
      },
      company: {
        id: app.company._id,
        name: app.company.name,
        image_url: app.company.image?.url,
      },
    };
  });

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
    },
    saved_jobs: resultArr || [],
  };

  return res.status(200).json(response);
};

async function jobSuggestions(req, res, next, limit, skip, page) {
  const title = req.user.interests?.join(' ');

  let pipeline = [
    {
      $match: {
        $or: [{ $text: { $search: title } }, { topics: { $in: req.user.interests } }],
      },
    },
    { $addFields: { score: { $meta: 'textScore' } } },
    {
      $match: {
        deleted_at: { $exists: false },
        blocked: { $exists: false },
        $or: [
          { closes_at: { $exists: false } }, // closes_at field does not exist
          { closes_at: { $gte: new Date() } }, // closes_at is bigger than now
        ],
      },
    },
    ...SEARCH_PIPELINE(title, limit, skip),
  ];

  const aggregation = await Job.aggregate(pipeline);

  let data = aggregation[0]?.data || [];
  const totalCount = aggregation[0]?.total_count || 0;

  const pagesCovered = totalCount / limit; // the suggestions covers x pages .

  if (data?.length === limit) {
    data = await Promise.all(data.map(job => jobAdjust(job, req)));
    return res.status(200).json({
      pagination: {
        page,
        limit,
        count: data.length,
      },
      jobs: data,
    });
  }

  let l = data?.length > 0 ? limit - data?.length : limit;
  let s = Math.floor(page - Math.floor(pagesCovered) - 1) * l;
  if (Math.ceil(1 + pagesCovered) === page) s -= pagesCovered * 10;

  const randoms = await Job.aggregate([
    {
      $match: {
        deleted_at: { $exists: false },
        blocked: { $exists: false },
        $or: [
          { closes_at: { $exists: false } }, // closes_at field does not exist
          { closes_at: { $gte: new Date() } }, // closes_at is bigger than now
        ],
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
        as: 'publishing_manager_details',
      },
    },
    { $unwind: '$publishing_manager_details' },
    {
      $project: {
        total_reports: 0,
        unhandled_reports: 0,
        founder: 0,
        __v: 0,
      },
    },
    {
      $sort: {
        created_at: -1,
      },
    },
    { $skip: s },
    { $limit: l },
  ]);
  
  data = [...data, ...randoms];
  data = await Promise.all(data.map(job => jobAdjust(job, req)));

  return res.status(200).json({
    pagination: {
      page,
      limit,
      count: data.length,
    },
    jobs: data,
  });
}
