const mongoose = require('mongoose');

const jobApplication = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: [true, 'The user is required'],
    },
    job_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Jobs',
      required: [true, 'The job is required'],
    },
    checked: Boolean,
  },
  {
    timestamps: {
      createdAt: 'created_at',
    },
  },
);

jobApplication.index({ job_id: 1 });
jobApplication.index({ user_id: 1, job_id: 1 }, { unique: true });

const JobApplication = mongoose.model('JobApplications', jobApplication);

module.exports = JobApplication;
