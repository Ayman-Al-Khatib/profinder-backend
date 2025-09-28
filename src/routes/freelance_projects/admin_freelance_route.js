const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const adminFreelanceController = require('../../controllers/freelance_projects/admin_freelance_controller');
const adminFreelanceValidation = require('../../utils/validation/freelance_projects/admin_freelance_validation');
const { typeAdmin } = require('../../helper/custon_validation');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', adminFreelanceController.getAllProjects);

router.get('/count', adminFreelanceController.countProjects);

router.get('/:id', adminFreelanceValidation.getProject, adminFreelanceController.getProject);

router.get(
  '/:id/with-reports',
  adminFreelanceValidation.getProject,
  adminFreelanceController.getProjectAndReports,
);

router.use(typeAdmin('freelancerManager'));

router.put(
  '/:id/block',
  adminFreelanceValidation.blockProject,
  adminFreelanceController.blockProject,
);

router.put(
  '/:id/unblock',
  adminFreelanceValidation.unblockProject,
  adminFreelanceController.unblockProject,
);

module.exports = router;
