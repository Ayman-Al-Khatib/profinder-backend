const mongoose = require('mongoose');

const Wallet = require('./wallets_model');
const Admin = require('./admins_model');
const transactionTypeEnum = ['deposit', 'withdraw'];
const transactionStatus = ['pending', 'accepted', 'rejected'];

const cashTransactionsSchema = new mongoose.Schema(
  {
    wallet_id: {
      type: mongoose.Schema.ObjectId,
      required: [true, 'The id of the wallet is required'],
      ref: 'Wallets',
      validate: {
        validator: async function (id) {
          const wallet = await Wallet.findById(id);
          return wallet !== null;
        },
        message: 'The wallet id does not correspond to a real wallet',
      },
    },
    customer_name: {
      type: String,
      required: true,
      maxlength: 64,
    },
    customer_national_number: {
      type: String,
      required: true,
      validate: {
        validator: function (val) {
          return val.length === 12;
        },
        message: 'The customer national number must be 12 digits',
      },
    },
    date: {
      type: Date,
      required: [true, 'The date of the cash transaction is required'],
      default: new Date(),
    },
    type: {
      type: String,
      enum: transactionTypeEnum,
      required: [true, 'The cash transaction type is required'],
    },
    status: {
      type: String,
      enum: transactionStatus,
      required: [true, 'The transaction status is required'],
    },
    amount: {
      type: Number,
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: 'The cash transaction amount should be greater than zero',
      },
      required: [true, 'The amount of the cash transaction is required'],
    },
    responsibile_support: {
      type: {
        _id: {
          type: mongoose.Schema.ObjectId,
          ref: 'admins',
          validate: {
            validator: async function (value) {
              const admin = await Admin.findById(value);
              return admin !== null;
            },
            message: 'The id does not correspond to an exsitent admin',
          },
        },
        name: {
          type: String,
        },
      },
      required: [true, 'The respnonsible admin is required'],
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

cashTransactionsSchema.index({ wallet_id: 1 });
cashTransactionsSchema.index({ amount: 1 });

module.exports = mongoose.model('CashTransactions', cashTransactionsSchema);
