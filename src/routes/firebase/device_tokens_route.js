const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const deviceTokensController = require('../../controllers/firebase/device_tokens_controller');
const deviceTokensValidation = require('../../utils/validation/firebase/device_tokens_validation');
const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', deviceTokensController.getToken);
router.post('/', deviceTokensValidation.createTokenValidation, deviceTokensController.createToken);
router.delete('/', deviceTokensController.deleteToken);

module.exports = router;
