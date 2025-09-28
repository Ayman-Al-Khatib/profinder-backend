const mongoose = require('mongoose');
const extendSchema = require('../../utils/extentions_mongoose');

const postSchema = new mongoose.Schema(
  {
    publisher_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Users' },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies' },
    text: { type: String, maxLength: 4096, minLength: 3, required: true },
    images: { type: [String], maxlength: 12, default: undefined },

    topics: {
      type: [String],
      default: undefined,
      validate: {
        validator: function (arr) {
          return arr.length <= 5 && arr.every(str => str.length >= 2);
        },
        message:
          'Topics array must have at most 5 elements and each element must be a string with more than 2 letters.',
      },
    },

    likes_count: {
      type: Number,
      default: 0,
      min: [0, 'Likes count must be a non-negative number.'],
    },

    comments_count: {
      type: Number,
      default: 0,
      min: [0, 'Comments count must be a non-negative number.'],
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
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

// Add text index on the text field
postSchema.index({ text: 'text' });

// Add regular index on the topics field
postSchema.index({ topics: 1 });

postSchema.pre('validate', function (next) {
  if (!this.text && (!this.images || this.images.length === 0)) {
    return next(new Error('At least one of text or images must be provided.'));
  }
  next();
});
extendSchema(postSchema);
const Post = mongoose.model('Posts', postSchema);

module.exports = Post;
