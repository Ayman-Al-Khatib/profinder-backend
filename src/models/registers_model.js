const mongoose = require('mongoose');

const registerTypes = ['profit', 'project', 'job', 'user'];

const registerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: registerTypes,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

registerSchema.index({ type: 1, date: 1 });

const Register = mongoose.model('Registers', registerSchema);
module.exports = Register;
