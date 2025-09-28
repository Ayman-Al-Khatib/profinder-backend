const mongoose = require('mongoose');

const supportCenterMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportCenterConversations',
      required: true,
      index: true,
    },

    sender_type: {
      type: String,
      required: true,
      enum: ['Users', 'Admins'],
    },

    receiver_type: {
      type: String,
      required: true,
      enum: ['Users', 'Admins'],
    },

    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

supportCenterMessageSchema.index({ conversation: 1 });
supportCenterMessageSchema.index({ sender: 1 });
supportCenterMessageSchema.index({ receiver: 1 });

module.exports = mongoose.model('SupportCenterMessages', supportCenterMessageSchema);
