const path = require('path');
const fs = require('fs');
// const winston = require('winston');
const _ = require('lodash');

const FreelanceProject = require('../../models/freelance_projects_model');
const User = require('../../models/users_model');
const Contract = require('../../models/freelance_contracts_model');
const FreelanceApplications = require('../../models/freelance_applications_model');
const Notification = require('../../models/notifications_model');
const SavedProject = require('../../models/saved_projects_model');
const validProject = require('../../utils/validation/freelance_projects/validate_project');
const factory = require('../../helper/handlers_factory');
const processFile = require('../../helper/process_file');
const adjustArrayParam = require('../../helper/adjust_array_param');
const proccessTopics = require('../../helper/new_topics_processor');
const Follow = require('../../models/follow_model');
const notificationController = require('../../service/notifications_service');
const getName = require('../../helper/get_full_name');
const ApiError = require('../../utils/api_error');
const tr = require('../../helper/translate');
const $ = require('../../locales/keys');
const { default: mongoose } = require('mongoose');

const IMAGES_CONVERT_FORMAT = 'jpeg';
const IMAGES_UPLOAD_PATH = '/public/images/freelance_projects_images/';
const IMAGE_NAME_GENERATOR = filename => {
  return (
    ('freelanceProject-' + new Date().toISOString() + '-' + _.random(10000) + '-' + filename)
      .trim()
      // eslint-disable-next-line no-useless-escape
      .replace(/[\/\\^$*+?()|[\]{}:\s]/g, '-')
  );
};

// @desc create a freelance project
// @route POST /api/user/freelance-projects/
// @access (authenticated, user)
exports.createFreelanceProject = async (req, res, next) => {
  // extract the fields taken from the user
  const userInput = ['title', 'description', 'topics', 'budget', 'working_interval'];
  req.body = _.pick(req.body, userInput);

  // add the aditional fields that are requried to create the project
  req.body.publisher_id = req.user.id; // the id of the user creating the project
  if (req.file) {
    const file = await processFile(
      req.file,
      IMAGE_NAME_GENERATOR,
      IMAGES_UPLOAD_PATH,
      'image',
      IMAGES_CONVERT_FORMAT,
    );

    req.body.image = file.url;
  } // an image for the project

  // fields to create the project
  const fields = [
    'title',
    'description',
    'topics',
    'budget',
    'working_interval',
    'image',
    'publisher_id',
  ];

  // the topics are validated that they exists and are unique in the validator .
  proccessTopics(req.body.topics);

  // attach the name and the image of the publisher into the project
  const callback = async responseData => {
    responseData.freelance_project.publisher_name = req.user.username;
    responseData.freelance_project.publisher_image_url = req.user.profile_image;
    return responseData;
  };

  // sanitize the response
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  // response
  const freelance = await factory.createOne({
    Model: FreelanceProject,
    fields: fields,
    fieldsToOmitFromResponse,
    callback,
  })(req, res, next);

  // notify the followers :
  const followersIds = await Follow.find({ following_id: req.user._id }).select('follower_id -_id');
  const listIds = followersIds.map(e => e.follower_id.toString());
  const tokens = await notificationController.getTokens(listIds);

  let image;
  if (freelance.image && process.env.NODE_ENV === 'production') {
    image = process.env.URL_API_HOSTING + freelance.image;
  }

  if (tokens && tokens.idsList.length > 0) {
    const name = await getName(req);
    notificationController.sendNotificationToMultipleTokens(
      tokens.tokensList,
      name,
      freelance.title,
      tokens.idsList,
      undefined,
      image,
    );

    const notification = new Notification({
      title: name,
      body: freelance.title,
      reason: 'FreelanceProjects',
      reason_id: freelance._id,
      notification_type: 'token',
      sent_by: freelance.publisher_id,
      receivers: tokens.idsList,
      special_data: {
        data: freelance.publisher_id,
        type: 'Users',
      },
    });
    notification.save();
  }
};

// @desc get all user freelance projects
// @route GET /api/user/freelance-projects/
// @access (authenticated, user)
exports.getAllFreelanceProjects = async (req, res, next) => {
  // extract from the query the fields that the user can use in filteration
  req.query = _.pick(req.query, [
    'status',
    'title',
    'sort',
    'topics',
    'budget.min',
    'budget.max',
    'budget.currency',
    'page',
    'limit',
    'current_page',
  ]);

  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }

  // get only projects of the user token
  const filterDeveloper = {
    publisher_id: req.user.id,
    deleted_at: { $exists: false },
  };

  const populateDeveloper = [{ path: 'done_by', select: '_id username profile_image' }];

  // attach the name and image of the publisher into each projects
  // and the name and image of the executor (if exists)
  const callback = async responseData => {
    const projects = await Promise.all(
      responseData.freelanceprojects.map(async project => {
        project.publisher_name = req.user.username;
        project.publisher_image_url = req.user.profile_image;

        if (project.done_by) {
          project.executor_name = project.done_by.username;
          project.executor_image_url = project.done_by.profile_image;
          project.done_by = project.done_by._id;
        }

        const save = await SavedProject.findOne({ project_id: project._id, user_id: req.user.id });
        project.saved = save !== null;

        return project;
      }),
    );
    delete responseData.freelanceprojects;
    responseData.freelance_projects = projects;
    return responseData;
  };

  // sanitize the reponse
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  return factory.getAll({
    Model: FreelanceProject,
    callback,
    filterDeveloper,
    fieldsToOmitFromResponse,
    populateDeveloper: populateDeveloper,
  })(req, res, next);
};

