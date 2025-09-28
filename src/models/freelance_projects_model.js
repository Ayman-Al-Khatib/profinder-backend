const mongoose = require('mongoose');

const uniqueArrayValues = require('../helper/unique_array_values');

const projectStatusEnum = ['open', 'contracted', 'completed'];

const freelanceProjectSchema = new mongoose.Schema(
  {
    publisher_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
      required: [true, 'The publisher id of the freelance project is required'],
    },
    done_by: {
      type: mongoose.Types.ObjectId,
      ref: 'Users',
    },
    status: {
      type: String,
      default: 'open',
      enum: projectStatusEnum,
    },
    title: {
      type: String,
      required: true,
      minlength: 16,
      maxlength: 128,
    },
    description: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 4096,
    },
    topics: {
      type: [String],
      required: true,
      validate: [
        {
          validator: function (array) {
            return array.length > 0 && array.length <= 5;
          },
          message: 'The topics array must have more than 0 and less than or equal to 5 elements',
        },
        {
          validator: function (array) {
            let allFieldsAreValid = true;
            array.forEach(val => {
              if (typeof val !== 'string' || val.length > 32 || val.length < 2)
                allFieldsAreValid = false;
            });
            return allFieldsAreValid;
          },
          message: 'The topics array values must be a string with a length between 2 and 32',
        },
        {
          validator: uniqueArrayValues,
          message: 'The topics array must not contain duplicate values ( case insensitive ).',
        },
      ],
    },
    budget: {
      type: {
        _id: false,
        min: Number,
        max: Number,
        currency: String,
      },
      required: true,
      validate: {
        validator: function (value) {
          return (
            value.min > 0 &&
            value.max > 0 &&
            value.min < value.max &&
            value.currency.length > 0 &&
            value.currency.length <= 16
          );
        },
        message:
          'The budget property should be an object with valid min, max and currency properties',
      },
    },
    working_interval: {
      type: Number,
      min: 1,
      max: 365,
      required: true,
    },
    applications_count: {
      type: Number,
      default: 0,
    },
    image: String,
    review: {
      type: {
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          minlength: 4,
          maxlength: 256,
        },
      },
      default: null,
    },
    blocked: {
      type: {
        _id: false,
        blocked_at: Date,
        responsibile_support_name: String,
        responsibile_support_id: {
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
    deleted_at: Date,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

freelanceProjectSchema.pre('save', function (next) {
  if (this.topics && Array.isArray(this.topics)) {
    this.topics = this.topics.map(topic => topic.toLowerCase());
  }
  next();
});

freelanceProjectSchema.index({ publisher_id: 1 });
freelanceProjectSchema.index({ done_by: 1 });
freelanceProjectSchema.index({ topics: 1 });
freelanceProjectSchema.index({ title: 'text' });

const FreelanceProject = mongoose.model('FreelanceProjects', freelanceProjectSchema);
module.exports = FreelanceProject;
