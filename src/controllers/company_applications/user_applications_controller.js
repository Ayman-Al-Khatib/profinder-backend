// This module contains the user actions for
// dealing with the ' apply for a company account ' feature .

const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const winston = require('winston');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

const { CompanyApplication } = require('../../models/company_applications_model');
const processFile = require('../../helper/process_file');
const factory = require('../../helper/handlers_factory');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');
const getFileNameFromPrivateURL = require('../../helper/get_file_name_from_private_url');

const APPLICATION_DOCUMENTS_PATH = '/private/pdf/application_documents/';
const APPLICATION_DOCUMENT_NAME_GENERATOR = filename => {
  return (
    'APPLICATION_DOCUMENT-' +
    new Date().toISOString() +
    '-' +
    _.random(10000) +
    '-' +
    filename
  )
    .trim()
    .replace(/[\/\\^$*+?()|[\]{}:\s]/g, '-');
};

const getFilePathByName = filename => {
  return process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../../uploads/private/pdf/application_documents/', filename)
    : path.join('uploads/private/pdf/application_documents/', filename).replace(/\\/g, '/');
};

// @desc get company application for a user .
// @route Get /api/user/company-applications/:id
// @access (authenticated, user) .

exports.getApplication = async (req, res, next) => {
  // query the application .
  let application = await CompanyApplication.findById(req.params.id);

  // assure that : the application exists, not soft deleted .
  if (!application || application.deleted_at) {
    return next(new ApiError([$.application_not_found, req.params.id], 404, { merge: true }));
  }

  // assure that : the user have the access to this application
  if (application.founder._id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // send response .
  return res.status(200).json({
    status: 'success',
    application: application,
  });
};

// @desc get company applications for a user .
// @route Get /api/user/company-applications/ .
// @access (authenticated, user ) .

exports.getApplications = async (req, res, next) => {
  // we use founder._id in the request query forwarded to the
  // handlers factory in order to get
  // ONLY THE COMPANIES THAT HAS THIS USER AS FOUNDER AND NOT SOFT DELETED
  // and that because the factory uses the request query as filters
  // so I do omit such fields from the req.query in terms of securing the request .
  // other filters from the user are permissible .

  req.query = _.omit(req.query, [
    'founder',
    'founder._id',
    'founder.name',
    'deleted_at',
    '_id',
    'id',
  ]);

  // now specify for the handlers factory the founder id
  // and specify that the field deleted_at does not exist .
  req.query.deleted_at = { $exists: false };
  req.query = { ...req.query, 'founder._id': req.user._id };

  // response
  return factory.getAll({
    Model: CompanyApplication,
    fieldsToOmitFromResponse: ['__v'],
    fieldsToSearch: ['name', 'description'],
  })(req, res, next);
};

// @desc creating an application for a new company .
// @route POST /api/user/company-applications/ .
// @access (authenticated, user) .

exports.createApplication = async (req, res, next) => {
  // assure that : the user can have only one 'pending' application at a time .
  const exisitingApplication = await CompanyApplication.findOne({
    'founder._id': req.user.id,
    'verification.status': 'pending',
    deleted_at: undefined,
  });
  if (exisitingApplication) {
    // return next(new ApiError($.there_exists_another_company_application, 400));
  }

  // picking the fields from the request body .
  const fields = [
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
    'document',
  ];

  // load the request with additional values :

  // set the founder of the company to the user sending the request .
  req.body.founder = { _id: req.user.id, name: req.user.username };

  // save and adjust the information of the file and load the request with it.
  const file = await processFile(
    req.file,
    APPLICATION_DOCUMENT_NAME_GENERATOR,
    APPLICATION_DOCUMENTS_PATH,
    'private-pdf',
  );
  req.body.document = file;

  // sanitizing the response .
  const fieldsToOmitFromResponse = ['__v'];

  // response
  await factory.createOne({
    Model: CompanyApplication,
    fields,
    fieldsToOmitFromResponse,
  })(req, res, next);
};

// @desc update an application for a user
// @route Put /api/user/company-applications/:id
// @access (authenticated, user)

exports.updateApplication = async (req, res, next) => {
  const application = await CompanyApplication.findById(req.params.id);

  // assure that : the application exists, not soft deleted, is 'pending' so can still be edited .
  if (!application || application.deleted_at) {
    return next(new ApiError([$.application_not_found, req.params.id], 404, { merge: true }));
  }

  if (application.verification.status !== 'pending') {
    return next(new ApiError($.you_cannot_update_the_application_at_this_stage, 400));
  }

  // assure that : the user have the authority to update the application .
  if (application.founder._id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // fields that can be updated
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
    'document',
  ];

  // if a file was sent in the update form
  if (req.file) {
    // adjust and save the new file and load the request with it .
    const file = await processFile(
      req.file,
      APPLICATION_DOCUMENT_NAME_GENERATOR,
      APPLICATION_DOCUMENTS_PATH,
      'private-pdf',
    );

    req.body.document = file;

    // delete the old file from the storage .
    const oldFileName = getFileNameFromPrivateURL(application.document.url);

    try {
      const filePath = getFilePathByName(oldFileName);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {
          winston.info(`${oldFileName} - has been deleted successfully`);
        });
      }
    } catch (err) {
      return next(err);
    }
  }

  // sanitize response
  const fieldsToOmitFromResponse = ['__v'];

  // update and response .
  return await factory.updateOne({
    Model: CompanyApplication,
    fields,
    fieldsToOmitFromResponse,
  })(req, res, next);
};

// @desc delete an application
// @route Delete /api/user/company-applications/:id
// @access (authenticate, user)

exports.deleteApplication = async (req, res, next) => {
  const application = await CompanyApplication.findById(req.params.id);

  // assure that : application exists, not soft deleted .
  if (!application || application.deleted_at) {
    return next(new ApiError([$.application_not_found, req.params.id], 404, { merge: true }));
  }

  // assure that : the user have the authority to delete the application .
  if (application.founder._id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // delete the application .
  application.deleted_at = new Date();
  await application.save();

  // response .
  return res.status(204).send();
};

// @desc download the application document file
// @route Get /api/user/company-applications/documents/:documentName
// @access (authenticated, user)

exports.downloadDocument = async (req, res, next) => {
  // extract the file name
  const documentUrl = req.params.documentUrl;

  // query the application .
  const application = await CompanyApplication.findOne({ 'document.url': documentUrl });

  // assert that : the application that holds the file does exist, not soft deleted .
  if (!application || application.deleted_at) {
    return next(new ApiError($.no_document_file_with_this_name, 404, { merge: true }));
  }

  // assert that : the application holds the file belongs to the user sending the request .
  if (application.founder._id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // get the file name from the url
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
    res.setHeader('Content-Disposition', `attachment: filename=${filename}`);

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
    res.setHeader('Content-Disposition', `attachment: filename=${filename}`);

    file.createReadStream().pipe(res);
  }
};
