// This controller contains the actions that can be done by
// the user concerning the ' company account ' feature .

const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const winston = require('winston');

const User = require('../../models/users_model');
const Company = require('../../models/companies_model');
const ManagerRequest = require('../../models/manager_requests_model');
const CompanyBlock = require('../../models/company_blocks_model');
const Notification = require('../../models/notifications_model.js');
const notificationController = require('../../service/notifications_service.js');
const ApiError = require('../../utils/api_error');
const factory = require('../../helper/handlers_factory');
const adjustCompany = require('../../helper/adjust_company_images');
const updateImageAtManagers = require('../../helper/updateImageAtManagers.js');
const validCompany = require('../../utils/validation/companies/valid_company');
const processFile = require('../../helper/process_file');
const $ = require('../../locales/keys');
const Job = require('../../models/jobs_model');
const IMAGES_CONVERT_FORMAT = 'jpeg';
const IMAGES_UPLOAD_PATH = '/public/images/company_images/';
const IMAGE_NAME_GENERATOR = filename => {
  return (
    ('COMPANY_IMAGE-' + new Date().toISOString() + '-' + _.random(10000) + '-' + filename)
      .trim()
      // eslint-disable-next-line no-useless-escape
      .replace(/[\/\\^$*+?()|[\]{}:\s]/g, '-')
  );
};

// @desc get all companies that has the user as founder
// @route GET /api/user/companies/
// @access (authenticated, user (founder of the company))

exports.getCompanies = async (req, res) => {
  // fethcing the user and populate his companies .
  const populatedUser = await User.findById(req.user.id).populate('companies.company_id');

  // get the companies from the populated doc .
  let companies = populatedUser.companies;

  // get the companies from the realtionship array .
  companies = companies.map(obj => obj.company_id);

  // omit the missing and soft deleted companies .
  companies = companies.filter(company => company && !company.deleted_at);

  // sanitize the response
  companies = await Promise.all(
    companies.map(async company => {
      company = _.omit(company.toObject(), ['__v', 'total_reports', 'unhandled_reports']);
      company = await adjustCompany(company);
      return company;
    }),
  );

  // response
  res.status(200).json({
    status: 'sucess',
    companies,
  });
};

// @desc get specific company that has the user as founder
// @route GET /api/user/companies/:id
// @access (authenticated, user (founder of the company))

