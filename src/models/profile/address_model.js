const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    country: { type: String, minlength: 3, maxlength: 128 },
    conservative: { type: String, minlength: 3, maxlength: 128 },
    city: { type: String, minlength: 3, maxlength: 128 },
    street: { type: String, minlength: 3, maxlength: 128 },
  },
  { _id: false },
);

module.exports = addressSchema;
