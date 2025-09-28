const mongoose = require('mongoose');

const statusEnum = require('../../constant/report_status_enum');

const typesEnum = ['Companies', 'Jobs', 'FreelanceProjects', 'Users', 'Posts', 'Comments'];

const reportSchema = new mongoose.Schema(
  {
    reporter_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Users' },
    reported_item_id: { type: mongoose.Schema.Types.ObjectId, refPath: 'type', required: true },
    reason: { type: String, required: true },
    responsibile_support_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins' },
    responsibile_support_name: { type: String },
    status: { type: String, enum: statusEnum, default: statusEnum[0], required: true },
    comment: { type: String },
    type: { type: String, enum: typesEnum, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

reportSchema.index({ reported_item_id: 1 });

const Report = mongoose.model('Reports', reportSchema);

module.exports = Report;
