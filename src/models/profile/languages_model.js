const mongoose = require('mongoose');
const val = require('../../helper/custon_validation');
const capitalizeFirstLetter = string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const languageSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    maxlength: 100,
    minLength: 2,

    set: value => capitalizeFirstLetter(value),
    validate: {
      validator: function (value) {
        return val.isValidLanguage(value);
      },
      message: 'Invalid language',
    },
  },
  proficiency: {
    type: String,
    enum: [
      'elementary_proficiency',
      'limited_working_proficiency',
      'professional_working_proficiency',
      'full_professional_proficiency',
      'native_or_bilingual_proficiency',
    ],
    required: true,
  },
});
languageSchema.c;
module.exports = languageSchema;
