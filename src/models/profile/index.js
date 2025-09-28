const mongoose = require('mongoose');
const extendSchema = require('../../utils/extentions_mongoose');

const Address = require('./address_model');
const Certification = require('./certifications_model');
const Language = require('./languages_model');
const Project = require('./projects_model');
const Skill = require('./skills_model');
const SocialMediaLink = require('./social_media_links_model');
const WorkExperience = require('./work_experiences_model');
const Education = require('./educations_model');
const File = require('../file_model');

const profileSchema = new mongoose.Schema(
  {
    full_name: { type: String, maxlength: 50, minlength: 3 },

    phone: { type: String, maxlength: 20, minlength: 10 },

    bio: { type: String, maxlength: 2048, minlength: 3 },

    date_of_birth: { type: Date },

    number_of_friends: { type: Number },

    email: { type: String, minlength: 3 },

    gender: { type: String, enum: ['male', 'female'] },

    pdf_cv: { type: File },

    address: { type: Address },

    social_media_links: [SocialMediaLink],

    certifications: [Certification],

    work_experiences: [WorkExperience],

    languages: [Language],

    projects: [Project],

    educations: [Education],

    skills: [Skill],
  },
  {
    validate: true,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

profileSchema.path('phone').validate(function (value) {
  const phoneRegex = /^(?:\+\d{1,3}\s*)?(?:\(\d{3}\)|\d{3})[- ]?\d{3}[- ]?\d{4}$/;
  return phoneRegex.test(value);
}, 'Invalid phone number format');

profileSchema.path('date_of_birth').validate(function (value) {
  return value <= new Date();
}, 'Date of birth cannot be in the future');

profileSchema.path('number_of_friends').validate(function (value) {
  return value >= 0;
}, 'Number of friends must be a positive integer');

profileSchema.path('gender').validate(function (value) {
  return ['male', 'female'].includes(value);
}, 'Gender must be either male or females');

extendSchema(profileSchema);

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
