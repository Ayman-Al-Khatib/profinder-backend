// This module contains the admin actions for
// managening the ' apply for a company account ' feature.

const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

const Company = require('../../models/companies_model');
const User = require('../../models/users_model');
const { CompanyApplication } = require('../../models/company_applications_model');
const Notification = require('../../models/notifications_model.js');

const notificationController = require('../../service/notifications_service.js');
const documentsCounter = require('../../helper/documents_counter');
const factory = require('../../helper/handlers_factory');
const getFileNameFromPrivateURL = require('../../helper/get_file_name_from_private_url');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

const getFilePathByName = filename => {
  return process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../../uploads/private/pdf/application_documents/', filename)
    : path.join('uploads/private/pdf/application_documents/', filename).replace(/\\/g, '/');
};

// @desc reject a company application
// @route Put /api/admin/company-application/reject/:id
// @access (authenticated, admin (company manager role))

exports.rejectApplication = async (req, res, next) => {
  // find the application .
  let application = await CompanyApplication.findById(req.params.id);

  // assure that : the application exists.
  if (!application) {
    return next(new ApiError([$.application_not_found, req.params.id], 404, { merge: true }));
  }

  // if the application soft deleted , inform the admin .
  if (application.deleted_at) {
    return next(new ApiError($.application_is_deleted, 400));
  }

  // assure that : the application is not yet handled .
  if (application.verification.status !== 'pending') {
    return next(new ApiError($.the_application_was_already_handled, 400));
  }

  // reject the application .
  application.verification.status = 'rejected';
  application.verification.rejection_reason = req.body.rejection_reason;
  application.verification.responsibile_support = {
    _id: req.admin._id,
    name: req.admin.username,
  };
  application.verification.modified_at = new Date();
  await application.save();

  // sending a notification to the user .
  const user = await User.findById(application.founder._id);
  const tokens = await notificationController.getTokens(user._id.toString());

  // return res.send(tokens);
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      $.rejected_application,
      $.your_company_application_was_rejected_by_the_admins,
      tokens.idsList[0],
      { application_id: application._id.toString() },
    );
    const notification = new Notification({
      title: $.rejected_application,
      body: $.your_company_application_was_rejected_by_the_admins,
      reason: 'CompanyApplications',
      reason_id: application._id,
      notification_type: 'token',
      receivers: tokens.idsList,
      special_data: {
        payload: JSON.stringify({ status: 'rejected' }),
      },
    });
    notification.save();
  }

  // sanitize the response .
  application = _.omit(application.toObject(), ['__v']);

  // response .
  return res.status(200).json({
    status: 'success',
    application,
  });
};

// @desc accept a company application and create a coressponding company .
// @route Put /api/company-applications/accept/:id
// @access (authenticated, admin (company manager role))

exports.acceptApplication = async (req, res, next) => {
  // find the application .
  let application = await CompanyApplication.findById(req.params.id);

  // assure that : the application exists.
  if (!application) {
    return next(new ApiError([$.application_not_found, req.params.id], 404, { merge: true }));
  }

  // if the application soft deleted , inform the admin .
  if (application.deleted_at) {
    return next(new ApiError($.application_is_deleted, 400));
  }

  // assure that : the application is not handled yet .
  if (application.verification.status !== 'pending') {
    return next(new ApiError($.the_application_was_already_handled, 400));
  }

  // TODO : send email.

  // create the corresponding company .
  const company = await Company.create({
    ..._.pick(application.toObject(), [
      'founder',
      'name',
      'email',
      'phone_number',
      'industry',
      'size',
      'description',
      'website',
      'founded_at',
      'location',
    ]),
    application_id: application._id,
    managers: [{ _id: application.founder._id, name: application.founder.name }],
  });

  // accept the application .
  application.verification.status = 'accepted';
  application.verification.responsibile_support = {
    _id: req.admin._id,
    name: req.admin.username,
  };
  application.verification.modified_at = new Date();
  application.company_id = company._id;
  await application.save();

  // associate the company to the user (company founder relationship).
  await User.findByIdAndUpdate(company.founder._id, {
    $push: {
      companies: {
        company_id: company._id,
        company_name: company.name,
      },
    },
  });

  // sending a notification to the user .
  const user = await User.findById(application.founder._id);
  const tokens = await notificationController.getTokens(user._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      $.accepted_application,
      $.your_company_application_was_accepted,
      tokens.idsList[0],
      { application_id: application._id.toString(), company_id: company._id.toString() },
    );
    const notification = new Notification({
      title: $.accepted_application,
      body: $.your_company_application_was_accepted,
      reason: 'CompanyApplications',
      reason_id: application._id,
      notification_type: 'token',
      receivers: tokens.idsList,
      special_data: {
        data: company._id,
        type: 'Companies',
        payload: JSON.stringify({ status: 'accepted' }),
      },
    });
    notification.save();
  }

  // sanitize response .
  application = _.omit(application.toObject(), ['__v']);

  // response
  res.status(200).json({
    status: 'success',
    application,
  });
};

