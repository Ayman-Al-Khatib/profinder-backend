const { param } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');

function checkHash() {
  return [
    param('name').custom(value => {
      // Check if the name starts with #

      // Check if the length of the name is more than 2 characters
      if (value.trim().length < 1) {
        throw new Error('Hashtag must be more than 1 characters long');
      }
      return true;
    }),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  checkHash: checkHash(),
};
