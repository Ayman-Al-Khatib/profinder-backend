const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

exports.getCompany = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.getAllManagerCompanies = [
  body('user_id')
    .exists()
    .withMessage($.the_user_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.id_is_not_valid),
  validationHandler.handleValidationResult,
];

exports.blockCompany = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.unBlockCompany = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getCompanyReports = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];
