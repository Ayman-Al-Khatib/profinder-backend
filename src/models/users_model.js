const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const extendSchema = require('../utils/extentions_mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
      unique: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_-]+$/.test(v);
        },
        message: props =>
          `${props.value} can only contain letters, numbers, underscores, and hyphens.`,
      },
    },

    approved: {
      type: Date,
    },

    email: {
      type: String,
      unique: true,
      required: function () {
        return this.source === 'email';
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

    source: {
      type: String,
      default: 'email',
      enum: ['email', 'google', 'github'],
    },

    verify_code: {
      type: String,
    },

    password_changed_at: {
      type: Date,
      default: undefined,
    },

    github_id: {
      type: String,
      required: function () {
        return this.source === 'github';
      },
    },

    google_id: {
      type: String,
      required: function () {
        return this.source === 'google';
      },
    },

    deleted_at: {
      type: Date,
    },

    blocked: {
      type: {
        _id: false,
        blocked_at: Date,
        username: String,
        support_id: {
          type: mongoose.Types.ObjectId,
          ref: 'Admins',
        },
      },
    },
    total_reports: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: props =>
          `${props.value} is not a valid number! total_reports must be a non-negative number.`,
      },
    },
    unhandled_reports: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: props =>
          `${props.value} is not a valid number! unhandled_reports must be a non-negative number.`,
      },
    },
    profile_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      default: function () {
        return this._id;
      },
    },

    background_image: { type: String },

    profile_image: { type: String },

    last_login: { type: Date },
    last_logout: { type: Date },
    interests: [
      {
        type: String,
        set: interest => interest.toLowerCase(),
      },
    ],
    // Ahmad

    wallet_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Wallets',
      index: true,
    },

    companies: [
      {
        _id: false,
        company_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Companies',
        },
        company_name: {
          type: String,
        },
        company_image: { type: String, default: null },
      },
    ],

    manager_at: [
      {
        _id: false,
        company_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Companies',
        },
        company_name: {
          type: String,
        },
        company_image: { type: String, default: null },
      },
    ],

    freelance_rating: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          return val >= 0;
        },
        message: 'The freelance_rating cannot be a negative number',
      },
    },

    total_rating: Number,
    rating_count: Number,
  },

  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

userSchema.pre('save', async function (next) {
  this.profile_id = this._id;
  this.interests = [...new Set(this.interests)];
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

userSchema.pre('findOneAndUpdate', async function (next) {
  this.interests = [...new Set(this.interests)];
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

extendSchema(userSchema);
const User = mongoose.model('Users', userSchema);

module.exports = User;
