const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const adminContractsController = require('../../controllers/freelance_contracts/admin_contracts_controller');
const adminContractsValidation = require('../../utils/validation/freelance_contracts/admin_contract_validation');

const router = express.Router();

router.get('/attached-files/:url', adminContractsController.downloadFile);

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', adminContractsController.getContracts);

router.get('/count', adminContractsController.countProjects);

router.get('/:id', adminContractsValidation.oneContract, adminContractsController.getContract);

router.put(
  '/:id/resolve',
  adminContractsValidation.resolveContract,
  adminContractsController.resolveContract,
);

module.exports = router;
