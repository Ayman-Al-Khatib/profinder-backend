const mongoose = require('mongoose');

const User = require('./users_model');
const walletStatusEnum = ['active', 'suspended'];

const walletSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: [true, 'The id of the wallet owner is required'],
      unique: [true, 'The user can only have one wallet'],
      validate: {
        validator: async function (id) {
          const user = await User.findById(id);
          return user !== null;
        },
        message: 'The user ID does not correspond to a real user',
      },
    },
    user_name: {
      type: String,
      required: [true, 'The wallet owner name is required'],
      unique: [true, 'The wallet owner name should be unique'],
    },
    balance: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'The balance cannot be smaller than 0',
      },
    },
    status: {
      type: String,
      default: 'active',
      enum: walletStatusEnum,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

walletSchema.index({ user_id: 1 });
walletSchema.index({ balance: 1 });

module.exports = mongoose.model('Wallets', walletSchema);
