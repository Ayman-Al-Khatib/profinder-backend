const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const messageController = require('../../controllers/chats/support_center/admins_support_center_conversations_controller');
const router = express.Router();
const conversatioValidation = require('../../utils/validation/chat/support_center/admins_support_center_conversations_validation');

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', messageController.getConversations);

router.put(
  '/:id/delete',
  conversatioValidation.deleteConversation,
  messageController.deleteConversation,
);
router.put(
  '/:id/close',
  conversatioValidation.closeConversation,
  messageController.closeConversation,
);
router.put(
  '/:id/block',
  conversatioValidation.blockConversation,
  messageController.blockConversation,
);
router.put(
  '/:id/unblock',
  conversatioValidation.unblockConversation,
  messageController.unBlockConversation,
);

router.get('/one-with-messages', messageController.getOneConversationWithMessages);

module.exports = router;
