const mongoose = require('mongoose');

const educationsSchema = new mongoose.Schema({
  institution: {
    type: String,
    required: true,
    maxlength: 255,
    minlength: 3,
  },
  degree: {
    type: String,
    required: true,
    maxlength: 255,
    minlength: 3,
  },

  field_of_study: {
    required: true,
    type: String,
    maxlength: 255,
    minlength: 3,
  },

  start_date: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value <= new Date();
      },
      message: 'Start date date cannot be in the future',
    },
  },

  end_date: {
    type: Date,
    validate: {
      validator: function (value) {
        return value >= this.start_date;
      },
      message: 'Expiration date must be after start date',
    },
  },

  description: {
    type: String,
    maxlength: 1000,
    minlength: 3,
  },
});

module.exports = educationsSchema;
