const { body } = require('express-validator');
const ValidationHandler = require('../../../../helper/validation_handler');
const AdminsBlockUsersFromChat = require('../../../../models/chats/admins_block_users_from_chat_model');
const $ = require('../../../../locales/keys');

async function checkBlockedUser(value, { req }) {
  const isBlocked = await AdminsBlockUsersFromChat.findOne({ blocked_user: req.user._id });
  if (isBlocked) {
    throw new Error($.the_user_has_been_blocked_from_contacting_the_support_center);
  }
}

function isBlocked() {
  return [
    // Check if the user is blocked
    body().custom(checkBlockedUser),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  isBlocked: isBlocked(),
  ...ValidationHandler,
};
