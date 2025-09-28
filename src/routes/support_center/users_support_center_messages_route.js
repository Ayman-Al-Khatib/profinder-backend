const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const messageController = require('../../controllers/chats/support_center/users_support_center_messages_controller');
const router = express.Router();
const messageAdminValidation = require('../../utils/validation/chat/support_center/users_support_center_messages_validation');
router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.post('/', messageAdminValidation.createMessage, messageController.createMessage);

module.exports = router;
