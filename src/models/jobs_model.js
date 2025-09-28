const mongoose = require('mongoose');

const uniqueArrayValues = require('../helper/unique_array_values');
const languages = require('../constant/languages');

const workPlaceTypes = ['On Site', 'Hybrid', 'Remote'];
const jobTypes = ['Apprenticeship', 'Part time', 'Full time', 'Contract', 'Project based'];
const positionLevels = ['Intern', 'Junior', 'Senior', 'Leader', 'Manager'];
const experienceLevels = [
  'No experience',
  '1 - 3 years',
  '3 - 5 years',
  '5 - 10 years',
  'More than 10 years',
];

const jobSchema = new mongoose.Schema(
  {
    company: {
      id: {
        type: mongoose.Types.ObjectId,
        ref: 'Companies',
        required: [true, 'The copmany id of the job is required'],
      },
      name: {
        type: String,
        required: [true, 'The company name of the job is required'],
      },
    },
    publishing_manager: {
      id: {
        type: mongoose.Types.ObjectId,
        ref: 'Users',
        required: [true, 'The publishing manager id of the job is required'],
      },
      name: {
        type: String,
        required: [true, 'The publishing manager name of the job is required'],
      },
      public: {
        type: Boolean,
        default: false,
      },
    },
    title: {
      type: String,
      required: [true, 'The job title is required'],
      minlength: [16, 'The job title should be at least 16 characters long'],
      maxlength: [128, 'The job title should be at most 128 characters long'],
    },
    description: {
      type: String,
      required: [true, 'The job description is required'],
      minlength: [64, 'The job description should be at least 64 characters long'],
      maxlength: [4096, 'The job description should be at most 4096 characters long'],
    },
    requirements: {
      type: String,
      required: [true, 'The job requirements are required'],
      minlength: [64, 'The job requirements should be at least 64 characters long'],
      maxlength: [4096, 'The job requirements should be at most 4096 characters long'],
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
    location: {
      type: String,
      required: [true, 'The job location is required'],
      minlength: [8, 'The job location should be at least 8 characteres long'],
      maxlength: [128, 'The job location should be at most 128 characters logn'],
    },
    languages: {
      type: [String],
      validate: {
        validator: function (arr) {
          let allFieldsAreValid = true;
          arr.forEach(val => {
            if (!languages.some(lang => lang.code === val)) {
              allFieldsAreValid = false;
            }
          });
          return allFieldsAreValid;
        },
        message: 'The language is not supported',
      },
    },
    salary: {
      type: {
        min: Number,
        max: Number,
        currency: {
          type: String,
          minlength: [1, 'The salary currency should be at least 1 characters long'],
          maxlength: [16, 'The salary currency should be at most 16 characters long'],
        },
        _id: false,
      },
      validate: [
        {
          validator: function (salary) {
            return salary && typeof salary === 'object' && salary.min && salary.max;
          },
          message:
            'The salary must be an object with min, max and currency properties all are required ',
        },
        {
          validator: function (salary) {
            return salary.min < salary.max;
          },
          message: 'The salary max property must be greater than the min property',
        },
      ],
    },
    work_place: {
      type: String,
      enum: workPlaceTypes,
    },
    job_type: {
      type: String,
      enum: jobTypes,
    },
    position_level: {
      type: String,
      enum: positionLevels,
    },
    experience: {
      type: String,
      enum: experienceLevels,
    },
    applications_count: {
      type: Number,
      default: 0,
    },
    blocked: {
      type: {
        blocked_at: Date,
        responsibile_support_id: {
          type: mongoose.Types.ObjectId,
          ref: 'Users',
        },
        responsibile_support_name: String,
        _id: false,
      },
      default: undefined,
    },
    closes_at: Date,
    deleted_at: Date,
    total_reports: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'The reports count cannot be set to less than zero',
      },
    },
    unhandled_reports: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'The reports count cannot be set to less than zero',
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

jobSchema.pre('save', function (next) {
  if (this.topics && Array.isArray(this.topics)) {
    this.topics = this.topics.map(topic => topic.toLowerCase());
  }
  next();
});

jobSchema.index({ title: 'text', closes_at: 1, location: 1 }); // an index to enhance searching query
jobSchema.index({ 'company.id': 1, closes_at: 1 }); // an index to get the jobs of a specific company
jobSchema.index({ topics: 1 });

const Job = mongoose.model('Jobs', jobSchema);

module.exports = {
  Job,
  workPlaceTypes,
  jobTypes,
  experienceLevels,
  positionLevels,
};
