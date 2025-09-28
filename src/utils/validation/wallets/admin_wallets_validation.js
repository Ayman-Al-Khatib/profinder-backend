const { body } = require('express-validator');

const validationHandler = require('../../../helper/validation_handler');
const $ = require('../../../locales/keys');

exports.getOneWallet = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.suspendWallet = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.unSuspendWallet = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.getOneCashTransaction = [
  validationHandler.validateParamId,
  validationHandler.handleValidationResult,
];

exports.walletDeposit = [
  validationHandler.validateParamId,
  body('customer_national_number')
    .notEmpty()
    .withMessage($.the_customer_national_number_is_required)
    .bail()
    .isString()
    .withMessage($.the_customer_national_number_must_be_a_string)
    .bail()
    .isLength({ min: 12, max: 12 })
    .withMessage($.the_customer_national_number_must_be_12_digit_long),
  body('customer_name')
    .notEmpty()
    .withMessage($.the_customer_name_is_required)
    .bail()

    .isString()
    .withMessage($.the_customer_name_should_be_a_string_with_64_chars_long_at_most)
    .bail()

    .isLength({ max: 64 })
    .withMessage($.the_customer_name_should_be_a_string_with_64_chars_long_at_most),
  body('amount')
    .exists()
    .withMessage($.the_cash_transaction_amount_is_required)
    .bail()
    .isFloat({ min: 1000, max: 10000000 })
    .toFloat()
    .withMessage($.the_cash_transaction_amount_must_be_a_float_number_between_1000_and_1000000),
  validationHandler.handleValidationResult,
];

exports.initiateWalletWithdraw = [
  validationHandler.validateParamId,
  body('customer_national_number')
    .notEmpty()
    .withMessage($.the_customer_national_number_is_required)
    .bail()
    .isString()
    .withMessage($.the_customer_national_number_must_be_a_string)
    .bail()
    .isLength({ min: 12, max: 12 })
    .withMessage($.the_customer_national_number_must_be_12_digit_long),
  body('customer_name')
    .notEmpty()
    .withMessage($.the_customer_name_is_required)
    .bail()

    .isString()
    .withMessage($.the_customer_name_should_be_a_string_with_64_chars_long_at_most)
    .bail()

    .isLength({ max: 64 })
    .withMessage($.the_customer_name_should_be_a_string_with_64_chars_long_at_most),
  body('amount')
    .exists()
    .withMessage($.the_cash_transaction_amount_is_required)
    .bail()
    .isFloat({ min: 1000, max: 10000000 })
    .toFloat()
    .withMessage($.the_cash_transaction_amount_must_be_a_float_number_between_1000_and_1000000),
  validationHandler.handleValidationResult,
];
