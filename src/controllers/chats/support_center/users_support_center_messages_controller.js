const SupportCenterConversation = require('../../../models/chats/support_center_conversation_model');
const SupportCenterMessages = require('../../../models/chats/support_center_messages_model');

/**
 * @desc    Create a new message in a support center conversation or create a new conversation if none exists
 * @route   POST /api/users/support-center-messages/
 * @access  Private (authenticated, user)
 */
exports.createMessage = async (req, res) => {
  let conversation;

  // Find an open conversation for the authenticated user
  conversation = await SupportCenterConversation.findOne({
    user: req.user._id,
    is_closed: false,
  });

  // If no open conversation exists, create a new one
  if (!conversation) {
    conversation = new SupportCenterConversation({
      user: req.user._id,
    });
  }

  const message = new SupportCenterMessages({
    sender_type: 'Users',
    receiver_type: 'Admins',
    text: req.body.text,
    conversation: conversation._id,
  });

  conversation.latest_message = message._id;
  conversation.deleted_by_user = false;
  conversation.deleted_by_admin = false;
  await conversation.save();
  await message.save();

  const messageObj = message.toObject();
  delete messageObj.__v;

  res.status(201).json({
    status: 'success',
    message: messageObj,
  });
};
