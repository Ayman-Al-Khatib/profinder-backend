const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'Users',
      'Posts',
      'Companies',
      'Follow',
      'Contracts',
      'CompanyApplications',
      'ManagerRequests',
      'CashTransactions',
      'FreelanceProjects',
    ],
  },
  reason_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reason',
  },
  notification_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  sent_by: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    ref: 'Users',
  },
  notification_type: {
    type: String,
    required: true,
    enum: ['topic', 'token'],
  },
  receivers: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
    ref: 'Users',
  },
  special_data: {
    data: {
      type: mongoose.Schema.Types.ObjectId,
      // required: true,
      refPath: 'special_data.type',
    },
    type: {
      type: String,
      // required: true,
      enum: ['Users', 'Companies', 'Contracts'],
    },
  },
});

NotificationSchema.pre('save', function (next) {
  if (this.notificationType === 'topic') {
    this.receivers = [];
  } else if (!Array.isArray(this.receivers)) {
    this.receivers = [this.receivers];
  }
  next();
});

const Notification = mongoose.model('Notifications', NotificationSchema);

module.exports = Notification;
