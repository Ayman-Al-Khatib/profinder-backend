const express = require('express');

const adminCompaniesController = require('../../controllers/companies/admin_companies_controller');
const adminCompaniesValidation = require('../../utils/validation/companies/admin_companies_validation');
const accessControl = require('../../middleware/access_control_middleware');
const companyManagerRole = require('../../middleware/role_middlewares/company_manager_middleware');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', adminCompaniesController.getCompanies);

router.get(
  '/is-manager',
  adminCompaniesValidation.getAllManagerCompanies,
  adminCompaniesController.getAllManagerCompanies,
);

router.get('/count', adminCompaniesController.countCompanies);

router.get(
  '/:id/with-reports',
  adminCompaniesValidation.getCompanyReports,
  adminCompaniesController.getCompanyAndReports,
);

router.get('/:id', adminCompaniesValidation.getCompany, adminCompaniesController.getCompany);

router.use(companyManagerRole);

router.put(
  '/:id/block',
  adminCompaniesValidation.blockCompany,
  adminCompaniesController.blockCompany,
);

router.put(
  '/:id/un-block',
  adminCompaniesValidation.unBlockCompany,
  adminCompaniesController.unBlockCompany,
);

module.exports = router;
