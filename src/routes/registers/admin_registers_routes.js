const express = require('express');

const accessControl = require('../../middleware/access_control_middleware');
const adminRegistersController = require('../../controllers/registers/admin_registers_controller');
const adiminRegisterValidation = require('../../utils/validation/registers/admin_registers_validation');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get(
  '/jobs-statistics',
  adiminRegisterValidation.register,
  adminRegistersController.jobsRegister,
);

router.get(
  '/projects-statistics',
  adiminRegisterValidation.register,
  adminRegistersController.projectsRegister,
);

router.get(
  '/users-statistics',
  adiminRegisterValidation.register,
  adminRegistersController.usersRegister,
);

router.get(
  '/profits-statistics',
  adiminRegisterValidation.register,
  adminRegistersController.profitsRegister,
);

router.delete('/delete', adminRegistersController.deleteRegisters);

module.exports = router;
