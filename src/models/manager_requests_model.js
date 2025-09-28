const mongoose = require('mongoose');

const managerRequestSchema = new mongoose.Schema(
  {
    sender: {
      id: {
        type: mongoose.Types.ObjectId,
        ref: 'Users',
        required: [true, 'The manager request sender id is required'],
      },
      name: {
        type: String,
        required: [true, 'The manager request sender name is requird'],
      },
    },
    receiver: {
      id: {
        type: mongoose.Types.ObjectId,
        ref: 'Users',
        required: [true, 'The manager request reciever id is required'],
        validate: {
          validator: function (value) {
            return this.sender.id !== value;
          },
          message: 'sender id and reciever id must be different',
        },
      },
      name: {
        type: String,
        required: [true, 'The manager request reciever name is required'],
      },
    },
    company: {
      id: {
        type: mongoose.Types.ObjectId,
        ref: 'Companies',
        required: [true, 'The manager request company id is required'],
      },
      name: {
        type: String,
        required: [true, 'The manager request company name is required'],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

managerRequestSchema.index({ 'sender.id': 1 });
managerRequestSchema.index({ 'reciever.id': 1 });

module.exports = mongoose.model('ManagerRequests', managerRequestSchema);
