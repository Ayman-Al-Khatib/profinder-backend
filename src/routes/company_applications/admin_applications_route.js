const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const adminApplicationsController = require('../../controllers/company_applications/admin_applications_controller');
const adminApplicationsValidation = require('../../utils/validation/company_applications/admin_applications_validation');

const companyManagerRole = require('../../middleware/role_middlewares/company_manager_middleware');

const router = express.Router();

router.get('/documents/:documentUrl', adminApplicationsController.downloadDocument);

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', adminApplicationsController.getApplications);

router.get('/documents', adminApplicationsController.getDocumentsList);

router.get('/count', adminApplicationsController.countApplications);

router.get(
  '/:id',
  adminApplicationsValidation.getApplicationValidation,
  adminApplicationsController.getApplication,
);

router.use(companyManagerRole);

router.put(
  '/reject/:id',
  adminApplicationsValidation.rejectApplicationValidation,
  adminApplicationsController.rejectApplication,
);

router.put(
  '/accept/:id',
  adminApplicationsValidation.acceptApplicationValidation,
  adminApplicationsController.acceptApplication,
);

router.delete('/documents/:documentUrl', adminApplicationsController.deleteDocument);

module.exports = router;
