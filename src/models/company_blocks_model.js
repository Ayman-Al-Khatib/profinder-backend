const mongoose = require('mongoose');

const companyBlockSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Companies',
      required: [true, 'The company id is required'],
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: [true, 'The user id is required'],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
    },
  },
);

companyBlockSchema.index({ user_id: 1, company_id: 1 }, { unique: true });

const CompanyBlock = mongoose.model('CompanyBlocks', companyBlockSchema);

module.exports = CompanyBlock;
