const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

exports.getCompany = [validationHandler.validateParamId, validationHandler.handleValidationResult];

exports.blockUser = [
  validationHandler.validateParamId,
  body('user_id')
    .notEmpty()
    .withMessage($.the_user_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.id_is_not_valid),
  validationHandler.handleValidationResult,
];

exports.unBlockUser = [
  validationHandler.validateParamId,
  body('user_id')
    .notEmpty()
    .withMessage($.the_user_id_is_required)
    .bail()
    .isMongoId()
    .withMessage($.id_is_not_valid),
  validationHandler.handleValidationResult,
];

exports.getAllCompanyExperiences = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getOneCompanyExperience = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.rejectCompanyExperience = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.acceptCompanyExperience = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.resign = [validationHandler.validateParamId, validationHandler.handleValidationResult];
