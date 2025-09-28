const mongoose = require('mongoose');

const extendSchema = require('../utils/extentions_mongoose');
const fileSchema = require('./file_model');
const { employeeRanges } = require('./company_applications_model');

const companySchema = new mongoose.Schema(
  {
    founder: {
      _id: {
        type: mongoose.Types.ObjectId,
        ref: 'Users',
        required: [true, 'The founder id is required'],
      },
      name: {
        type: String,
        required: [true, 'The founder name is required'],
      },
    },
    name: {
      type: String,
      required: [true, 'The comapny name is required'],
      minlength: [3, 'The company name should be at least 3 characteres long'],
      maxlength: [50, 'The company name should be at max 50 characteres long'],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_\s-]+$/.test(v);
        },
        message: () =>
          'Company name can only contain letters, numbers, spaces, underscores, and hyphens',
      },
    },
    email: {
      type: String,
      unique: [true, 'The company email must be unique'],
      required: [true, 'The company email is required'],
      minlength: [5, 'The company email should be at least 5 characteres long'],
      maxlength: [255, 'The company email should be at max 255 characteres long'],
      validate: {
        validator: function (v) {
          return /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`,
      },
    },
    phone_number: {
      type: String,
      required: [true, 'The company phone number is required'],
      maxlength: [15, 'The company phone number should be at most 15 digit'],
      validate: {
        validator: function (v) {
          return /^\+(?:[0-9] ?){6,14}[0-9]$/.test(v);
        },
        message: () =>
          'Please enter a valid phone number in the international format , such as : +963 9XX XXX XXX',
      },
    },
    industry: {
      type: String,
      required: [true, 'The company industry is required'],
      minlegnth: [2, 'The company industry should be at least 2 characteres long'],
      maxlength: [64, 'The company industry should be at most 64 characteres long'],
    },
    size: {
      requierd: [true, 'The company size is required'],
      type: { min: Number, max: Number },
      enum: employeeRanges,
      _id: false,
    },
    description: {
      type: String,
      required: [true, 'The company description is required'],
      minlength: [16, 'The company description should be at least 16 characteres'],
      maxlength: [2048, 'The company description should be at most 2048 characteres'],
    },
    website: {
      type: String,
      minlength: [10, 'The company website should be at least 10 characteres long'],
      maxlength: [128, 'The company website should be at most 128 characteres long'],
      validate: {
        validator: function (v) {
          // eslint-disable-next-line no-useless-escape
          return /^((https?:www\.)|(https?:\/\/)|(www\.))?[\w/\-?=%.][-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9]{1,6}(\/[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)?$/.test(
            v,
          );
        },
        message: () =>
          'The website should start with http://, https://, or ftp://, and include a valid domain name and top-level domain (TLD).',
      },
    },
    founded_at: {
      type: Date,
    },
    location: {
      type: String,
      minlength: [3, 'The company location should be at least 3 characeters long'],
      maxlength: [128, 'The company location should be at most 64 characteres long'],
      required: [true, 'The company location is required'],
    },
    image: fileSchema,
    cover_image: fileSchema,
    deleted_at: {
      type: Date,
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
    application_id: {
      type: mongoose.Types.ObjectId,
      ref: 'CompanyApplications',
      required: [true, 'The company must be connected to an accepted application .'],
    },
    jobs_count: {
      type: Number,
      default: 0,
    },
    managers: {
      type: [
        {
          _id: {
            type: mongoose.Types.ObjectId,
            ref: 'Users',
          },
          name: String,
        },
      ],
    },
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

extendSchema(companySchema);

companySchema.index({ name: 1, industry: 1, location: 1 });

const Company = mongoose.model('Companies', companySchema);

module.exports = Company;
