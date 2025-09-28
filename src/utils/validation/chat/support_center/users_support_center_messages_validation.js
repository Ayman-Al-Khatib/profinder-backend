const { body } = require('express-validator');
const ValidationHandler = require('../../../../helper/validation_handler');
const AdminsBlockUsersFromChat = require('../../../../models/chats/admins_block_users_from_chat_model');
const $ = require('../../../../locales/keys');

async function checkBlockedUser(value, { req }) {
  const isBlocked = await AdminsBlockUsersFromChat.findOne({ blocked_user: req.user._id });
  if (isBlocked) {
    throw new Error($.you_are_blocked_from_sending_messages);
  }
}

function createMessage() {
  return [
    // Check if the user is blocked
    body().custom(checkBlockedUser),

    // Validate the text field
    body('text')
      .exists()
      .withMessage($.text_field_is_required)
      .bail()
      .trim()
      .notEmpty()
      .withMessage($.text_field_cannot_be_empty),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createMessage: createMessage(),
  ...ValidationHandler,
};
