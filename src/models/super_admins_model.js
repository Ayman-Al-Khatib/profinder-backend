const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const extendSchema = require('../utils/extentions_mongoose');

const superAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: function () {
        return this.source !== 'github';
      },
      minlength: [5, 'Email must be at least 5 characters long'],
      maxlength: [255, 'Email cannot exceed 255 characters'],
      validate: {
        validator: function (v) {
          return /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`,
      },
    },

    password_changed_at: {
      type: Date,
      default: undefined,
    },
    verify_code: {
      type: String,
    },

    password: {
      type: String,
      required: function () {
        return this.source === 'email';
      },
      validate: {
        validator: function (v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-_=+{};:,<.>])(?=.*[^\da-zA-Z]).{8,}$/.test(
            v,
          );
        },
        message: props => `${props.value} is not a valid password!`,
      },
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
    deleted_at: {
      type: Date,
    },
    last_login: { type: Date },
    last_logout: { type: Date },
  },

  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

superAdminSchema.pre('save', async function (next) {
  // Check if the password field has been modified

  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    this.password_changed_at = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

superAdminSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate().$set;

  if (update.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(update.password, salt);
      update.password = hashedPassword;
      update.password_changed_at = Date.now();
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});
extendSchema(superAdminSchema);

const SuperAdmin = mongoose.model('SuperAdmins', superAdminSchema);

module.exports = SuperAdmin;
