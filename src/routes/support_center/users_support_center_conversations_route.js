const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const messageController = require('../../controllers/chats/support_center/users_support_center_conversations_controller');
const router = express.Router();
const conversatioValidation = require('../../utils/validation/chat/support_center/users_support_center_conversations_validation');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', conversatioValidation.isBlocked, messageController.getAllConversations);
router.get(
  '/:id/messages',
  conversatioValidation.validateParamId,
  conversatioValidation.isBlocked,
  messageController.getMessagesForConversation,
);
router.put('/:id', conversatioValidation.validateParamId, messageController.deleteConversation);

module.exports = router;
