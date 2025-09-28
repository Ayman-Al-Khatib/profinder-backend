const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const extendSchema = require('../utils/extentions_mongoose');

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
      unique: true,
    },

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

    roles: {
      type: [
        {
          type: String,
          enum: ['walletManager', 'companyManager', 'freelancerManager', 'technicalSupport'],
        },
      ],
      required: true,
      validate: {
        validator: function (roles) {
          return roles.length > 0 && new Set(roles).size === roles.length;
        },
        message: () => `Roles must be unique within the array and cannot be empty`,
      },
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

    profile_image: String,
    background_image: String,
    password_changed_at: Date,
    verify_code: String,
    deleted_at: Date,
    last_login: { type: Date },
    last_logout: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

// Pre-save middleware for hashing password
adminSchema.pre('save', async function (next) {
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
    return next(error); // Pass error to next middleware or error handler
  }
});

// Pre-update middleware for hashing password
adminSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate().$set;

  if (update.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(update.password, salt);
      update.password = hashedPassword;
      update.password_changed_at = Date.now();
      return next();
    } catch (error) {
      return next(error); // Pass error to next middleware or error handler
    }
  }

  return next();
});

// Extend schema if needed
extendSchema(adminSchema);

const Admin = mongoose.model('Admins', adminSchema);

module.exports = Admin;
