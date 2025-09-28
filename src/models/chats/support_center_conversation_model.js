const mongoose = require('mongoose');

const supportCenterConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins', index: true },

    latest_message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportCenterMessages',
      default: null,
    },

    deleted_by_user: { type: Boolean, default: false },
    deleted_by_admin: { type: Boolean, default: false },
    is_closed: { type: Boolean, default: false },
  },

  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

supportCenterConversationSchema.index({ user_id: 1 });
supportCenterConversationSchema.index({ admin_id: 1 });

module.exports = mongoose.model('SupportCenterConversations', supportCenterConversationSchema);
