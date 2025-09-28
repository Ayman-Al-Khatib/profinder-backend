const { validationResult, param, body } = require('express-validator');
const mongoose = require('mongoose');
const $ = require('../locales/keys');
const tr = require('../helper/translate');
const ApiError = require('../utils/api_error');
function handleValidationResult(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Extract error messages
    const messages = errors.array().map(error => error.msg);

    // Ensure unique error messages
    const uniqueMessages = Array.isArray(messages) ? [...new Set(messages)] : [messages];

    // Translate error messages using i18n
    const translatedMessages = uniqueMessages.map(msg => req.__(msg));

    return next(new ApiError(translatedMessages, req.statusCode || 400));
  }
  next();
}

function validateParamId() {
  return [param('id').isMongoId().withMessage($.the_id_entered_is_invalid), handleValidationResult];
}
function validateParamItemId(id) {
  return [param(id).isMongoId().withMessage($.the_id_entered_is_invalid), handleValidationResult];
}

function validateBodyListId() {
  return [
    body('ids')
      .optional()
      .isArray({ min: 1 })
      .withMessage($.ids_must_be_provided_as_an_array_and_cannot_be_empty),

    body('ids.*')
      .optional()
      .custom(id => mongoose.Types.ObjectId.isValid(id))
      .withMessage($.unable_to_find_some_identifiers),

    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const isOnlyEmptyArrayError =
          errors.errors.length === 1 &&
          errors.errors[0].msg === $.ids_must_be_provided_as_an_array_and_cannot_be_empty;

        const errorResponse = {
          message: isOnlyEmptyArrayError
            ? tr($.ids_array_cannot_be_empty)
            : tr($.unable_to_find_some_identifiers),
          ids: isOnlyEmptyArrayError ? [] : errors.array().map(error => error.value),
        };

        return res.status(400).json({ errors: errorResponse });
      }
      next();
    },
  ];
}

module.exports = {
  handleValidationResult: handleValidationResult,
  validateParamItemId: validateParamItemId,
  validateParamId: validateParamId(),
  validateBodyListId: validateBodyListId(),
};
