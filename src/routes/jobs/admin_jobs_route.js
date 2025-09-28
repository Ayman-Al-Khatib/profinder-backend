const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const companyManagerRole = require('../../middleware/role_middlewares/company_manager_middleware');
const adminJobsController = require('../../controllers/jobs/admin_jobs_controller');
const adminJobsValidation = require('../../utils/validation/jobs/admin_jobs_validation');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', adminJobsController.getAllJobs);

router.get('/count', adminJobsController.countJobs);

router.get('/most-popular', adminJobsController.mostPopular);

router.get('/average-salary', adminJobsController.averageSalary);

router.get('/:id/with-reports', adminJobsValidation.getJob, adminJobsController.getJobAndReports);

router.get('/:id', adminJobsValidation.getJob, adminJobsController.getJob);

router.use(companyManagerRole);

router.put('/:id/block', adminJobsValidation.blockJob, adminJobsController.blockJob);

router.put('/:id/unblock', adminJobsValidation.unblockJob, adminJobsController.unblockJob);

module.exports = router;
