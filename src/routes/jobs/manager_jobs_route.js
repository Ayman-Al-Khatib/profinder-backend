const express = require('express');

const managerJobsController = require('../../controllers/jobs/manager_jobs_controller');
const managerJobsValidation = require('../../utils/validation/jobs/manager_jobs_validation');
const accessControl = require('../../middleware/access_control_middleware');

const router = express.Router({ mergeParams: true });

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', managerJobsValidation.getAllJobs, managerJobsController.getAllJobs);

router.get(
  '/statistics',
  managerJobsValidation.statisticsValidation,
  managerJobsController.statistics,
);

router.get('/:id', managerJobsValidation.getOneJob, managerJobsController.getOneJob);

router.put(
  '/:id/applications/:application_id/mark',
  managerJobsValidation.getJobApplications,
  managerJobsController.markApplicationAsChecked,
);

router.get(
  '/:id/applications',
  managerJobsValidation.getJobApplications,
  managerJobsController.getJobApplications,
);

router.post('/', managerJobsValidation.createJob, managerJobsController.createJob);

router.delete('/:id', managerJobsValidation.deleteJob, managerJobsController.deleteJob);

router.put(
  '/:id',
  managerJobsValidation.updateJobApplication,
  managerJobsController.updateJobApplication,
);

module.exports = router;
