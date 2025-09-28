const mongoose = require('mongoose');

const savedProjectSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'FreelanceProjects',
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

savedProjectSchema.index({ user_id: 1, project_id: 1 }, { unique: true });

const SavedProject = mongoose.model('SavedProject', savedProjectSchema);
module.exports = SavedProject;
