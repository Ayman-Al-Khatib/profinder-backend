const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const exploreFreelanceValidation = require('../../utils/validation/freelance_projects/explore_freelance_validation');
const exploreFreelanceController = require('../../controllers/freelance_projects/explore_freelance_controller');
const { createReportValidator } = require('../../utils/validation/reports/report_validate');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/search', exploreFreelanceController.searchFreelance);

router.get('/my-applications', exploreFreelanceController.getAllApplyingProjects);

router.get('/saved-projects', exploreFreelanceController.savedProjects);

router.get(
  '/publisher/:id',
  exploreFreelanceValidation.getPublisherProjects,
  exploreFreelanceController.getPublisherProjects,
);

router.get(
  '/executor/:id',
  exploreFreelanceValidation.getPublisherProjects,
  exploreFreelanceController.getExeuctorProject,
);

router.get(
  '/:id',
  exploreFreelanceValidation.getOneProject,
  exploreFreelanceController.getOneProject,
);

router.post(
  '/:id/save',
  exploreFreelanceValidation.saveProject,
  exploreFreelanceController.saveProject,
),
  router.post('/:id/report', createReportValidator, exploreFreelanceController.reportProject);

router.post(
  '/:id/apply',
  exploreFreelanceValidation.applyForProject,
  exploreFreelanceController.applyForProject,
);

router.delete(
  '/:id/unsave',
  exploreFreelanceValidation.unSaveProject,
  exploreFreelanceController.unsaveProject,
);

router.delete(
  '/:id/cancel-apply',
  exploreFreelanceValidation.cancelApplyForProject,
  exploreFreelanceController.cancelApplyForProject,
);

module.exports = router;
