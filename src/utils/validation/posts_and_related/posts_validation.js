const { body } = require('express-validator');
const ValidationHandler = require('../../../helper/validation_handler');
const val = require('../../../helper/custon_validation');
const Post = require('../../../models/posts_and_related/posts_model');
const User = require('../../../models/users_model');
const Company = require('../../../models/companies_model');
const validCompany = require('../companies/valid_company');
const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');

function checkIfUserAccessPost() {
  return async (req, res, next) => {
    const post = await Post.findById(req.params.id);

    if (post) {
      if (post.publisher_id == req.user.id && !post.company_id) {
        return next();
      } else if (post.company_id) {
        const company = await Company.findById(post.company_id);
        // check : company is not deleted and not blocked
        if (!company) {
          throw new Error($.there_is_no_company_matching_the_entered_id);
        }
        req.company = company.toObject();

        const error = validCompany(company, { blocked: true, softDeleted: true }, req);

        let userIsManager = company.managers.some(
          manager => manager._id.toString() === req.user.id,
        );
        if (userIsManager) {
          const founder = await User.findById(company.founder._id);
          userIsManager = !founder.deleted_at && !founder.blocked;
        }

        const userIsFounder = company.founder._id.toString() === req.user.id;

        if (!error && (userIsManager || userIsFounder)) return next();

        return next(new ApiError($.you_do_not_have_permission_to_access_this_post, 403));
      } else {
        return next(new ApiError($.you_do_not_have_permission_to_access_this_post, 403));
      }
    } else {
      return next(new ApiError($.a_post_could_not_be_found_for_the_id_entered, 404));
    }
  };
}

function createPostValidation() {
  val.removeNullAndEmpty(['company_id', 'topics']);
  return [
    body('company_id')
      .optional()
      .notEmpty()
      .withMessage($.company_id_is_required)
      .bail()

      .isString()
      .withMessage($.company_id_must_be_a_string)
      .bail()

      .custom(async (value, { req }) => {
        if (!val.validateObjectId(value)) {
          throw new Error($.invalid_format_for_company_id);
        } else {
          const company = await Company.findById(value);
          if (!company) {
            throw new Error($.there_is_no_company_matching_the_entered_id);
          }

          req.company = company.toObject();

          // this below checks that : company exists , not deleted , not blocked and the user
          // is manager ( note : the founder is a manager )
          const error = validCompany(
            company,
            { softDeleted: true, blocked: true, companyID: value },
            req,
          );

          let userIsManager = company.managers.some(
            manager => manager._id.toString() === req.user.id,
          );

          if (userIsManager) {
            const founder = await User.findById(company.founder._id);
            userIsManager = !founder.deleted_at && !founder.blocked;
          }
          const userIsFounder = company.founder._id.toString() === req.user.id;

          if (error || !(userIsManager || userIsFounder)) {
            req.statusCode = 403;
            throw new Error($.sorry_you_do_not_have_permission_to_create_a_post_for_this_company);
          }
        }
        return true;
      }),

    body('text')
      .exists()
      .withMessage($.text_field_is_required)
      .bail()
      .isString()
      .withMessage($.text_must_be_a_string)
      .bail()
      .trim()
      .notEmpty()
      .withMessage($.text_must_be_a_string)
      .bail()
      .isLength({ max: 4096, min: 3 })
      .withMessage($.text_must_be_between_3_and_4096_characters_long),

    body('topics')
      .optional()
      .isArray()
      .withMessage($.topics_must_be_an_array)
      .bail()

      .custom(topics => {
        if (!Array.isArray(topics)) {
          throw new Error($.topics_must_be_an_array);
        }
        if (topics.length < 1 || topics.length > 5) {
          throw new Error($.topics_array_must_contain_between_1_and_5_items);
        }

        for (let i = 0; i < topics.length; i++) {
          topics[i] = topics[i].trim(); // Apply trim to each topic
          const topic = topics[i];
          if (typeof topic !== 'string') {
            throw new Error($.all_topics_must_be_strings);
          }
          if (topic.length < 2) {
            throw new Error($.each_topic_must_be_at_least_2_characters_long);
          }
          if (topic.length > 50) {
            throw new Error($.each_topic_must_consist_of_a_maximum_of_50_characters);
          }
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

function updatePostValidation() {
  return [
    checkIfUserAccessPost(),
    val.anyThingToUpdate(['text', 'topics', 'images']),
    val.removeNullAndEmpty(['topics', 'images']),

    body('text')
      .optional()
      .isString()
      .withMessage($.text_must_be_a_string)
      .bail()
      .notEmpty()
      .withMessage($.text_field_cannot_be_empty)
      .bail()
      .isLength({ max: 4096, min: 3 })
      .withMessage($.text_must_be_between_3_and_4096_characters_long),

    body('topics')
      .optional()
      .isArray()
      .withMessage($.topics_must_be_an_array)
      .bail()

      .custom(topics => {
        if (!Array.isArray(topics)) {
          throw new Error($.topics_must_be_an_array);
        }
        if (topics.length > 5) {
          throw new Error($.topics_array_must_contain_between_1_and_5_items);
        }
        for (let i = 0; i < topics.length; i++) {
          topics[i] = topics[i].trim(); // Apply trim to each topic
          const topic = topics[i];
          if (typeof topic !== 'string') {
            throw new Error($.all_topics_must_be_strings);
          }
          if (topic.length < 2) {
            throw new Error($.each_topic_must_be_at_least_2_characters_long);
          }
          if (topic.length > 50) {
            throw new Error($.each_topic_must_consist_of_a_maximum_of_50_characters);
          }
        }
        return true;
      }),

    ValidationHandler.handleValidationResult,
  ];
}

module.exports = {
  createPostValidation: createPostValidation(),
  updatePostValidation: updatePostValidation(),
  checkIfUserAccessPost: checkIfUserAccessPost(),
};
