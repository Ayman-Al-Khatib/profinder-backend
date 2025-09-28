const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    ],

    latest_message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Messages',
      default: null,
    },

    deleted_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    blocked_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  },

  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversations', ConversationSchema);
