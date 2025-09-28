const mongoose = require('mongoose');

function convertValues(obj) {
  // Check if obj is an object (excluding arrays and null)
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Recursively call convertValues for nested objects
        obj[key] = convertValues(obj[key]);

        // Check if the value is a date string
        if (typeof obj[key] === 'string' && isDateString(obj[key])) {
          // Convert string to JavaScript Date object
          obj[key] = new Date(obj[key]);
        } else if (typeof obj[key] === 'string' && isNumericString(obj[key])) {
          // Convert numeric string to integer
          obj[key] = parseInt(obj[key], 10);
        } else if (typeof obj[key] === 'string' && mongoose.Types.ObjectId.isValid(obj[key])) {
          // Convert string to Mongoose ObjectId
          obj[key] = new mongoose.Types.ObjectId(obj[key]);
        }
      }
    }
  }
  return obj;
}

function isDateString(str) {
  // Regular expression to check if the string is in one of the specified date formats
  // eslint-disable-next-line no-useless-escape
  const isoDateRegex = /^(?:\d{4}[-\/\\]\d{2}[-\/\\]\d{2})(?:T\d{2}:\d{2}:\d{2}.\d{3}Z)?$/;
  return isoDateRegex.test(str);
}

function isNumericString(str) {
  // Regular expression to check if the string is a numeric integer
  // Example: '123', '-456'
  const numericRegex = /^-?\d+$/;
  return numericRegex.test(str);
}

module.exports = convertValues;
