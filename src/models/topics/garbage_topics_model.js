const mongoose = require('mongoose');

const garbageTopicsSchema = new mongoose.Schema({
  topic: {
    type: String,
    unique: true,
    minlength: 2,
    maxlength: 64,
    required: true,
    index: true,
  },
  count: {
    type: Number,
    min: 0,
    default: 1,
  },
});
const GarbageTopics = mongoose.model('GarbageTopics ', garbageTopicsSchema);

module.exports = GarbageTopics;