// @desc get one project
// @route GET /api/user/freelance-project/:id
// @access (authenticated, user)
exports.getOneFreelanceProject = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);

  // validate the project :exists and not soft deleted
  const error = validProject(project, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // attach the name and image of the publisher
  project = project.toObject();
  project.publisher_name = req.user.username;
  project.publihser_image_url = req.user.profile_image;

  // attach the name and image of the executor if exists
  if (project.done_by) {
    const executor = await User.findById(project.done_by).populate('profile_id');
    if (executor && !executor.deleted_at && !executor.blocked) {
      project.executor_name = executor.username;
      project.executor_image_url = executor.profile_image;
      project.executor_full_name = executor.profile_id?.full_name;
    }
  }

  const save = await SavedProject.findOne({ project_id: project._id, user_id: req.user.id });
  project.saved = save !== null;

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

  // sanitize the response
  project = _.omit(project, ['__v', 'total_reports', 'unhandled_reports']);

  // repsonse
  return res.status(200).json({
    status: 'success',
    project,
  });
};

// @desc update a project
// @route PUT /api/user/freelance-projects/:id
// @access (authenticated, user)
exports.updateFreelanceProject = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);

  // validate the project : exists, not soft deleted, not blocked and the user has the permission to update it .
  const error = validProject(project, { softDeleted: true, permission: true, blocked: true }, req);
  if (error) next(error);

  // if the project status is not 'open' => it cannot be updated
  if (project.status !== 'open')
    return next(new ApiError($.you_cannot_updated_completed_and_contracted_projects, 403));

  // extract the fields taken from the user
  const userInput = ['title', 'description', 'topics', 'budget', 'working_interval', 'image'];
  req.body = _.pick(req.body, userInput);

  // if the user submited an image , update it .
  if (req.file) {
    // if there exists an old image , delete it
    if (project.image) {
      // get the path of the old image .
      const imagePath = path.join(__dirname, '../../../uploads', project.image);
      // delete the old image .
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath, () => {
            // winston.info(`${company[specifyImage].originalname} - has been deleted successfully`);
          });
        }
      } catch (err) {
        return next(err);
      }
    }

    // update the image
    const file = await processFile(
      req.file,
      IMAGE_NAME_GENERATOR,
      IMAGES_UPLOAD_PATH,
      'image',
      IMAGES_CONVERT_FORMAT,
    );
    req.body.image = file.url;
  }
  project.set(req.body);
  await project.save();

  // sanitize the respose
  project = _.omit(project.toObject(), ['__v', 'total_reports', 'unhandled_reports']);
  project.publisher_name = req.user.username;
  project.publihser_image_url = req.user.profile_image;

  const save = await SavedProject.findOne({ project_id: project._id, user_id: req.user.id });
  project.saved = save !== null;

  return res.status(200).json({
    status: 'success',
    project,
  });
};

