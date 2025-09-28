const ApiError = require('../api_error');
const $ = require('../../locales/keys');

const SUPPORTEd_IMAGE_FORMAT = ['.png', '.jpg', '.jpeg', '.svg'];

exports.validateRequiredPDFUpload = (req, res, next) => {
  if (!req.file) {
    return next(new ApiError($.no_file_uploaded, 400));
  }

  const originalFileName = req.file.originalname;
  const isAllowedExtension = originalFileName.endsWith('.pdf');

  if (!isAllowedExtension) {
    return next(new ApiError($.only_pdf_files_allowed, 400));
  }

  next();
};

exports.validateOptionalPDFUpload = (req, res, next) => {
  if (req.file && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
    return next(new ApiError($.only_pdf_files_allowed, 400));
  }
  next();
};

exports.validateOptinalMutliplePDFUpload = fieldName => {
  return (req, res, next) => {
    if (req.files && req.files[fieldName]?.length > 0) {
      let validFormat = true;
      const files = req.files[fieldName];
      files.forEach(file => {
        if (!file.originalname.toLowerCase().endsWith('.pdf')) validFormat = false;
      });
      if (!validFormat) return next(new ApiError($.only_pdf_files_allowed, 400));
      if (files.length > 5)
        return next(new ApiError($.too_many_files_uploaded_Maximum_number_of_files_allowed, 400));
    }
    return next();
  };
};

exports.validateRequiredImageUpload = (req, res, next) => {
  if (!req.file) {
    return next(new ApiError($.no_file_uploaded, 400));
  }

  const filename = req.file.originalname.toLowerCase();

  const isAllowedExtension = SUPPORTEd_IMAGE_FORMAT.some(format => filename.endsWith(format));

  if (!isAllowedExtension) {
    return next(new ApiError($.only_images_allowed, 400));
  }

  next();
};

exports.validateOptionalImageUpload = (req, res, next) => {
  if (req.file) {
    const filename = req.file.originalname.toLowerCase();
    const isAllowedExtension = SUPPORTEd_IMAGE_FORMAT.some(format => filename.endsWith(format));

    if (!isAllowedExtension) {
      return next(new ApiError($.only_images_allowed, 400));
    }
  }
  next();
};
