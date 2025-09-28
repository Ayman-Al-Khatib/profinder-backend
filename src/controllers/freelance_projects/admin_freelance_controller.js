const _ = require('lodash');

const User = require('../../models/users_model');
const FreelanceProject = require('../../models/freelance_projects_model');
const Contract = require('../../models/freelance_contracts_model');
const Report = require('../../models/posts_and_related/reports_model');
const documentsCounter = require('../../helper/documents_counter');
const factory = require('../../helper/handlers_factory');
const validProject = require('../../utils/validation/freelance_projects/validate_project');
const ApiError = require('../../utils/api_error');
const adjustArrayParam = require('../../helper/adjust_array_param');
const $ = require('../../locales/keys');

// @desc get all freelance projects
// @route /api/admin/freelance-projects
// @access (authenticated, admin)

exports.getAllProjects = async (req, res, next) => {
  // specify the fields that the admin can filter on
  const fields = [
    'publisher_id',
    'done_by',
    'status',
    'title',
    'topics',
    'budget.min',
    'budget.max',
    'budget.currency',
    'working_interval',
    'application_count',
    'review.rating',
    'blocked.blocked_at',
    'deleted_at',
    'total_reports',
    'unhandled_reports',
    'exists',
    'sort',
    'page',
    'current_page',
    'limit',
  ];

  // pick only these fields from the query
  req.query = _.pick(req.query, fields);

  // adjust the topics filter if exists
  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }

  let developerSort, developerProjection, filterDeveloper;

  // if the title filter exists , use the text index .
  if (req.query.title) {
    const title = req.query.title;
    delete req.query.title;

    filterDeveloper = { ...filterDeveloper, $text: { $search: title } };
    developerProjection = { score: { $meta: 'textScore' } };
    developerSort = { score: { $meta: 'textScore' } };
  }

  // attach the publisher name and image for each project
  const callback = async responseData => {
    let projects = responseData.freelanceprojects;
    delete responseData.freelanceprojects;
    projects = await Promise.all(
      projects.map(async project => {
        const publisher = await User.findById(project.publisher_id);
        project.publisher_name = publisher.username;
        project.publisher_image_url = publisher.profile_image;

        return project;
      }),
    );
    responseData.freelance_projects = projects;
    return responseData;
  };

  // sanitize the response
  const fieldsToOmitFromResponse = ['__v', 'score'];

  return factory.getAll({
    Model: FreelanceProject,
    fieldsToOmitFromResponse,
    filterDeveloper,
    developerProjection,
    developerSort,
    callback,
  })(req, res, next);
};

// @desc get one project
// @route GET /api/admin/freelance-projects/:id
// @access (authenticated, admin)

exports.getProject = async (req, res, next) => {
  // fetch the freelance project
  let project = await FreelanceProject.findById(req.params.id);

  // assure that : the project does exist
  const error = validProject(project, {}, req);
  if (error) return next(error);

  // attach the image and name of the publisher
  const publisher = await User.findById(project.publisher_id);
  project = project.toObject();
  project.publisher_name = publisher.username;
  project.publisher_image_url = publisher.profile_image;

  return res.status(200).json({
    status: 'success',
    project,
  });
};

// @desc block one project
// @route PUT /api/admin/jobs/:id/block
// @access (authenticated, admin (freelance manager role))

exports.blockProject = async (req, res, next) => {
  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // assure that : the project does exist
  const error = validProject(project, {}, req);
  if (error) return next(error);

  // the project is soft deleted => inform the admin
  if (project.deleted_at) {
    return next(new ApiError($.project_is_soft_deleted, 400));
  }

  // assure that : the project is not already blocked
  if (project.blocked) {
    return next(
      new ApiError([$.the_project_is_already_blocked, req.params.id], 409, { merge: true }),
    );
  }

  // block the project
  project.blocked = {
    blocked_at: new Date(),
    responsibile_support_id: req.admin.id,
    responsibile_support_name: req.admin.username,
  };
  await project.save();

  return res.status(200).json({
    status: 'success',
    project,
  });
};

// @desc unblock a project
// @route PUT /api/admin/freelance-projects/:id/unblock
// @access (authenticated, admin (freelance manager))
exports.unblockProject = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);

  // assure that : the project does exist
  const error = validProject(project, {}, req);
  if (error) return next(error);

  // assure that : the project is not soft deleted
  if (project.deleted_at) {
    return next(new ApiError($.project_is_soft_deleted_so_there_is_no_reason_to_unblock_it, 400));
  }

  // assure that : the project is indeed blocked
  if (!project.blocked) {
    return next(new ApiError($.project_is_not_blocked_already, 409));
  }

  project.blocked = undefined;
  await project.save();

  return res.status(200).json({
    status: 'success',
    project,
  });
};

// @desc count projects with specific filteration
// @route GET /api/admin/freelance-projects/count
// @access (authenticated, admin)
exports.countProjects = async (req, res) => {
  const count = await documentsCounter({ Model: FreelanceProject, query: req.query });

  return res.status(200).json({
    status: 'success',
    projects_count: count,
  });
};

// @desc get project and its reports
// @route GET /api/admin/freelance-projects/:id/with-reports
// @access (authenticated, admin)
exports.getProjectAndReports = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);
  const error = validProject(project, {}, req);
  if (error) return next(error);

  // attach the name and image of the publisher into the project
  const publisher = await User.findById(project.publisher_id);
  project = project.toObject();
  project.publisher_name = publisher.username;
  project.publisher_image_url = publisher.profile_image;

  if (project.status !== 'open') {
    const contract = await Contract.findOne({
      freelance_project_id: project._id,
      status: {
        $in: [
          'pending',
          'shipped_from_executor',
          'successfully_done',
          'admin_revising_it',
          'resolved_by_admin',
        ],
      },
    });
    project.contract_id = contract?._id;
  }

  // get only the reports of this project
  const filterDeveloper = {
    reported_item_id: req.params.id,
    type: 'FreelanceProjects',
  };

  // sort
  const developerSort = 'created_at';

  // adjust the response
  const callback = async responseData => {
    const message = responseData.message;
    const status = responseData.status;
    delete responseData.message;
    delete responseData.success;
    return {
      message,
      status,
      project,
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
