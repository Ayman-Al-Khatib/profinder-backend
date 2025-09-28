const mongoose = require('mongoose');

const File = require('../models/file_model');
const uniqueArrayValues = require('../helper/unique_array_values');

const contractStatusEnum = [
  'awaiting_executor_acception',
  'refused_by_executor',
  'pending',
  'shipped_from_executor',
  'successfully_done', // simply , make the wallet transaction
  'admin_revising_it', // or let the admin decide , either make the transaction or cancel it and make another transactions .
  'resolved_by_admin',
];

const freelanceContractSchema = new mongoose.Schema(
  {
    freelance_project_id: {
      type: mongoose.Types.ObjectId,
      ref: 'FreelanceProjects',
      required: true,
    },
    service_publisher_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    service_executor_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    responsibile_support: {
      _id: { type: mongoose.Schema.ObjectId },
      name: String,
      documentry: String,
      wallet_transaction_id: {
        type: mongoose.Types.ObjectId,
        ref: 'WalletTransactions',
      },
    },
    status: {
      type: String,
      required: true,
      enum: contractStatusEnum,
    },
    description: {
      type: String,
      min: 128,
      max: 4096,
      required: true,
    },
    terms_and_conditions: {
      type: String,
      min: 128,
      max: 4096,
      required: true,
    },
    attached_links: {
      type: [String],
      validate: [
        {
          validator: function (value) {
            if (value.length === 0) return true;
            return value.length > 0 && value.length <= 10;
          },
          message: 'The attached links must be an array with 1 to 10 elements',
        },
        {
          validator: function (value) {
            if (value.length === 0) return true;
            value.forEach(element => {
              if (typeof element !== 'string' || element.length < 10 || element.length > 512)
                return false;
            });
            return true;
          },
          message: 'The each attached link should be a string between 10 and 512 chars',
        },
        {
          validator: uniqueArrayValues,
          message: 'The attached links should be unique',
        },
      ],
    },
    attached_files: {
      type: [File],
      minlength: 1,
      maxlength: 5,
    },
    payment: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: 'The payment amount cannot be negative',
      },
    },
    start_date: { type: Date, required: [true, 'The start date is required'] },
    deadline: { type: Date, required: [true, 'The deadline of the contract is required'] },
    end_date: Date,
    wallet_transaction_id: {
      type: mongoose.Types.ObjectId,
      ref: 'WalletTransactions',
      required: [true, 'The wallet transaction id is required'],
    },
    deleted_at: Date,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

freelanceContractSchema.index({ freelance_project_id: 1 });
freelanceContractSchema.index({ service_publisher_id: 1 });
freelanceContractSchema.index({ service_executer_id: 1 });
freelanceContractSchema.index({ status: 1 });

module.exports = mongoose.model('Contracts', freelanceContractSchema);