// @desc delete a freelance project
// @route DELETE /api/user/freelance-projects/:id
// @access (authenticated, user)
exports.deleteFreelanceProject = async (req, res, next) => {
  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // validate the project : not soft deleted and the user has the authority to delete it
  const error = validProject(project, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  project.deleted_at = new Date();
  await project.save();

  return res.status(204).send();
};

// @desc get project applications
// @route GET /api/user/freelance-projects/:id/applications
// @access (autthenticated, user)
exports.getProjectApplications = async (req, res, next) => {
  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // validate the project : not soft deleted and the user has access to it.
  const error = validProject(project, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // Extract the pagination params
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $match: {
        project_id: project._id,
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

  const aggregation = await FreelanceApplications.aggregate(pipeline);

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: aggregation[0]?.total_count || 0,
      count: aggregation[0]?.data.length || 0,
    },
    project_applications: aggregation[0]?.data || [],
  };

  return res.status(200).json(response);
};

// @desc leave a review for a done project
// @route PUT /api/user/freelance-projects/:id/review
// @access (authenticated, user)
exports.review = async (req, res, next) => {
  // fetch the project and validate it
  let project = await FreelanceProject.findById(req.params.id);

  const error = validProject(project, { softDeleted: true, blocked: true, permission: true }, req);
  if (error) return next(error);

  // assure that : the project status is completed
  if (project.status !== 'completed' || !project.done_by) {
    return next(new ApiError($.you_can_review_only_completed_projects, 400));
  }
  console.log(project.review !== null);
  if (project.review) {
    return next(new ApiError($.the_project_is_already_rated, 400));
  }

  req.body = _.pick(req.body, ['rating', 'comment']);

  // update the project
  project.review = {
    ...req.body,
  };
  await project.save();

  const executor = await User.findById(project.done_by);
  project = project.toObject();
  project.executor_image_url = executor.profile_image;
  project.executor_name = executor.username;
  project.publisher_name = req.user.username;
  project.publisher_image_url = req.user.profile_image;

  // update the executor freelance rating
  if (req.body.rating) {
    const updateResult = await User.findOneAndUpdate(
      { _id: executor._id },
      {
        $inc: { rating_count: 1, total_rating: req.body.rating },
      },
      { new: true, upsert: true },
    );

    executor.freelance_rating = updateResult.total_rating / updateResult.rating_count;
    await executor.save();
  }

  res.status(200).json({
    status: 'success',
    freelance_project: project,
  });

  const tokens = await notificationController.getTokens(executor._id.toString());
  console.log('here', tokens);
  if (tokens && tokens.idsList.length > 0) {
    const name = await getName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.reviewd_your_freelance,
      tokens.idsList[0],
    );

    const notification = new Notification({
      title: name,
      body: $.reviewd_your_freelance,
      reason: 'FreelanceProjects',
      reason_id: project._id,
      notification_type: 'token',
      sent_by: project.publisher_id,
      receivers: tokens.idsList,
      special_data: {
        data: project.publisher_id,
        type: 'Users',
      },
    });
    notification.save();
  }
};

// @desc mark a project application as checked
// @route PUT /api/user/freelance-projects/:id/applications/:application_id/mark?check=true
// @access (authenticated, user)
exports.markProjectApplication = async (req, res, next) => {
  // fetch the project
  const project = await FreelanceProject.findById(req.params.id);

  // validate the project : not soft deleted and the user has access to it.
  const error = validProject(project, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // fetch the application
  const app = await FreelanceApplications.findById(req.params.application_id);

  // assure that : the application does exist .
  if (!app) {
    return next(new ApiError($.no_project_application_was_found, 404));
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

exports.getAllExecutingProjects = async (req, res, next) => {
  req.query = _.pick(req.query, [
    'status',
    'title',
    'sort',
    'topics',
    'page',
    'limit',
    'current_page',
  ]);

  if (req.query.topics) {
    req.query.topics = adjustArrayParam(req.query.topics);
  }

  // get only projects of the user token
  const filterDeveloper = {
    done_by: req.user.id,
    deleted_at: { $exists: false },
  };

  const populateDeveloper = [{ path: 'publisher_id', select: '_id username profile_image' }];

  const callback = async responseData => {
    const projects = await Promise.all(
      responseData.freelanceprojects.map(async project => {
        project.executor_name = req.user.username;
        project.executor_image_url = req.user.profile_image;

        project.publisher_name = project.publisher_id.username;
        project.publisher_image_url = project.publisher_id.profile_image;
        project.publisher_id = project.publisher_id._id;

        const save = await SavedProject.findOne({ project_id: project._id, user_id: req.user.id });
        project.saved = save !== null;

        return project;
      }),
    );
    delete responseData.freelanceprojects;
    responseData.freelance_projects = projects;
    return responseData;
  };

  // sanitize the reponse
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  return factory.getAll({
    Model: FreelanceProject,
    callback,
    filterDeveloper,
    fieldsToOmitFromResponse,
    populateDeveloper: populateDeveloper,
  })(req, res, next);
};

exports.getOneExecutingProject = async (req, res, next) => {
  // fetch the project
  let project = await FreelanceProject.findById(req.params.id);

  // validate the project :exists , not deleted , not blocked and the user is the executor.
  const error = validProject(project, { softDeleted: true, blocked: true, executor: true }, req);
  if (error) return next(error);

  project = project.toObject();
  project.executor_name = req.user.username;
  project.executor_image_url = req.user.profile_image;

  // attach the name and image of the publisher
  const publisher = await User.findById(project.publisher_id).populate('profile_id');
  project.publisher_name = publisher.username;
  project.publisher_image_url = publisher.profile_image;
  project.publisher_full_name = publisher.profile_id?.full_name;

  const save = await SavedProject.findOne({ project_id: project._id, user_id: req.user.id });
  project.saved = save !== null;

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
    console.log(contract);
    project.contract_id = contract?._id;
  }

  // sanitize the response
  project = _.omit(project, ['__v', 'total_reports', 'unhandled_reports']);

  // repsonse
  return res.status(200).json({
    status: 'success',
    project,
  });
};
