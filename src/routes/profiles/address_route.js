const express = require('express');
const router = express.Router();
const accessControl = require('../../middleware/access_control_middleware');
const addressValidator = require('../../utils/validation/profiles/address_validation');
const addressController = require('../../controllers/profiles/adress_controller');

router.put(
  '/',
  accessControl.protected(),
  accessControl.allowedTo(['user']),
  addressValidator.update,
  addressController.update,
);

module.exports = router;
