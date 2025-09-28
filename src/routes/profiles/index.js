const express = require('express');
const users = express.Router();
const public = express.Router();
const accessControl = require('../../middleware/access_control_middleware');
const { uploadSinglePDF, processFile } = require('../../middleware/upload_middleware');

const profileController = require('../../controllers/profiles');
const profileValidation = require('../../utils/validation/profiles');
const socialMediaLinksRouter = require('./social_media_links_route');
const addressRouter = require('./address_route');
const certificationsRouter = require('./certifications_route');
const educationsRouter = require('./educations_route');
const languagesRouter = require('./languages_route');
const projectsRouter = require('./projests_route');
const workExperience = require('./work_experience_route');
const skills = require('./skills_route');

users.use('/social-media-links', socialMediaLinksRouter);
users.use('/address', addressRouter);
users.use('/work-experiences', workExperience);
users.use('/projects', projectsRouter);
users.use('/educations', educationsRouter);
users.use('/skills', skills);
users.use('/languages', languagesRouter);
users.use('/certifications', certificationsRouter);

users.put(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),

  profileValidation.update,

  profileController.updateOne,
);

users.put(
  '/cv',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  uploadSinglePDF('pdf_cv'),
  profileValidation.updateCV,

  (req, res, next) => processFile(req, res, next, 'public/pdf/profile', 'pdf', true),
  profileController.updateCV,
);

users.get(
  '/print-and-download/:id',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  profileController.printAndDownload,
);

users.get(
  '/my-profile',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  profileValidation.getProfile,
  profileController.getOne,
);

// users.get('/', accessControl.protected(), profileController.getAll);

public.get(
  '/:id',
  accessControl.protected(),
  profileValidation.getProfile,
  profileController.getOne,
);

module.exports = { users, public };
