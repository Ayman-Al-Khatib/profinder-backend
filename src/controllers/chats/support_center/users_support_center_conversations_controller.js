const SupportCenterConversations = require('../../../models/chats/support_center_conversation_model');
const SupportCenterMessages = require('../../../models/chats/support_center_messages_model');
const factory = require('../../../helper/handlers_factory');
const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');

/**
 * @desc    Get all conversations for the authenticated user
 * @route   GET /api/users/support-center-conversations/
 * @access  Private (authenticated, user)
 */
exports.getAllConversations = async (req, res, next) => {
  delete req.body.deleted_by_admin;
  factory.getAll({
    Model: SupportCenterConversations,
    // fieldsToOmitFromResponse: ['deleted_by_user', 'deleted_by_admin'],
    filterDeveloper: {
      user: req.user._id, // Filter to get only conversations for the authenticated user
      deleted_by_user: false,
    },
    populateDeveloper: [{ path: 'latest_message', select: '-__v' }],
  })(req, res, next);
};

/**
 * @desc    Get all messages for a specific conversation
 * @route   GET /api/users/support-center-conversations/:id/messages
 * @access  Private (authenticated, user)
 */
exports.getMessagesForConversation = async (req, res, next) => {
  const conversation = await SupportCenterConversations.findById(req.params.id).lean();

  // Check if the user is authorized to access this conversation
  if (!conversation || conversation.user.toString() !== req.user._id.toString()) {
    return next(new ApiError($.you_are_not_authorized_to_access_this_conversation, 403));
  }
  factory.getAll({
    Model: SupportCenterMessages,
    filterDeveloper: { conversation: req.params.id }, // Filter messages by conversation ID
  })(req, res, next);
};

/**
 * @desc    Mark a conversation as deleted by the user
 * @route   DELETE /api/users/support-center-conversations/:id
 * @access  Private (authenticated, user)
 */
exports.deleteConversation = async (req, res, next) => {
  // Set the flag indicating the conversation is deleted by the user
  req.body.deleted_by_user = true;
  factory.updateOne({
    Model: SupportCenterConversations,
    fields: ['deleted_by_user'],
  })(req, res, next);
};
