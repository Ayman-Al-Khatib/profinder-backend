const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

const validatePDFupload = (req, res, next) => {
  if (!req.file) {
    return next(new ApiError($.no_file_uploaded, 400));
  }

  const originalFileName = req.file.filename;
  const isAllowedExtension = originalFileName.endsWith('.pdf');

  if (!isAllowedExtension) {
    return next(new ApiError($.only_pdf_files_allowed, 400));
  }

  next();
};

module.exports = validatePDFupload;
