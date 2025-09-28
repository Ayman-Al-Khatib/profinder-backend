const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const exploreJobsController = require('../../controllers/jobs/explore_jobs_controller');
const exploreJobsValidation = require('../../utils/validation/jobs/explore_jobs_validation');
const reportsValidation = require('../../utils/validation/reports/report_validate');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/search', exploreJobsController.searchJobs);

router.get(
  '/company/:id',
  exploreJobsValidation.getCompanyJobs,
  exploreJobsController.getCompanyJobs,
);

router.get('/my-applications', exploreJobsController.getAllApplyingJobs);

router.get('/saved-jobs', exploreJobsController.savedJobs);

router.get('/:id', exploreJobsValidation.getJob, exploreJobsController.getJob);

router.post(
  '/:id/report',
  reportsValidation.createReportValidator,
  exploreJobsController.reportJob,
);

router.post('/:id/save', exploreJobsValidation.saveJob, exploreJobsController.saveJob);

router.post('/:id/apply', exploreJobsValidation.applyForJob, exploreJobsController.applyForJob);

router.delete('/:id/unsave', exploreJobsValidation.unSaveJob, exploreJobsController.unsaveJob);

router.delete(
  '/:id/cancel-apply',
  exploreJobsValidation.cancelApplyForJob,
  exploreJobsController.cancelApplyForJob,
);

module.exports = router;
