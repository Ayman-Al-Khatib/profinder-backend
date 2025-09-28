const express = require('express');

const managerCompaniesController = require('../../controllers/companies/manager_companies_controller');
const managerCompaniesValidation = require('../../utils/validation/companies/manager_companies_validation');
const accessControl = require('../../middleware/access_control_middleware');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', managerCompaniesController.getCompanies);

router.get('/:id', managerCompaniesValidation.getCompany, managerCompaniesController.getCompany);

router.get(
  '/:id/company-experiences',
  managerCompaniesValidation.getAllCompanyExperiences,
  managerCompaniesController.getAllCompanyExperiences,
);

router.get(
  '/:id/company-experiences/:experience_id',
  managerCompaniesValidation.getOneCompanyExperience,
  managerCompaniesController.getOneCompanyExperience,
);

router.put('/:id/resign', managerCompaniesValidation.resign, managerCompaniesController.resign);

router.put(
  '/:id/company-experiences/:experience_id',
  managerCompaniesValidation.acceptCompanyExperience,
  managerCompaniesController.acceptCompanyExperience,
);

router.delete(
  '/:id/company-experiences/:experience_id',
  managerCompaniesValidation.rejectCompanyExperience,
  managerCompaniesController.rejectCompanyExperience,
);

router.put(
  '/:id/block-user',
  managerCompaniesValidation.blockUser,
  managerCompaniesController.blockUserFromCompany,
);

router.put(
  '/:id/un-block-user',
  managerCompaniesValidation.unBlockUser,
  managerCompaniesController.unBlockUserFromCompany,
);

module.exports = router;
