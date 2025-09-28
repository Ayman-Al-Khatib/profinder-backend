const multer = require('multer');
const ApiError = require('../utils/api_error');
const $ = require('../locales/keys');

const SUPPORTEd_IMAGE_FORMAT = ['.png', '.jpg', '.jpeg', '.svg'];

const multerOptions = (type, count) => {
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    const filename = file.originalname.toLowerCase();

    let isValidFormat;
    let error;
    if (type === 'image') {
      isValidFormat = SUPPORTEd_IMAGE_FORMAT.some(ex => filename.endsWith(ex));
      error = new ApiError($.only_images_allowed, 400);
    } else if (type === 'pdf') {
      isValidFormat = filename.endsWith('.pdf');
      error = new ApiError($.only_pdf_files_allowed, 400);
    } else {
      isValidFormat = true;
    }

    if (!isValidFormat) {
      cb(error, false);
    } else {
      cb(null, true);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 8 * 1024 * 1024, // 8 MB in bytes
      files: count, // Maximum 12 files in one request
    },
  });
};

exports.uploadSinglePDF = field => multerOptions('pdf', 1).single(field);

exports.uploadMultiplePDF = fieldsArr => multerOptions('pdf', 5).fields(fieldsArr);

exports.uploadSingleImage = field => multerOptions('image', 1).single(field);

exports.uploadMultipleImages = fieldsArr => multerOptions('image', 5).fields(fieldsArr);
