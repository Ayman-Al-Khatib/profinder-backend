const { body, param } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const val = require('../../../helper/custon_validation');
const Post = require('../../../models/posts_and_related/posts_model');
const User = require('../../../models/users_model');
const Comment = require('../../../models/posts_and_related/comments_model');
const Company = require('../../../models/companies_model');
const $ = require('../../../locales/keys');

async function validatePostId(value, { req }) {
  if (!val.validateObjectId(value)) {
    throw new Error($.invalid_format_for_post_id);
  }

  const post = await Post.findById(value);
  if (!post || post.deleted_at || post.blocked) {
    req.statusCode = 403;
    throw new Error($.you_cannot_comment_on_this_post);
  }

  if (post.company_id) {
    const company = await Company.findById(post.company_id);
    if (!company || company.deleted_at || company.blocked) {
      req.statusCode = 403;
      throw new Error($.you_cannot_comment_on_this_post);
    }

    const founder = await User.findById(company.founder._id);
    if (!founder || founder.deleted_at || founder.blocked) {
      req.statusCode = 403;
      throw new Error($.you_cannot_comment_on_this_post);
    }
  } else {
    const user = await User.findById(post.publisher_id);
    if (!user || user.deleted_at || user.blocked) {
      req.statusCode = 403;
      throw new Error($.you_cannot_comment_on_this_post);
    }
  }

  return true;
}

function createCommentValidation() {
  return [
    body('text')
      .exists()
      .withMessage($.text_is_required)
      .bail()
      .isString()
      .withMessage($.text_must_be_a_string)
      .bail()
      .trim()
      .notEmpty()
      .withMessage($.text_cannot_be_empty)
      .bail()
      .isLength({ max: 2048, min: 1 })
      .withMessage($.text_must_be_between_1_and_2048_characters_long),

    body('post_id').exists().withMessage($.post_id_is_required).bail().custom(validatePostId),

    ValidationHandler.handleValidationResult,
  ];
}

function updateCommentValidation() {
  return [
    body('text')
      .exists()
      .withMessage($.text_is_required)
      .bail()
      .isString()
      .withMessage($.text_must_be_a_string)
      .bail()
      .trim()
      .notEmpty()
      .withMessage($.text_cannot_be_empty)
      .bail()
      .isLength({ max: 2048, min: 1 })
      .withMessage($.text_must_be_between_1_and_2048_characters_long),

    param('id')
      .exists()
      .withMessage($.comment_id_is_required)
      .bail()
      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_company_id);
        }
        const comment = await Comment.findById(value);
        if (!comment || comment.deleted_at) {
          req.statusCode = 404;
          throw new Error($.comment_does_not_exist_or_is_deleted_blocked);
        }
        return validatePostId(comment.post_id, { req });
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function accessibilityAllowed() {
  return [
    param('id')
      .exists()
      .withMessage($.comment_id_is_required)
      .bail()
      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_company_id);
        }
        const comment = await Comment.findById(value);
        if (!comment || comment.deleted_at) {
          req.statusCode = 404;
          throw new Error($.comment_does_not_exist_or_is_deleted_blocked);
        }
        return validatePostId(comment.post_id, { req });
      }),
    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createCommentValidation: createCommentValidation(),
  updateCommentValidation: updateCommentValidation(),
  accessibilityAllowed: accessibilityAllowed(),
};
