const { body } = require('express-validator');
const ValidationHandler = require('../../../../helper/validation_handler');
const val = require('../../../../helper/custon_validation');
const AdminsBlockUsersFromChat = require('../../../../models/chats/admins_block_users_from_chat_model');
const User = require('../../../../models/users_model');
const $ = require('../../../../locales/keys');

async function checkBlockedUser(body) {
  const isBlocked = await AdminsBlockUsersFromChat.findOne({ blocked_user: body.user_id });
  if (isBlocked) {
    throw new Error($.you_are_blocked_from_sending_messages);
  }
}

function createMessage() {
  return [
    // Check if the user is blocked
    body().custom(checkBlockedUser),

    body('text')
      .exists()
      .withMessage($.text_field_is_required)
      .bail()
      .trim()
      .notEmpty()
      .withMessage($.text_field_cannot_be_empty),

    body('user_id')
      .exists()
      .withMessage($.id_parameter_is_required)
      .bail()
      .custom(async value => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_id);
        }
        const user = await User.findById(value);
        if (!user) {
          throw new Error($.user_not_found);
        }

        if (user.deleted_at) {
          throw new Error($.user_account_has_been_deleted);
        }

        if (user.blocked) {
          throw new Error($.user_account_is_currently_blocked);
        }
        return true;
      }),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createMessage: createMessage(),
  ...ValidationHandler,
};