exports.getCompany = async (req, res, next) => {
  // query the company .
  let company = await Company.findById(req.params.id);

  // check the validity of the company: exists, not softdeleted, the user is the founder .
  const error = validCompany(company, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // sanitizing the response .
  company = _.omit(company.toObject(), ['__v', 'total_reports', 'unhandled_reports']);

  company = await adjustCompany(company);

  // send response .
  return res.status(200).json({
    status: 'success',
    company,
  });
};

// @desc get sent manager requests .
// @route GET /api/user/companies/:id/manager-requests
// @access (authenticaated, user (founder of the company))

exports.getSentManagerRequests = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate company : not soft deleted and the user is the founder
  const error = validCompany(company, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // specify the fields that the user can filter on .
  const fields = ['receiver.name', 'status', 'page', 'limit', 'current_page'];

  // pick only these fields from the request query
  req.query = _.pick(req.query, fields);

  // arrange in descending order of created at
  req.query.sort = '-created_at';

  // get only the requests sent by this company
  const filterDeveloper = {
    'company.id': req.params.id,
  };

  const callback = response => {
    response.sent_manager_request = response.managerrequests;
    delete response.managerrequests;
    return response;
  };

  const fieldsToOmitFromResponse = ['__v'];

  return factory.getAll({
    Model: ManagerRequest,
    fieldsToOmitFromResponse,
    filterDeveloper,
    callback,
  })(req, res, next);
};

// @desc send add manager request for a user
// @route POST /api/user/companies/:id/manager-request
// @access (authenticated, user (founder of the company))

exports.sendAddManagerRequest = async (req, res, next) => {
  // query the company
  let company = await Company.findById(req.params.id);

  // validate company: exists, not soft deleted, not blocked and the user is the founder .
  const error = validCompany(company, { softDeleted: true, permission: true, blocked: true }, req);
  if (error) return next(error);

  const block = await CompanyBlock.findOne({ user_id: req.body.receiver, company_id: company._id });
  if (block) return next(new ApiError($.you_cannot_send_manager_requests_to_blocked_users, 400));

  // query the user that holds the receiver id
  const newManager = await User.findById(req.body.receiver);

  // assure that : the user does exists and not soft deleted .
  if (!newManager || newManager.deleted_at) {
    return next(
      new ApiError([$.no_user_found_for_this_Id, req.body.receiver], 404, { merge: true }),
    );
  }

  // assure that : the user is not already a manager .
  const alreadyManager = company.managers.some(
    manager => manager._id.toString() === req.body.receiver.toString(),
  );
  if (alreadyManager) {
    return next(new ApiError([$.already_manager, req.body.receiver], 400, { merge: true }));
  }

  // assure that : the request does not already exist .
  const requestExists = await ManagerRequest.findOne({
    'sender.id': req.user.id,
    'receiver.id': req.body.receiver,
    'company.id': req.params.id,
    status: { $in: ['pending'] },
  });
  if (requestExists) {
    return next(new ApiError($.request_already_exists, 400));
  }
  // create the request
  const managerRequest = await ManagerRequest.create({
    sender: {
      id: req.user.id,
      name: req.user.username,
    },
    receiver: {
      id: newManager._id,
      name: newManager.username,
    },
    company: {
      id: company._id,
      name: company.name,
    },
  });

  // sending a notification to the user .
  const tokens = await notificationController.getTokens(newManager._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      company.name,
      $.sent_a_manager_request_to_you,
      tokens.idsList[0],
      { company_id: company._id.toString(), request_id: managerRequest._id.toString() },
    );
    const notification = new Notification({
      title: company.name,
      body: $.sent_a_manager_request_to_you,
      reason: 'ManagerRequests',
      reason_id: managerRequest._id,
      notification_type: 'token',
      sent_by: company._id,
      receivers: tokens.idsList,
      special_data: {
        data: company._id,
        type: 'Companies',
      },
    });
    notification.save();
  }

  return res.status(200).json({
    status: 'success',
    managerRequest,
  });
};

// @desc delete manager request
// @route DELETE /api/user/companies/:id/manager-request/:request_id
// @access (authenticated, user (founder of the company))

exports.deleteManagerRequest = async (req, res, next) => {
  // fetch the company
  const company = await Company.findById(req.params.id);

  // validate the company
  const error = validCompany(company, { softDeleted: true, permission: true, blocked: true }, req);
  if (error) return next(error);

  // query the request
  const request = await ManagerRequest.findById(req.params.request_id);

  // assure that : the request does exist .
  if (!request) {
    return next(new ApiError([$.request_not_found, req.params.request_id], 404, { merge: true }));
  }

  // delete the request
  await ManagerRequest.findByIdAndDelete(req.params.request_id);

  // response
  res.status(204).send();
};

// @desc remove a manager from a company
// @route PUT /api/user/companies/:id/remove-manager
// @access (authenticated, user (founder of the company))

exports.removeManager = async (req, res, next) => {
  // query the company
  let company = await Company.findById(req.params.id);

  // check the validity of the company : exists, not soft deleted, not blocked and the user is the founder.
  const error = validCompany(company, { softDeleted: true, permission: true, blocked: true }, req);
  if (error) return next(error);

  // assure that : the user is indeed a manager .
  const managerExists = company.managers.some(
    manager => manager._id.toString() === req.body.manager_id.toString(),
  );
  if (!managerExists) {
    return next(
      new ApiError([$.this_user_is_not_a_manager, req.body.manager_id], 400, {
        merge: true,
      }),
    );
  }

  // assure that : the manager is not the founder
  if (company.founder._id.toString() === req.body.manager_id.toString()) {
    return next(new ApiError([$.this_manager_is_the_founder], 400));
  }

  // First : update the managers array inside the company doc .
  company.managers = company.managers.filter(
    manager => manager._id.toString() !== req.body.manager_id.toString(),
  );

  // Second : update the manager_at array inside the user doc .
  const removedManager = await User.findById(req.body.manager_id);
  // assure that this manager exists , not soft deleted .
  if (!removedManager || removedManager.deleted_at) {
    return next(
      new ApiError([$.there_is_a_problem_with_this_manager_id, req.body.manager_id], 400, {
        merge: true,
      }),
    );
  }

  // update the array
  removedManager.manager_at = removedManager.manager_at.filter(
    obj => obj.company_id.toString() !== company._id.toString(),
  );

  // save the documents .
  await company.save();
  await removedManager.save();

  // sanitize the response .
  company = _.omit(company.toObject(), ['__v', 'total_reports', 'unhandled_reports']);

  company = await adjustCompany(company);

  // response .
  return res.status(200).json({
    status: 'success',
    company,
  });
};

