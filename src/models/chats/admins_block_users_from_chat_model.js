const mongoose = require('mongoose');

const AdminBlockedUsersFromChatSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admins',
    required: true,
  },
  blocked_user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
});

module.exports = mongoose.model('AdminBlockedUsersFromChat', AdminBlockedUsersFromChatSchema);
