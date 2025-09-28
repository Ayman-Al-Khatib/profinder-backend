const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const exploreContractController = require('../../controllers/freelance_contracts/explore_contracts_controller');
const exploreContractValidation = require('../../utils/validation/freelance_contracts/explore_contracts_validation');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', exploreContractController.getAllExecutingContract);

router.get('/:id/attached-files/:url', exploreContractController.downloadFile);

router.get(
  '/:id/print-and-download',
  exploreContractValidation.oneContract,
  exploreContractController.printAndDownload,
);

router.get(
  '/:id',
  exploreContractValidation.oneContract,
  exploreContractController.getOneExecutingContract,
);

router.put(
  '/:id/refuse',
  exploreContractValidation.oneContract,
  exploreContractController.refuseContract,
);

router.put(
  '/:id/accept',
  exploreContractValidation.oneContract,
  exploreContractController.acceptContract,
);
router.put(
  '/:id/ship',
  exploreContractValidation.oneContract,
  exploreContractController.shipContract,
);

module.exports = router;
