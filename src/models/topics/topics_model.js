const mongoose = require('mongoose');

const topicsSchema = new mongoose.Schema({
  topic: {
    type: String,
    unique: true,
    minlength: 2,
    maxlength: 64,
    required: true,
    index: true,
  },
});

const Topics = mongoose.model('Topics', topicsSchema);

module.exports = Topics;
