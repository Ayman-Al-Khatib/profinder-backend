const fs = require('fs');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

function deleteFileOrFiles(filePath) {
  const deleteSingleFile = async path => {
    if (process.env.NODE_ENV === 'development') {
      path = 'uploads/' + path;
      fs.access(path, fs.constants.F_OK, err => {
        if (err) {
          console.error(`File at path '${path}' does not exist`);
          return;
        }
        fs.unlink(path, err => {
          if (err) {
            console.error(`Error deleting file at path '${path}':`, err);
            return;
          }
          console.log(`File at path '${path}' deleted successfully`);
        });
      });
    } else {
      try {
        path = 'uploads/' + path;
        const file = bucket.file(path);

        const [exists] = await file.exists();
        if (!exists) {
          console.error(`File at path '${path}' does not exist`);
          return;
        }
        await file.delete();
        console.log(`File at path '${path}' deleted successfully`);
      } catch (error) {
        console.error(`Error in deleteSingleFile function:`, error);
      }
    }
  };

  if (typeof filePath === 'string') {
    deleteSingleFile(filePath);
  } else if (Array.isArray(filePath)) {
    filePath.forEach(path => {
      deleteSingleFile(typeof path === 'object' ? path.url : path);
    });
  } else if (typeof filePath === 'object') {
    if (Object.prototype.hasOwnProperty.call(filePath, 'url')) {
      deleteSingleFile(filePath.url);
    } else {
      console.error('Invalid input: filePath object must have a "url" property');
    }
  } else {
    console.error('Invalid input: filePath must be a string, an object, or an array');
  }
}

module.exports = deleteFileOrFiles;
