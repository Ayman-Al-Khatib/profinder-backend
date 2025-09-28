const path = require('path');
const fs = require('fs');

const admin = require('firebase-admin');
const bucket = admin.storage().bucket();
const sharp = require('sharp');
const _ = require('lodash');

module.exports = async (
  file,
  filenameGenerator,
  fileUploadPath,
  type,
  imageConvertFormat = 'jpeg',
) => {
  // generate the file name .
  const filename = filenameGenerator(file.originalname);

  let filePathInDisk;
  if (process.env.Node_ENV === 'development') {
    // generate the directory path in which the file will be saved .
    const dirPathInDisk = path.join(__dirname, '../../uploads/', fileUploadPath);

    // if the directory does not exist , create it
    if (!fs.existsSync(dirPathInDisk)) {
      fs.mkdirSync(dirPathInDisk, { recursive: true });
    }

    // generate the path of the file itself .
    filePathInDisk = path.join(dirPathInDisk, filename);
  }

  // the url that the users can use to get the file .
  let url;

  if (type === 'image') {
    // the file is an image
    if (process.env.NODE_ENV === 'development') {
      // save and adjust the image using sharp , then save it to local disk .
      await sharp(file.buffer).toFormat(imageConvertFormat, { quality: 80 }).toFile(filePathInDisk);
    } else {
      // first : adjust the quality and size of the image .

      let quality = 80;
      let buffer = await sharp(file.buffer).toBuffer();
      while (buffer.length / 1024 > 75 && quality > 20) {
        buffer = await sharp(buffer)
          .resize({ widt: 1920, height: 1080, fit: 'inside' })
          .toFormat(imageConvertFormat, { quality: quality })
          .toBuffer();
        quality -= 5;
      }
      // then : create a file on cloud and save the image to it .
      const pathOnCloud = path.join('uploads/', fileUploadPath, filename).replace(/\\/g, '/');
      const fileOnCloud = bucket.file(pathOnCloud);
      await fileOnCloud.save(buffer);
    }
    // create the url of the file .
    url = path.join(fileUploadPath, filename).replace(/\\/g, '/');
  } else {
    // the file is a pdf
    if (process.env.Node_ENV === 'development') {
      // save the file into the disk .
      fs.writeFileSync(filePathInDisk, file.buffer);
    } else {
      // create a file on the cloud and save the pdf to it .
      const pathOnCloud = path.join('uploads/', fileUploadPath, filename).replace(/\\/g, '/');
      const fileOnCloud = bucket.file(pathOnCloud);
      await fileOnCloud.save(file.buffer);
    }

    url = type === 'private-pdf' ? 'Private:' + filename : undefined;
  }

  file = _.pick(file, ['originalname', 'encoding', 'mimetype', 'size']);
  return { ...file, url: url };
};
