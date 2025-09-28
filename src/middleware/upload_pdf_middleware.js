const fs = require('fs');

const multer = require('multer');
const ApiError = require('../utils/api_error');
const $ = require('../locales/keys');

const multerOptions = (uploadPath, fileNameGenerator) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const fileName = fileNameGenerator(file.originalname.trim())
        // eslint-disable-next-line no-useless-escape
        .replace(/[-\/\\^$*+?()|[\]{}:]/g, '_')
        .trim();
      cb(null, fileName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const originalFileName = file.originalname.toLowerCase();
    const isAllowedExtension = originalFileName.endsWith('.pdf');

    if (!isAllowedExtension) {
      cb(new ApiError($.only_pdf_files_allowed, 400), false);
    } else {
      cb(null, true);
    }
  };

  return multer({ storage: storage, fileFilter: fileFilter });
};

exports.uploadSinglePDF = (field, uploadPath, fileNameGenerator) => {
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
  return multerOptions(uploadPath, fileNameGenerator).single(field);
};

exports.uploadMultiplePDF = (fieldsArr, uploadPath, fileNameGenerator) => {
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
  return multerOptions(uploadPath, fileNameGenerator).fields(fieldsArr);
};
