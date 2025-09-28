const { param } = require('express-validator');
const ValidationHandler = require('../../../../helper/validation_handler');
const val = require('../../../../helper/custon_validation');
const AdminsBlockUsersFromChat = require('../../../../models/chats/admins_block_users_from_chat_model');
const SupportCenterConversation = require('../../../../models/chats/support_center_conversation_model');
const $ = require('../../../../locales/keys');
function closeConversation() {
  return [
    // Validate the conversation ID
    param('id')
      .exists()
      .withMessage($.conversation_id_is_required)
      .bail()
      .notEmpty()
      .withMessage($.conversation_id_cannot_be_empty)
      .bail()

      .custom(async (value, { req }) => {
        // Validate if the ID is a valid ObjectId
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_conversation_id);
        }

        // Check if the conversation exists
        const conv = await SupportCenterConversation.findById(value);
        if (!conv) {
          throw new Error($.conversation_not_found);
        }

        // Check if the conversation is already closed
        if (conv.is_closed) {
          req.statusCode = 409;

          throw new Error($.conversation_is_already_closed);
        }

        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function deleteConversation() {
  return [
    // Validate the conversation ID
    param('id')
      .exists()
      .withMessage($.conversation_id_is_required)
      .bail()
      .notEmpty()
      .withMessage($.conversation_id_cannot_be_empty)
      .bail()

      .custom(async (value, { req }) => {
        // Validate if the ID is a valid ObjectId
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_conversation_id);
        }

        // Check if the conversation exists
        const conv = await SupportCenterConversation.findById(value);
        if (!conv) {
          throw new Error($.conversation_not_found);
        }

        // Check if the conversation is already closed
        if (conv.deleted_by_admin) {
          req.statusCode = 409;

          throw new Error($.conversation_is_already_deleted);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function blockConversation() {
  return [
    // Validate the conversation ID
    param('id')
      .exists()
      .withMessage($.conversation_id_is_required)
      .bail()
      .notEmpty()
      .withMessage($.conversation_id_cannot_be_empty)
      .bail()

      .custom(async (value, { req }) => {
        // Validate if the ID is a valid ObjectId
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_conversation_id);
        }

        // Check if the conversation is already closed
        if (await AdminsBlockUsersFromChat.findOne({ blocked_user: req.param.id })) {
          req.statusCode = 409;
          throw new Error($.conversation_already_blocked);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function unblockConversation() {
  return [
    // Validate the conversation ID
    param('id')
      .exists()
      .withMessage($.conversation_id_is_required)
      .bail()
      .notEmpty()
      .withMessage($.conversation_id_cannot_be_empty)
      .bail()

      .custom(async (value, { req }) => {
        // Validate if the ID is a valid ObjectId
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_conversation_id);
        }

        // Check if the conversation is already closed
        if (!(await AdminsBlockUsersFromChat.findOne({ blocked_user: req.params.id }))) {
          req.statusCode = 409;
          throw new Error($.this_user_is_not_blocked_from_chatting_with_support_center);
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  closeConversation: closeConversation(),
  deleteConversation: deleteConversation(),
  blockConversation: blockConversation(),
  unblockConversation: unblockConversation(),
  ...ValidationHandler,
};
