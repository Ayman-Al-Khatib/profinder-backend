const mongoose = require('mongoose');

const walletTransaactionEnum = ['pending', 'cancelled', 'succeeded'];

const Wallet = require('./wallets_model');

const walletTransactionSchema = new mongoose.Schema(
  {
    receiving_wallet_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Wallets',
      required: [true, 'The recieving wallet id is required'],
      validate: {
        validator: async function (id) {
          const wallet = await Wallet.findById(id);
          return wallet !== null;
        },
        message: 'The receiving wallet id does not correspond to a real wallet',
      },
    },
    sending_wallet_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Wallets',
      required: [true, 'The sending wallet id is required'],
      validate: {
        validator: async function (id) {
          const wallet = await Wallet.findById(id);
          return wallet !== null;
        },
        message: 'The receiving wallet id does not correspond to a real wallet',
      },
    },
    application_profit: {
      type: Number,
      required: [true, 'The profit that goes to the application is required'],
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'The profit should be greater than zero',
      },
    },
    amount: {
      type: Number,
      required: [true, 'The transaction amount is required'],
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'The amount should be greater than zero',
      },
    },
    status: {
      type: String,
      enum: walletTransaactionEnum,
      required: [true, 'The transaction status is required'],
    },
    respsonsible_admin: {
      type: {
        _id: {
          type: mongoose.Schema.ObjectId,
          ref: 'admins',
        },
        name: {
          type: String,
        },
      },
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

walletTransactionSchema.index({ receiving_wallet_id: 1 });
walletTransactionSchema.index({ sending_wallet_id: 1 });
walletTransactionSchema.index({ amount: 1 });

module.exports = mongoose.model('WalletTransactions', walletTransactionSchema);
