const mongoose = require('mongoose');

const freelanceApplicationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: [true, 'The user is required'],
    },
    project_id: {
      type: mongoose.Types.ObjectId,
      ref: 'FreelanceProjects',
      required: [true, 'The freelance project is required'],
    },
    checked: Boolean,
  },
  {
    timestamps: {
      createdAt: 'created_at',
    },
  },
);

freelanceApplicationSchema.index({ project_id: 1 });
freelanceApplicationSchema.index({ user_id: 1, project_id: 1 }, { unique: true });

const FreelanceApplication = mongoose.model('FreelanceApplications', freelanceApplicationSchema);

module.exports = FreelanceApplication;
