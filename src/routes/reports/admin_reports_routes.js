const express = require('express');

const reportsValidation = require('../../utils/validation/reports/report_validate');
const adminReportsController = require('../../controllers/reports/admin_reports_controller');
const accessControl = require('../../middleware/access_control_middleware');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.post(
  '/:id/handle',
  reportsValidation.handleReportValidator,
  adminReportsController.handleReport,
);

module.exports = router;
