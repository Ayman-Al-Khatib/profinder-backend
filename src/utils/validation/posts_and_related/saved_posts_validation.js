const { body, param } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const val = require('../../../helper/custon_validation');
const Post = require('../../../models/posts_and_related/posts_model');
const User = require('../../../models/users_model');
const Company = require('../../../models/companies_model');
const SavePost = require('../../../models/posts_and_related/saved_posts_model');
const $ = require('../../../locales/keys');

function createSavedPostValidation() {
  return [
    body('post_id')
      .notEmpty()
      .withMessage($.post_id_is_required)
      .bail()

      .isString()
      .withMessage($.post_id_must_be_a_string)
      .bail()

      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_post_id);
        }
        const post = await Post.findById(value);
        if (!post || post.deleted_at || post.blocked) {
          req.statusCode = 403;
          throw new Error($.post_does_not_exist_or_is_deleted_blocked);
        }

        if (!post.company_id) {
          const publisher = await User.findById(post.publisher_id);
          if (!publisher || publisher.deleted_at || publisher.blocked) {
            req.statusCode = 403;

            throw new Error($.you_do_not_have_permission_to_access_this_post);
          }
        } else {
          const company = await Company.findById(post.company_id);
          if (!company || company.deleted_at || company.blocked) {
            req.statusCode = 403;

            throw new Error($.you_do_not_have_permission_to_access_this_post);
          }
          const founder = await User.findById(company.founder._id);
          if (!founder || founder.deleted_at || founder.blocked) {
            req.statusCode = 403;
            throw new Error($.you_do_not_have_permission_to_access_this_post);
          }
        }

        if (await SavePost.findOne({ user_id: req.user.id, post_id: value })) {
          req.statusCode = 409;

          throw new Error($.this_user_has_already_saved_this_post);
        }
        return true;
      }),
    ValidationHandler.handleValidationResult,
  ];
}

function deleteSavedPostValidation() {
  return [
    param('id')
      .notEmpty()
      .withMessage($.post_id_is_required)
      .bail()

      .isString()
      .withMessage($.post_id_must_be_a_string)
      .bail()

      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_post_id);
        }

        const post = await Post.findById(value);
        if (!post || post.deleted_at || post.blocked) {
          req.statusCode = 403;
          throw new Error($.post_does_not_exist_or_is_deleted_blocked);
        }

        if (!post.company_id) {
          const publisher = await User.findById(post.publisher_id);
          if (!publisher || publisher.deleted_at || publisher.blocked) {
            req.statusCode = 403;

            throw new Error($.you_do_not_have_permission_to_access_this_post);
          }
        } else {
          const company = await Company.findById(post.company_id);
          if (!company || company.deleted_at || company.blocked) {
            req.statusCode = 403;

            throw new Error($.you_do_not_have_permission_to_access_this_post);
          }
          const founder = await User.findById(company.founder._id);
          if (!founder || founder.deleted_at || founder.blocked) {
            req.statusCode = 403;
            throw new Error($.you_do_not_have_permission_to_access_this_post);
          }
        }

        return true;
      }),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createSavedPostValidation: createSavedPostValidation(),
  deleteSavedPostValidation: deleteSavedPostValidation(),
};
