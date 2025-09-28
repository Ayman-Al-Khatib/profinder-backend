const mongoose = require('mongoose');

const status = ['pending', 'accepted'];

// NOTE : a company work experience ( or connection ) between a user and a company
// is an experience for this user working in this company that NEEDS TO
// BE VERIFIED FROM THE COMPANY MANAGERS .
// unlike the work experience inside the profile that does not need to be verified .
// that is the reason why I called it WORK CONNECTION , in order not to have misapprehension.

const companyExperienceSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Companies',
      required: [true, 'The company id is required'],
    },
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: [true, 'The user id is requried'],
    },
    user_name: {
      type: String,
      required: [true, 'The user name is required'],
    },
    start_date: {
      type: Date,
      required: [true, 'The start date is required'],
    },
    end_date: {
      type: Date,
      default: null,
    },
    verification: {
      type: String,
      enum: status,
      default: 'pending',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

companyExperienceSchema.index({ user_id: 1 });
companyExperienceSchema.index({ company_id: 1 });

const CompanyExperience = mongoose.model('CompanyExperiences', companyExperienceSchema);

module.exports = CompanyExperience;