// @desc update the company details
// @route PUT /api/user/companies/:id
// @access (authenticated, user (founder of the company))

exports.updateCompany = async (req, res, next) => {
  // querying the company
  const company = await Company.findById(req.params.id);

  // check the validity of the company: exists , not soft deleted , not blocked and the user is the founder .
  const error = validCompany(company, { softDeleted: true, permission: true, blocked: true }, req);
  if (error) return next(error);

  // pick the fields that can be updated from the request body .
  const fields = [
    'name',
    'email',
    'phone_number',
    'industry',
    'size',
    'description',
    'website',
    'founded_at',
    'location',
  ];

  // sanitizing the response .
  const fieldsToOmitFromResponse = ['__v', 'total_reports', 'unhandled_reports'];

  const callback = async responseData => {
    let company = responseData.company;
    company = await adjustCompany(company);
    return { ...responseData, company };
  };

  // response .
  return await factory.updateOne({
    Model: Company,
    fields,
    callback,
    fieldsToOmitFromResponse,
  })(req, res, next);
};

// @desc delete a company
// @route DELETE /api/user/companies/:id
// @access (authenticated, user (founder of the company))

exports.deleteCompany = async (req, res, next) => {
  // query the company
  const company = await Company.findById(req.params.id);

  // check the validity of the company: exists , not soft deleted and the user is the founder.
  const error = validCompany(company, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // delete all the jobs of the company .
  await Job.updateMany(
    {
      'company.id': company._id,
    },
    {
      $set: {
        deleted_at: new Date(),
      },
    },
  );

  // delete the company
  company.deleted_at = new Date();
  await company.save();

  return res.status(204).send();
};

// @desc update the logo image of the company account
// @route PUT /api/user/companies/:id/update-picture
// @access (authenticated, user (founder of the company)).

exports.updateImage = async (req, res, next) => {
  // specify which image to update , the main or the cover-image through a request query param.
  const specifyImage = req.query['image-type'] === 'cover_image' ? 'cover_image' : 'image';

  // fetch the company from the db
  let company = await Company.findById(req.params.id);

  // validate the company :
  const error = validCompany(company, { softDeleted: true, permission: true, blocked: true }, req);
  if (error) return next(error);

  // in case : the company already has in image , delete it .
  if (company[specifyImage]) {
    // get the path of the old image .
    const imagePath = path.join(__dirname, '../../../uploads', company[specifyImage].url);

    // delete the old image .
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath, () => {
          winston.info(`${company[specifyImage].originalname} - has been deleted successfully`);
        });
      }
    } catch (err) {
      return next(err);
    }
  }

  // if :  the request holds an image => the operation is update the image.
  if (req.file) {
    // process the image to save it and get its url .
    const file = await processFile(
      req.file,
      IMAGE_NAME_GENERATOR,
      IMAGES_UPLOAD_PATH,
      'image',
      IMAGES_CONVERT_FORMAT,
    );

    // save the image into the company doc .
    company[specifyImage] = file;
  }
  // else => the operation is delete the image .
  else company[specifyImage] = undefined;

  // save the doc .
  await company.save();

  if (specifyImage === 'image') {
    updateImageAtManagers(company);
  }

  // sanitize the response .
  company = _.omit(company.toObject(), ['__v', 'total_reports', 'unhandled_reports']);

  company = await adjustCompany(company);

  // response .
  return res.status(200).json({
    status: 'successful',
    company,
  });
};
