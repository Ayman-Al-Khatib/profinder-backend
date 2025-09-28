const _ = require('lodash');
const mongoose = require('mongoose');

const User = require('../../models/users_model');
const FreelanceProject = require('../../models/freelance_projects_model');
const FreelanceApplication = require('../../models/freelance_applications_model');
const Report = require('../../models/posts_and_related/reports_model');
const SavedProject = require('../../models/saved_projects_model');
const factory = require('../../helper/handlers_factory');
const validProject = require('../../utils/validation/freelance_projects/validate_project');
const ApiError = require('../../utils/api_error');
const buildFilterWithMerge = require('../../helper/build_filter_with_merge');
const convertValues = require('../../helper/convert_values');
const adjustArrayParam = require('../../helper/adjust_array_param');
const tr = require('../../helper/translate');
const $ = require('../../locales/keys');

const MULTI_FREELANCE_PIPELINE = (filter, skip, limit) => [
  {
    $match: {
      ...filter,
    },
  },
  {
    $lookup: {
      from: 'freelanceprojects',
      localField: 'project_id',
      foreignField: '_id',
      as: 'project',
    },
  },
  { $unwind: '$project' },
  {
    $match: {
      'project.blocked': { $exists: false },
      'project.deleted_at': { $exists: false },
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'project.publisher_id',
      foreignField: '_id',
      as: 'publisher',
    },
  },
  { $unwind: '$publisher' },
  {
    $match: {
      'publisher.blocked': { $exists: false },
      'publisher.deleted_at': { $exists: false },
    },
  },
  {
    $lookup: {
      from: 'profiles',
      localField: 'project.publisher_id',
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

const SEARCH_PIPELINE = (title, skip, limit) => [
  {
    $lookup: {
      from: 'users',
      localField: 'publisher_id',
      foreignField: '_id',
      as: 'publisher',
    },
  },
  { $unwind: '$publisher' },
  {
    $match: {
      'publisher.blocked': { $exists: false }, // the publisher is not blocked .
      'publisher.deleted_at': { $exists: false }, // the publisher is not deleted .
    },
  },
  {
    $addFields: {
      publisher_name: '$publisher.username', // get the publisher name
      publisher_image_url: '$publisher.profile_image', // get the publisher image
    },
  },
  {
    $lookup: {
      from: 'profiles',
      localField: 'publisher_id',
      foreignField: '_id',
      as: 'profile',
    },
  },
  { $unwind: '$profile' },
  {
    $addFields: {
      publisher_fullname: '$profile.full_name',
    },
  },
  {
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        {
          $project: {
            // get the match text score to sort depending on it .
            ...(title ? { score: { $meta: 'textScore' } } : {}),
            total_reports: 0,
            unhandled_reports: 0,
            publisher: 0,
            profile: 0,
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

const adjustProject = async (project, req) => {
  const app = await FreelanceApplication.findOne({
    user_id: req.user.id,
    project_id: project._id,
  });
  project.applied = app !== null;
  return project;
};

// @desc search freelance projects
// @route GET /api/explore/freelance-projects/search
// @access (authenticated, user)

exports.searchFreelance = async (req, res, next) => {
  // Extract the pagination params
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  // Extract the search params
  let { title, topics } = req.query;

  let matchFilters = {};

  // adjust the filterations coming from the user .
  if (topics) {
    topics = adjustArrayParam(topics);
    matchFilters.topics = topics;
  }

  req.query = _.pick(req.query, [
    'budget.min',
    'budget.max',
    'working_interval.min',
    'working_interval.max',
    'budget_currency.min',
    'budget_currency.max',
  ]);
  req.query = buildFilterWithMerge(req.query, FreelanceProject, null);
  req.query = convertValues(req.query);

  const suggestions = Object.keys(req.query).length === 0 && !title && !topics;
  if (suggestions) return projectSuggestions(req, res, next, limit, skip, page);

  // set the specifications of the returned projects
  matchFilters = {
    ...matchFilters,
    deleted_at: { $exists: false }, // don't include deleted projects
    blocked: { $exists: false }, // don't include blocked projects
    status: 'open', // only the open of apply projects
    ...req.query,
  };

  // now contruct the pipeline .
  let pipeline = [];

  // If there is a title filter, add the text search stages
  // and it should be in the first of the pipeline .
  if (title) {
    pipeline.push(
      { $match: { $text: { $search: title } } },
      { $addFields: { score: { $meta: 'textScore' } } },
    );
  }
  // Add the match filters
  pipeline.push({ $match: matchFilters });
  pipeline = [...pipeline, ...SEARCH_PIPELINE(title, skip, limit)];

  // perform the aggregation .
  const aggregation = await FreelanceProject.aggregate(pipeline);

  let results = [];
  if (aggregation[0]?.data) {
    results = await Promise.all(aggregation[0]?.data.map(p => adjustProject(p, req)));
  }

  // adjust the response .
  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
    },
    freelance_projects: results || [],
  };

  return res.status(200).json(response);
};

// @desc get one project
// @route GET /api/explore/freelance-projects/:id
// @access (authenticated, user)
exports.getOneProject = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);

  // validate the project : not soft deleted and not blocked .
  const error = validProject(project, { softDeleted: true, blocked: true }, req);
  if (error)
    return next(new ApiError([$.freelance_project_not_found, req.params.id], 404, { merge: true }));

  // assure that : the publihser of this project is not blocked nor deleted .
  const publisher = await User.findById(project.publisher_id).populate({
    path: 'profile_id',
    select: 'full_name',
  });
  if (!publisher || publisher.blocked || publisher.deleted_at)
    return next(new ApiError([$.freelance_project_not_found, req.params.id], 404, { merge: true }));

  // attach the publisher name and image into the project
  project = project.toObject();
  project.publisher_name = publisher.username;
  project.publisher_image_url = publisher.profile_image;
  project.publisher_full_name = publisher.profile_id.full_name;

  // attach the executor name and image (if exists)
  if (project.done_by) {
    const executor = await User.findById(project.done_by).populate({
      path: 'profile_id',
      select: 'full_name',
    });
    if (executor && !executor.deleted_at && !executor.blocked) {
      project.executor_name = executor.username;
      project.executor_image_url = executor.profile_image;
      project.executor_full_name = executor.profile_id.full_name;
    }
  }

  const application = await FreelanceApplication.findOne({
    user_id: req.user.id,
    project_id: project._id,
  });

  const saved = await SavedProject.findOne({ user_id: req.user.id, project_id: project._id });

  // sanitize the reponse
  project = _.omit(project, ['__v', 'total_reports', 'unhandled_reports']);
  project.applied = application !== null;
  project.saved = saved !== null;

  return res.status(200).json({
    status: 'success',
    project,
  });
};

// @desc get one publisher projects
// @route GET /api/explore/freelance-projects/publisher/:id
// @access (autehnticated, user)
exports.getPublisherProjects = async (req, res, next) => {
  // fetch the publisher
  const publisher = await User.findById(req.params.id);

  // assure that : the publisher is not deleted nor blocked
  if (!publisher || publisher.blocked || publisher.deleted_at) {
    return next(new ApiError($.user_not_found, 404));
  }

  // specify the fields the user can use in filteration
  req.query = _.pick(req.query, ['title', 'status', 'page', 'limit', 'current_page']);

  // get only the project of this publisher
  const filterDeveloper = {
    deleted_at: { $exists: false },
    blocked: { $exists: false },
    publisher_id: req.params.id,
  };

  // attach the image and name of the publisher into the project .
  const callback = async responseData => {
    const projects = responseData.freelanceprojects.map(project => {
      project.publisher_name = publisher.username;
      project.publisher_image_url = publisher.profile_image;
      return project;
    });
    delete responseData.freelanceprojects;
    responseData.freelance_projects = projects;
    return responseData;
  };

  // sanitize the response .
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  return factory.getAll({
    Model: FreelanceProject,
    fieldsToOmitFromResponse,
    filterDeveloper,
    callback,
  })(req, res, next);
};

// @desc apply for a project
// @route POST /api/explore/freelance-projects/:id/apply
// @access (authenticated, user)

exports.applyForProject = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);

  // validate the project : not deleted , not blocked and is open .
  const error = validProject(project, { softDeleted: true, blocked: true }, req);
  if (error)
    return next(new ApiError([$.freelance_project_not_found, req.params.id], 404, { merge: true }));

  // fetch the publisher
  const publisher = await User.findById(project.publisher_id);

  // vaildate the publisher : not deleted and not blocked
  if (!publisher || publisher.blocked || publisher.deleted_at)
    return next(new ApiError([$.freelance_project_not_found, req.params.id], 404, { merge: true }));

  // assure that : the project is open for applications
  if (project.status !== 'open') return next(new ApiError($.the_project_is_not_open, 403));

  // assure that : the publisher is not the same of the request user .
  if (publisher._id.toString() === req.user.id.toString()) {
    return next(new ApiError($.you_cannot_apply_for_your_project, 403));
  }

  // assure that : the user did not apply for the project already
  let application = await FreelanceApplication.findOne({
    project_id: project._id,
    user_id: req.user.id,
  });
  if (application) return next(new ApiError($.you_already_applied_for_this_project, 409));

  // create the application .
  application = await FreelanceApplication.create({
    user_id: req.user.id,
    project_id: project._id,
  });

  project.applications_count++;
  await project.save();

  return res.status(200).json({
    status: 'success',
    messages: [tr($.you_successfully_applied_for_this_project)],
  });
};

// @desc cancel apply for a project
// @route DELETE /api/explore/freelance-projects/:id/cancel-apply
// @access (authenticated, user)
exports.cancelApplyForProject = async (req, res, next) => {
  // fetch the application
  const application = await FreelanceApplication.findOne({
    user_id: req.user.id,
    project_id: req.params.id,
  });

  // assure that : the user is indeed applying for this project
  if (!application) return next(new ApiError($.you_are_not_applying_for_this_project, 409));

  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // assure that : the project is still open
  if (project.status !== 'open') return next(new ApiError($.the_project_is_not_open, 403));

  // delete the application
  await FreelanceApplication.findByIdAndDelete(application._id);

  project.applications_count--;
  await project.save();

  return res.status(200).json({
    status: 'success',
    messages: [tr($.you_successfully_canceled_apply_for_this_project)],
  });
};

exports.getAllApplyingProjects = async (req, res) => {
  // extract the pagination params if exists
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const user_id = new mongoose.Types.ObjectId(req.user.id);
  const pipeline = MULTI_FREELANCE_PIPELINE({ user_id }, skip, limit);

  const aggregation = await FreelanceApplication.aggregate(pipeline);

  const resultArr = aggregation[0]?.data.map(app => {
    return {
      applied_at: app.created_at,
      project: {
        id: app.project._id,
        title: app.project.title,
      },
      publisher: {
        id: app.publisher._id,
        name: app.publisher.username,
        image_url: app.publisher.profile_image,
        full_name: app.profile.full_name,
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
    project_applications: resultArr || [],
  };

  return res.status(200).json(response);
};

// @desc report a project
// @api POST /api/explore/freelance-projects/:id/report
// @access (authenticated, user)

exports.reportProject = async (req, res, next) => {
  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // validate the project : not soft deleted nor blocked
  let error = validProject(project, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_project_found_for_this_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the publisher
  const publisher = await User.findById(project.publisher_id);

  // validate the publisher .
  if (publisher.blocked || publisher.deleted_at) {
    return next(
      new ApiError([$.no_project_found_for_this_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the user did not reported the project already .
  let report = await Report.findOne({
    reporter_id: req.user.id,
    reported_item_id: project._id,
    type: 'FreelanceProjects',
  });
  if (report) return next(new ApiError($.you_already_reported_this_project));

  // create the report
  report = new Report({
    reporter_id: req.user.id,
    reported_item_id: project._id,
    reason: req.body.reason,
    type: 'FreelanceProjects',
  });

  // save the report
  await report.save();

  project.total_reports++;
  project.unhandled_reports++;
  await project.save();

  return res.status(200).json({
    status: 'success',
    messages: [tr($.the_report_successfully_sent)],
  });
};

// @desc save a project
// @route POST /api/explore/freelance-projects/:id/save
// @access (authenticated, user)
exports.saveProject = async (req, res, next) => {
  // fetch the project .
  const project = await FreelanceProject.findById(req.params.id);

  // validate the project : not deleted nor blocked .
  let error = validProject(project, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_project_found_for_this_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the publisher
  const publisher = await User.findById(project.publisher_id);

  // assure that : the publisher is not blocked nor deleted .
  if (publisher.deleted_at || publisher.blocked) {
    return next(
      new ApiError([$.no_project_found_for_this_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the user did not save the project already
  let savedProject = await SavedProject.findOne({ project_id: project._id, user_id: req.user.id });
  if (savedProject) {
    return next(new ApiError($.you_already_saved_this_project, 409));
  }

  // create the save
  savedProject = await SavedProject.create({
    project_id: project._id,
    user_id: req.user.id,
  });

  return res.status(200).json({
    status: 'success',
    messages: [tr($.project_saved_successfully)],
  });
};

// @desc unsave the project
// @route DELETE /api/explore/freelance-projects/:id/unsave
// @access (authenticated, user)
exports.unsaveProject = async (req, res, next) => {
  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // validate the project : not deleted nor blocked
  let error = validProject(project, { softDeleted: true, blocked: true }, req);
  if (error) {
    return next(
      new ApiError([$.no_project_found_for_this_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the publisher
  const publisher = await User.findById(project.publisher_id);

  // assure that : the publisher is not blocked nor deleted .
  if (publisher.deleted_at || publisher.blocked) {
    return next(
      new ApiError([$.no_project_found_for_this_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the user is indeed saving this project
  const savedProject = await SavedProject.findOne({
    project_id: project._id,
    user_id: req.user.id,
  });
  if (!savedProject) {
    return next(new ApiError($.this_project_is_not_saved_already, 409));
  }

  // delete the saved project.
  await SavedProject.findByIdAndDelete(savedProject._id);

  return res.status(204).send();
};

// @desc get user saved projects
// @route GET /api/explore/freelance-projects/saved-projects
// @access (authenticated, user)
exports.savedProjects = async (req, res) => {
  // extract the pagination params if exists
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const user_id = new mongoose.Types.ObjectId(req.user.id);
  const pipeline = MULTI_FREELANCE_PIPELINE({ user_id }, skip, limit);

  const aggregation = await SavedProject.aggregate(pipeline);

  const resultArr = aggregation[0]?.data.map(app => {
    return {
      saved_at: app.created_at,
      project: {
        id: app.project._id,
        title: app.project.title,
      },
      publisher: {
        id: app.publisher._id,
        name: app.publisher.username,
        image_url: app.publisher.profile_image,
        full_name: app.profile.full_name,
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
    saved_projects: resultArr || [],
  };

  return res.status(200).json(response);
};

// @desc get freelance project done by specific user
// @route GET /api/explore/freelance-projects/executor/:id
// @access (authenticated, user)
exports.getExeuctorProject = async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  const executor_id = new mongoose.Types.ObjectId(req.params.id);

  const pipeline = [
    {
      $match: {
        done_by: executor_id,
        deleted_at: { $exists: false },
        blocked: { $exists: false },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'done_by',
        foreignField: '_id',
        as: 'executor',
      },
    },
    { $unwind: '$executor' },
    {
      $match: {
        'executor.deleted_at': { $exists: false },
        'executor.blocked': { $exists: false },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'publisher_id',
        foreignField: '_id',
        as: 'publisher',
      },
    },
    {
      $unwind: '$publisher',
    },
    {
      $match: {
        'publisher.deleted_at': { $exists: false },
        'publisher.blocked': { $exists: false },
      },
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          {
            $project: {
              unhandled_reports: 0,
              total_reports: 0,
              applications_count: 0,
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

  const result = await FreelanceProject.aggregate(pipeline);
  const resultArr = result[0]?.data?.map(project => {
    project.executor_name = project.executor.username;
    project.executor_image_url = project.executor.profile_image;
    project.publisher_name = project.publisher.username;
    project.publisher_image_url = project.publisher.profile_image;
    delete project.executor;
    delete project.publisher;
    return project;
  });

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: result[0]?.total_count || 0,
      count: result[0]?.data.length || 0,
    },
    freelance_projects: resultArr || [],
  };

  return res.status(200).json(response);
};

async function projectSuggestions(req, res, next, limit, skip, page) {
  const title = req.user.interests?.join(' ');

  let pipeline = [
    {
      $match: {
        $or: [{ $text: { $search: title } }, { topics: { $in: req.user.interests } }],
        status: 'open',
      },
    },
    { $addFields: { score: { $meta: 'textScore' } } },
    {
      $match: {
        deleted_at: { $exists: false },
        blocked: { $exists: false },
        status: 'open',
      },
    },
    ...SEARCH_PIPELINE(title, skip, limit),
  ];

  const aggregation = await FreelanceProject.aggregate(pipeline);

  let data = aggregation[0]?.data || [];
  const totalCount = aggregation[0]?.total_count || 0;

  const pagesCovered = totalCount / limit;

  if (data?.length === limit) {
    data = await Promise.all(data.map(p => adjustProject(p, req)));
    return res.status(200).json({
      pagination: {
        page,
        limit,
        count: data.length,
      },
      freelance_projects: data,
    });
  }

  let l = data?.length > 0 ? limit - data?.length : limit;
  let s = Math.floor(page - Math.floor(pagesCovered) - 1) * l;
  if (Math.ceil(1 + pagesCovered) === page) s -= pagesCovered * 10;

  const randoms = await FreelanceProject.aggregate([
    {
      $match: {
        deleted_at: { $exists: false },
        blocked: { $exists: false },
        status: 'open',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'publisher_id',
        foreignField: '_id',
        as: 'publisher',
      },
    },
    { $unwind: '$publisher' },
    {
      $match: {
        'publisher.blocked': { $exists: false },
        'publisher.deleted_at': { $exists: false },
      },
    },
    {
      $addFields: {
        publisher_name: '$publisher.username',
        publisher_image_url: '$publisher.profile_image',
      },
    },
    {
      $lookup: {
        from: 'profiles',
        localField: 'publisher_id',
        foreignField: '_id',
        as: 'profile',
      },
    },
    { $unwind: '$profile' },
    {
      $addFields: {
        publisher_fullname: '$profile.full_name',
      },
    },
    {
      $project: {
        // get the match text score to sort depending on it .
        total_reports: 0,
        unhandled_reports: 0,
        publisher: 0,
        profile: 0,
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
  data = await Promise.all(data.map(p => adjustProject(p, req)));

  return res.status(200).json({
    pagination: {
      page,
      limit,
      count: data.length,
    },
    freelance_projects: data,
  });
}
