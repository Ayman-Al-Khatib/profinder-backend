const SupportCenterConversation = require('../../../models/chats/support_center_conversation_model');
const SupportCenterMessages = require('../../../models/chats/support_center_messages_model');
const factory = require('../../../helper/handlers_factory');
const $ = require('../../../locales/keys');
const ApiError = require('../../../utils/api_error');

/**
 * @desc    Create a new message in a support center conversation
 * @route   POST /api/admins/support-center-messages/
 * @access  Private (authenticated, admin)
 */
exports.createMessage = async (req, res, next) => {
  // Find the latest conversation for the user, if any
  let conversation = await SupportCenterConversation.findOne({
    user: req.body.user_id,
  }).sort({ created_at: -1 });

  // If no conversation exists or the latest one is closed, create a new conversation
  if (!conversation || conversation.is_closed) {
    conversation = new SupportCenterConversation({
      user: req.body.user_id,
      admin: req.admin._id,
    });
  }

  // Assign the current admin to the conversation if it's not already assigned
  if (!conversation.admin) conversation.admin = req.admin._id;

  // Ensure the admin is authorized to send messages in this conversation
  if (conversation.admin.toString() !== req.admin._id.toString()) {
    return next(new ApiError($.you_are_not_authorized_to_send_messages_in_this_conversation, 403));
  }

  const message = new SupportCenterMessages({
    sender_type: 'Admins',
    receiver_type: 'Users',
    text: req.body.text,
    conversation: conversation._id,
  });

  // Update the conversation's latest message and save both the conversation and message
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

exports.getMessages = factory.getAll({ Model: SupportCenterMessages });
