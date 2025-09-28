//! TODO: Remove File
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const ApiError = require('../utils/api_error');
const $ = require('../locales/keys');
const { random } = require('lodash');
const fs = require('fs');

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    const fileExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    const originalFileName = file.originalname.toLowerCase();
    const isAllowedExtension = fileExtensions.some(extension =>
      originalFileName.endsWith(extension),
    );

    if (isAllowedExtension) {
      cb(null, true);
    } else {
      cb(new ApiError($.only_images_allowed, 400), false);
    }
  };

  const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
      fileSize: 8 * 1024 * 1024, // 8 MB in bytes
      files: 12, // Maximum 5 files in one request
    },
  });

  return upload;
};

exports.uploadSingleImage = fieldName => multerOptions().single(fieldName);

exports.uploadMixOfImages = arrayOfFields => multerOptions().fields(arrayOfFields);

exports.processImages = async (req, res, next, uploadPath) => {
  if (uploadPath) {
    uploadPath = `uploads/images/${uploadPath}`;
  } else {
    uploadPath = 'uploads/images/global';
  }

  // Function to generate a random image name
  function generateImageName(originalName, index = 0, extension = 'png') {
    const fileNameWithoutExtension = originalName.split('.').slice(0, -1).join('.');
    return `${fileNameWithoutExtension}-${Date.now()}-${random(10000)}-${index + 1}.${extension}`;
  }

  // Function to resize and save an image using Sharp
  async function processImage(buffer, index, extension, uploadPath, originalName) {
    const imageName = generateImageName(originalName, index, extension);
    const filePath = path.join(uploadPath, imageName);

    // Check if upload directory exists, if not, create it
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    await sharp(buffer).toFormat(extension)[extension]({ quality: 95 }).toFile(filePath);
    return imageName;
  }

  if (req.files && Object.keys(req.files).length > 0) {
    const files = Object.values(req.files);
    for (const file of files) {
      if (Array.isArray(file)) {
        req.body[file[0].fieldname] = [];
        for (let index = 0; index < file.length; index++) {
          const imageName = await processImage(
            file[index].buffer,
            index,
            'png',
            uploadPath,
            file[index].originalname,
          );
          req.body[file[0].fieldname].push(imageName);
        }
      } else {
        const imageName = await processImage(
          file.buffer,
          0,
          'png',
          uploadPath,
          file.originalname, // Pass the original file name here
        );
        req.body[file.fieldname] = imageName;
      }
    }
  } else if (req.file) {
    const imageName = await processImage(
      req.file.buffer,
      0,
      'png',
      uploadPath,
      req.file.originalname, // Pass the original file name here
    );
    req.body[req.file.fieldname] = imageName;
  } else {
    for (let key in req.body) {
      if (key.includes('image')) {
        delete req.body[key];
      }
    }
  }

  next();
};
