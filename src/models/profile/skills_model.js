const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  skill: {
    type: String,
    required: true,
    maxlength: 100,
    minlength: 3,
  },
  proficiency: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
});

module.exports = skillSchema;
