const languages = require('../constant/languages');
const $ = require('../locales/keys');
const { ObjectId } = require('mongoose').Types;
const ApiError = require('../utils/api_error');
function removeNullAndEmpty(removeList) {
  return (req, res, next) => {
    const body = req.body;
    if (!removeList) {
      for (const key in body) {
        if (body[key] === null || body[key] === '' || body[key] === 'null') {
          body[key] = undefined;
        }
      }
    } else {
      for (const key of removeList) {
        if (body[key] === null || body[key] === '' || body[key] === 'null') {
          body[key] = undefined;
        }
      }
    }

    return next();
  };
}

function anyThingToUpdate(listField) {
  return (req, res, next) => {
    for (const key in req.body) {
      if (!listField.includes(key)) {
        delete req.body[key];
      }
    }

    const cond =
      Object.keys(req.body).length === 0 &&
      Object.keys(req.file || {}).length === 0 &&
      Object.keys(req.files || {}).length === 0;

    if (cond) {
      next(new ApiError($.no_data_provided_for_update, 404));
    }

    return next();
  };
}

function optionalDateFieldValidator(field) {
  return (req, res, next) => {
    if (req.body[field] === undefined) return next();
    if (
      req.body[field] === null ||
      (req.body[field] !== undefined && req.body[field].length === 0)
    ) {
      req.body[field] = undefined;
    }
    return next();
  };
}

function isValidDate(dateString) {
  const regexDate = /^\d{4}-\d{2}-\d{2}$/;
  return regexDate.test(dateString);
}
const isValidLanguage = value => {
  const lowerCaseValue = value.toLowerCase();
  let tr = false;

  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];
    // const codeLowerCase = language.code.toLowerCase();
    const englishLowerCase = language.name.english.toLowerCase();
    const arabicLowerCase = language.name.arabic.toLowerCase();

    if (
      // lowerCaseValue === codeLowerCase ||
      lowerCaseValue === englishLowerCase ||
      lowerCaseValue === arabicLowerCase
    ) {
      tr = true;
      break;
    }
  }
  return tr;
};

const validateObjectId = id =>
  ObjectId.isValid(id) && new ObjectId(id).toString() === id.toString();

function typeAdmin(requiredType) {
  return (req, res, next) => {
    const adminType = req.admin.roles;

    if (!requiredType) {
      next(new ApiError('Admin type is required', 400));
    }

    if (!adminType.includes(requiredType)) {
      return next(
        new ApiError(
          [
            $.this_action_requires_admin_type,
            ` ${requiredType}.`,
            $.your_admin_type_is,
            adminType.join(' '),
          ],
          403,
          { merge: true },
        ),
      );
    }

    next();
  };
}

module.exports = {
  removeNullAndEmpty,
  isValidDate,
  isValidLanguage,
  optionalDateFieldValidator,
  anyThingToUpdate,
  validateObjectId,
  typeAdmin,
};
