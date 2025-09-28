const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const exploreCompaniesController = require('../../controllers/companies/explore_companies_controller');
const exploreCompaniesValidation = require('../../utils/validation/companies/explore_companies_validation');
const reportValidator = require('../../utils/validation/reports/report_validate');
const router = express.Router();

router.use(accessControl.protected());

router.get('/search', exploreCompaniesController.searchCompanies);

router.get('/company-experiences', exploreCompaniesController.getAllCompanyExperiences);

router.get('/company-experiences/:id', exploreCompaniesController.getUserCompanyExperience);

router.get('/manager-requests', exploreCompaniesController.getManagerRequests);

router.post(
  '/:id/report',
  reportValidator.createReportValidator,
  exploreCompaniesController.reportCopmany,
);

router.get('/:id', exploreCompaniesValidation.getCompany, exploreCompaniesController.getCompany);

router.delete(
  '/company-experiences/:id',
  exploreCompaniesValidation.deleteCompanyExperience,
  exploreCompaniesController.deleteCompanyExperience,
);

router.post(
  '/:id/company-experiences',
  exploreCompaniesValidation.createCompanyExperience,
  exploreCompaniesController.createCompanyExperience,
);

router.put(
  '/manager-requests/:id/accept',
  exploreCompaniesValidation.acceptManagerRequest,
  exploreCompaniesController.acceptManagerRequest,
);

router.put(
  '/manager-requests/:id/reject',
  exploreCompaniesValidation.rejectManagerRequest,
  exploreCompaniesController.rejectManagerRequest,
);

module.exports = router;
