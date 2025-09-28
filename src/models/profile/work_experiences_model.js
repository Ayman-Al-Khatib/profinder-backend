const mongoose = require('mongoose');

const workExperienceSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true,
    maxlength: 255,
    minlength: 3,
  },
  start_date: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value <= new Date(); // Ensures start date is not in the future
      },
      message: 'Start date cannot be in the future',
    },
  },
  end_date: {
    type: Date,

    validate: {
      validator: function (value) {
        return !this.start_date || value >= this.start_date;
      },
      message: 'End date must be after or equal to start date',
    },
  },

  company: {
    type: String,
    maxlength: 255,
    minlength: 3,
  },

  location: {
    type: String,
    maxlength: 255,
    minlength: 3,
  },
  responsibilities: {
    type: String,
    maxlength: 1000,
    minlength: 3,
  },
});

module.exports = workExperienceSchema;
