const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema(
  {
    originalname: {
      type: String,
      required: true,
    },
    encoding: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

module.exports = fileSchema;
