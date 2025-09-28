/* eslint-disable no-unexpected-multiline */
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const ApiError = require('../utils/api_error');
const $ = require('../locales/keys');
const { random } = require('lodash');
const fs = require('fs');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

const multerOptions = (extentions, message) => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    const originalFileName = file.originalname.toLowerCase();
    const isAllowedExtension = extentions.some(extension => originalFileName.endsWith(extension));

    if (isAllowedExtension) {
      cb(null, true);
    } else {
      cb(new ApiError(message, 400, { extension_allowed: extentions }), false);
    }
  };

  const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
      fileSize: 8 * 1024 * 1024, // 8 MB in bytes
      files: 12, // Maximum 12 files in one request
    },
  });

  return upload;
};

exports.uploadSingleImage = (fieldName, extentions = ['.png', '.jpg', '.jpeg', '.svg']) =>
  multerOptions(extentions, $.only_images_allowed).single(fieldName);

exports.uploadMixOfImages = (arrayOfFields, extentions = ['.png', '.jpg', '.jpeg', '.svg']) =>
  multerOptions(extentions, $.only_images_allowed).fields(arrayOfFields);

exports.uploadSinglePDF = (fieldName, extentions = ['.pdf']) =>
  multerOptions(extentions, $.only_pdf_files_allowed).single(fieldName);

exports.uploadMixOfPDF = (arrayOfFields, extentions = ['.pdf']) =>
  multerOptions(extentions, $.only_pdf_files_allowed).fields(arrayOfFields);

exports.processFile = async (req, res, next, uploadPath, extension, fulInfo = false) => {
  const supportedImageFormats = [
    'heic',
    'heif',
    'avif',
    'jpeg',
    'jpg',
    'jpe',
    'tile',
    'dz',
    'png',
    'raw',
    'tiff',
    'tif',
    'webp',
    'gif',
    'jp2',
    'jpx',
    'j2k',
    'j2c',
    'jxl',
  ];

  req.pushImages = [];
  req.removeImages = [];
  req.saveImages = [];
  if (uploadPath) {
    uploadPath = `uploads/${uploadPath}`;
  } else {
    uploadPath = 'uploads/global';
  }

  // Function to generate a random pdf name
  function generateFileName(name, index) {
    const fileNameWithoutExtension = name.split('.').slice(0, -1).join('.');
    return `${fileNameWithoutExtension}-${Date.now()}-${random(10000)}-${index + 1}.${extension}`;
  }

  // Function to resize and save an image using Sharp
  async function processFile(file, index) {
    const buffer = file.buffer;
    const originalname = file.originalname;
    const fileName = generateFileName(originalname, index, extension);
    const filePath = path.join(uploadPath, fileName);

    // Check if upload directory exists, if not, create it
    if (!fs.existsSync(uploadPath) && process.env.NODE_ENV === 'development') {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    let quality = 80;
    let maxWidth = 1920;
    let maxHeight = 1080;

    if (supportedImageFormats.includes(extension.toLowerCase())) {
      req.saveImages.push(async function () {
        let processedBuffer = await sharp(buffer).toBuffer();

        let adjustedQuality = quality;
        while (processedBuffer.length / 1024 > 75 && adjustedQuality > 20) {
          console.log(processedBuffer.length, adjustedQuality); 
          processedBuffer = await sharp(buffer)
            .rotate()
            .resize({ width: maxWidth, height: maxHeight, fit: 'inside' })
            .toFormat(extension)
            [extension]({ quality: adjustedQuality })
            .toBuffer();
          adjustedQuality -= 5;
        }

        if (process.env.NODE_ENV === 'development') {
          await sharp(processedBuffer).toFile(filePath);
        } else {
          const file = bucket.file(filePath.replace(/\\/g, '/'));
          await file.save(processedBuffer);
        }
      });
    } else {
      req.saveImages.push(async function () {
        if (process.env.NODE_ENV === 'development') {
          fs.writeFileSync(filePath, buffer);
        } else {
          const file = bucket.file(filePath.replace(/\\/g, '/'));
          await file.save(buffer);
        }
      });
    }

    if (fulInfo) {
      delete file.buffer;
      file.url = filePath.replace(/\\/g, '/').replace('uploads/', '');
      return file;
    } else {
      return filePath.replace(/\\/g, '/').replace('uploads/', '');
    }
  }

  if (req.files && Object.keys(req.files).length > 0) {
    const files = Object.values(req.files);
    for (const file of files) {
      if (Array.isArray(file)) {
        const fieldname = file[0].fieldname;
        req.body[fieldname] = [];
        for (let index = 0; index < file.length; index++) {
          const info = await processFile(file[index], index);
          req.body[fieldname].push(info);
        }
        req.pushImages.push({
          [fieldname]: req.body[fieldname],
        });
      } else {
        const info = processFile(file, 0);
        req.body[file.fieldname] = [info];
        req.pushImages.push({ [file.fieldname]: [info] });
      }
    }
  } else if (req.file) {
    const info = await processFile(req.file, -1);
    req.body[req.file.fieldname] = info;
    req.pushImages.push({ [req.file.fieldname]: info });
  } else {
    for (let key in req.body) {
      if (/image|pdf|file/.test(key)) {
        if (req.body[key] != null) delete req.body[key];
        else req.removeImages.push(key);
      }
    }
  }

  next();
};
