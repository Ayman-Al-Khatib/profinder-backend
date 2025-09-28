const mongoose = require('mongoose');
const extendSchema = require('../../utils/extentions_mongoose');

const commentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Users' },
    post_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Posts' },
    text: { type: String, required: true, maxLength: 2048 },
    deleted_at: { type: Date },

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
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);
extendSchema(commentSchema);
const Comment = mongoose.model('Comments', commentSchema);
module.exports = Comment;
