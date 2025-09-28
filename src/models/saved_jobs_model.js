const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema(
  {
    job_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'Jobs',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'Users',
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
    },
  },
);

savedJobSchema.index({ user_id: 1, job_id: 1 }, { unique: true });

const SavedJob = mongoose.model('SavedJobs', savedJobSchema);
module.exports = SavedJob;
