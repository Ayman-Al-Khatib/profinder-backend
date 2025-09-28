const mongoose = require('mongoose');

const certificationsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 255,
  },
  organization: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 255,
  },
  description: {
    type: String,
    minlength: 24,
    maxlength: 1000,
  },

  issue_date: {
    type: Date,
    required: true,
    validate: [
      {
        validator: function (value) {
          return value <= new Date();
        },
        message: 'Issue date cannot be in the future',
      },
      {
        validator: function (value) {
          return value.getFullYear() >= 1900 && value.getFullYear() <= 2100;
        },
        message: 'Issue date must be between 1900 and 2100',
      },
    ],
  },

  expiration_date: {
    type: Date,
    validate: [
      {
        validator: function (value) {
          return value >= this.issue_date;
        },
        message: 'Expiration date must be after issue date',
      },
      {
        validator: function (value) {
          return value.getFullYear() >= 1900 && value.getFullYear() <= 2100;
        },
        message: 'Expiration date must be between 1900 and 2100',
      },
    ],
  },

  link: {
    type: String,
    trim: true,
    maxlength: 2048,
    validate: {
      validator: function (value) {
        const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/;
        return urlRegex.test(value);
      },
      message: props => `${props.value} is not a valid URL!`,
    },
  },
  certification_image: { type: String },
});

module.exports = certificationsSchema;
