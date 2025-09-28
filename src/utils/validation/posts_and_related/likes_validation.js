const { body, param } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const val = require('../../../helper/custon_validation');
const Post = require('../../../models/posts_and_related/posts_model');
const Like = require('../../../models/posts_and_related/likes_model');
const User = require('../../../models/users_model.js');
const Company = require('../../../models/companies_model.js');
const $ = require('../../../locales/keys');

function createlikeValidation() {
  return [
    body('post_id')
      .exists()
      .withMessage($.post_id_is_required)
      .bail()
      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_post_id);
        }
        const post = await Post.findById(value);
        if (!post || post.deleted_at || post.blocked) {
          req.statusCode = 403;
          throw new Error($.you_cannot_interact_with_this_post);
        }

        if (post.company_id) {
          const company = await Company.findById(post.company_id);
          if (!company || company.deleted_at || company.blocked) {
            req.statusCode = 403;
            throw new Error($.you_cannot_interact_with_this_post);
          }

          const founder = await User.findById(company.founder._id);
          if (!founder || founder.deleted_at || founder.blocked) {
            req.statusCode = 403;

            throw new Error($.you_cannot_interact_with_this_post);
          }
        } else {
          const user = await User.findById(post.publisher_id);
          if (!user || user.deleted_at || user.blocked) {
            req.statusCode = 403;

            throw new Error($.you_cannot_interact_with_this_post);
          }
        }

        if (await Like.findOne({ user_id: req.user.id, post_id: value })) {
          req.statusCode = 409;
          throw new Error($.a_like_from_this_user_for_this_post_already_exists);
        }
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function deletelikeValidation() {
  return [
    param('id')
      .exists()
      .withMessage($.post_id_is_required)
      .bail()
      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_company_id);
        }
        const post = await Post.findById(value);
        if (!post || post.deleted_at || post.blocked) {
          req.statusCode = 403;
          throw new Error($.you_cannot_interact_with_this_post);
        }

        if (post.company_id) {
          const company = await Company.findById(post.company_id);
          if (!company || company.deleted_at || company.blocked) {
            req.statusCode = 403;
            throw new Error($.you_cannot_interact_with_this_post);
          }

          const founder = await User.findById(company.founder._id);
          if (!founder || founder.deleted_at || founder.blocked) {
            req.statusCode = 403;

            throw new Error($.you_cannot_interact_with_this_post);
          }
        } else {
          const user = await User.findById(post.publisher_id);
          if (!user || user.deleted_at || user.blocked) {
            req.statusCode = 403;

            throw new Error($.you_cannot_interact_with_this_post);
          }
        }
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createlikeValidation: createlikeValidation(),
  deletelikeValidation: deletelikeValidation(),
};
