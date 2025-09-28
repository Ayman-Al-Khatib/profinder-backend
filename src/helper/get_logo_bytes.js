const fs = require('fs');
const path = require('path');

const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

exports.getLogoBytes = () => {
  const imagePath = path.join(__dirname, '../../assets/pro-finder-logo.png');
  const imageBytes = fs.readFileSync(imagePath);
  return imageBytes;
};

exports.defaultImageBytes = () => {
  const imagePath = path.join(__dirname, '../../assets/default.jpg');
  const imageBytes = fs.readFileSync(imagePath);
  return imageBytes;
};

exports.getImageBytes = async link => {
  if (process.env.NODE_ENV === 'development') {
    const imagePath = path.join(__dirname, '../../uploads', link);
    if (!fs.existsSync(imagePath)) return null;
    const imageBytes = fs.readFileSync(imagePath);
    return imageBytes;
  } else {
    const file = bucket.file('uploads/' + link);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    const [buffer] = await file.download();
    return buffer;
  }
};
