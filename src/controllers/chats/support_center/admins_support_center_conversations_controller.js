const SupportCenterConversations = require('../../../models/chats/support_center_conversation_model');
const AdminsBlockUsersFromChat = require('../../../models/chats/admins_block_users_from_chat_model');
const SupportCenterMessages = require('../../../models/chats/support_center_messages_model');
const User = require('../../../models/users_model');
const factory = require('../../../helper/handlers_factory');
const $ = require('../../../locales/keys');
const tr = require('../../../helper/translate');
const ApiError = require('../../../utils/api_error');

/**
 * @desc    Get all support center conversations with API features
 * @route   GET /api/admins/support-center-conversations/
 * @access  Private (authenticated, admin)
 */
exports.getConversations = factory.getAll({
  Model: SupportCenterConversations,
  populateDeveloper: [
    { path: 'user', select: '_id username profile_id email profile_image background_image' },
    { path: 'admin', select: '_id username email profile_image background_image' },
    {
      path: 'latest_message',
      select: '-__v',
    },
  ],
});

/**
 * @desc    Close a specific conversation
 * @route   PUT /api/admins/support-center-conversations/:id/close
 * @access  Private (authenticated, admin)
 */
exports.closeConversation = async (req, res, next) => {
  req.body.is_closed = true; // Mark the conversation as closed
  factory.updateOne({
    Model: SupportCenterConversations,
    fields: ['is_closed'],
  })(req, res, next);
};

/**
 * @desc    Delete a specific conversation
 * @route   PUT /api/admins/support-center-conversations/:id
 * @access  Private (authenticated, admin)
 */
exports.deleteConversation = async (req, res, next) => {
  req.body.deleted_by_admin = true; // Mark the conversation as deleted by admin
  factory.updateOne({
    Model: SupportCenterConversations,
    fields: ['deleted_by_admin'],
  })(req, res, next);
};

/**
 * @desc    Block a user from a conversation
 * @route   PUT /api/admins/support-center-conversations/:id/block
 * @access  Private (authenticated, admin)
 */
exports.blockConversation = async (req, res, next) => {
  // Check if the user is deleted or blocked
  const user = await User.findById(req.params.id);
  if (!user || user.deleted_at || user.blocked) {
    return next(new ApiError($.user_not_found_or_has_been_deleted_or_blocked, 404));
  }

  // Try to block the user
  const block = await AdminsBlockUsersFromChat.findOneAndUpdate(
    {
      admin: req.admin._id,
      blocked_user: req.params.id,
    },
    {
      $setOnInsert: {
        admin: req.admin._id,
        blocked_user: req.params.id,
      },
    },
    { upsert: true, new: false },
  );

  if (block) {
    return next(new ApiError($.conversation_already_blocked, 409));
  } else {
    res.status(200).json({ status: 'success', message: tr($.conversation_blocked_successfully) });
  }
};

/**
 * @desc    Unblock a user from a conversation
 * @route   PUT /api/admins/support-center-conversations/:id/unblock
 * @access  Private (authenticated, admin)
 */
exports.unBlockConversation = async (req, res, next) => {
  // Check if the user is deleted or blocked
  const user = await User.findById(req.params.id);
  if (!user || user.deleted_at || user.blocked) {
    return next(new ApiError($.user_not_found_or_has_been_deleted_or_blocked, 404));
  }

  // Delete the block record
  await AdminsBlockUsersFromChat.findOneAndDelete({
    blocked_user: req.params.id,
  });

  res.status(200).json({
    status: 'success',
    message: tr($.this_user_can_now_be_unblocked_and_can_now_chat_in_the_support_center),
  });
};

exports.getOneConversationWithMessages = async (req, res, next) => {
  let filter;
  if (req.query._id) {
    filter = { _id: req.query._id };
  } else if (req.query.user) {
    filter = { user: req.query.user, is_closed: false };
    if (req.query.admin) {
      filter.admin = req.query.admin;
    }
  } else {
    return next(new ApiError($.invalid_request_missing_conversation_or_user_identifier, 400)); // Bad Request
  }

  const blockedUser = !!(await AdminsBlockUsersFromChat.findOne({
    blocked_user: req.query.user,
  }));

  const conversation = await SupportCenterConversations.findOne(filter)
    .select('-__v')
    .populate([
      { path: 'user', select: '_id username background_image profile_image' },
      { path: 'admin', select: '_id username background_image profile_image' },
    ])
    .lean();
  if (!conversation) {
    return next(
      new ApiError($.conversation_not_found, 404, {
        data: { blocked_user: blockedUser },
      }),
    ); // Not Found
  }

  // Remove some fields from query parameters
  delete req.query._id;
  delete req.query.user;
  delete req.query.admin;

  factory.getAll({
    Model: SupportCenterMessages,
    filterDeveloper: {
      conversation: conversation._id,
    },
    callback: rp => {
      return {
        status: rp.status,
        messages: rp.message,
        blocked_user: blockedUser,
        support_center_conversation: conversation,
        support_center_messages: {
          pagination: rp.pagination,
          total_count: rp.total_count,
          count: rp.count,
          messages: rp.support_center_messages,
        },
      };
    },
  })(req, res, next);
};
