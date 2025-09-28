const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 255, minlength: 3 },

  description: { type: String, maxlength: 1000, minlength: 3 },

  start_date: { type: Date, required: true },

  end_date: { type: Date },

  skills_used: {
    type: [String],
    required: true,
    validate: {
      validator: function (skills) {
        return skills.length > 0 && skills.every(skill => skill.length >= 3 && skill.length <= 50);
      },
      message:
        'At least one skill must be used in the project and all skills must have lengths between 3 and 50 characters',
    },
  },

  images: { type: [String] },

  contributors: {
    type: [
      {
        type: String,
        required: true,
        minlength: [3, 'Contributor name must be at least 3 characters long'],
        maxlength: [255, 'Contributor name cannot exceed 255 characters'],
      },
    ],
  },
});

module.exports = projectSchema;
