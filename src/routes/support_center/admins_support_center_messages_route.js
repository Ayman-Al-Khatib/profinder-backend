const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const messageController = require('../../controllers/chats/support_center/admins_support_center_messages_controller');
const router = express.Router();
const messageUserValidation = require('../../utils/validation/chat/support_center/admins_support_center_messages_validation');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.post('/', messageUserValidation.createMessage, messageController.createMessage);
router.get('/', messageController.getMessages);

module.exports = router;