// @desc get all the applications of all the users
// @route Get /api/admin/company-applications/
// @access (authenticated, admin)

exports.getApplications = factory.getAll({
  Model: CompanyApplication,
  fieldsToSearch: ['name', 'description'],
  fieldsToOmitFromResponse: ['__v'],
});

// @desc get one application
// @route Get /api/admin/company-application/:id
// @access (authenticated, admin)

exports.getApplication = factory.getOne({
  Model: CompanyApplication,
  populationOpt: [],
  fieldsToOmitFromResponse: ['__v'],
});

// @desc download the application document file
// @route Get /api/admin/company-applications/documents/:documentName
// @access (authenticated, admin)

exports.downloadDocument = async (req, res, next) => {
  // extract the document url
  const documentUrl = req.params.documentUrl;

  // query the application
  const application = await CompanyApplication.findOne({ 'document.url': documentUrl });

  // assert that : the application that holds the file does exist .
  if (!application) {
    return next(
      new ApiError($.this_document_exists_but_its_application_is_absent_please_delete_it, 404, {
        merge: true,
      }),
    );
  }

  // get the file name
  const filename = getFileNameFromPrivateURL(documentUrl);

  // build the file path.
  const filePath = getFilePathByName(filename);

  if (process.env.NODE_ENV === 'development') {
    // assert that : the file does exist .
    if (!fs.existsSync(filePath)) {
      return next(new ApiError($.no_document_file_with_this_name, 404));
    }
    // set response header to fit the pdf file .
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; "filename=${filename}"`);

    // send the pdf file .
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    const file = bucket.file(filePath);

    // check if the file exists on the cloud .
    const [exists] = await file.exists();

    if (!exists) {
      return res
        .status(404)
        .json({ status: 'failure', messages: [$.no_document_file_with_this_name] });
    }

    await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2025',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    file.createReadStream().pipe(res);
  }
};

// @desc get the list of documents exist in the storage
// @route GET /api/admin/company-applications/documents/
// @access (authenticated, admin)

exports.getDocumentsList = async (req, res, next) => {
  try {
    // get the dir path .
    const directoryPath = path.join(
      __dirname,
      '../../../uploads/private/pdf/application_documents/',
    );

    // assure that : the file does exist.
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    // read the files names .
    const files = await fs.promises.readdir(directoryPath);

    // respnose .
    res.status(200).json({
      status: 'success',
      files,
    });
  } catch (err) {
    next(err);
  }
};

// @desc delete document from the storage
// @route DELETE /api/admin/company-applications/documents/:documentName
// @access (authenticated, admin (company manager role))

exports.deleteDocument = async (req, res, next) => {
  try {
    // extract the url .
    const documentUrl = req.params.documentUrl;

    // get the file name
    const filename = getFileNameFromPrivateURL(documentUrl);

    // get the file path
    const filePath = getFilePathByName(filename);

    // assert that : the file does exist .
    if (!fs.existsSync(filePath)) {
      return next(new ApiError($.no_document_file_with_this_name, 404));
    }

    // delete the file
    fs.promises.unlink(filePath);

    //respnose
    return res.status(204).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

// @desc count the applications with adjustable filteration
// @route GET /api/admin/company-applications/count
// @access (authenticated , admin)
exports.countApplications = async (req, res) => {
  const count = await documentsCounter({ Model: CompanyApplication, query: req.query });

  return res.status(200).json({
    status: 'success',
    application_count: count,
  });
};
