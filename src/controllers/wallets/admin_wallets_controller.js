const Wallet = require('../../models/wallets_model');
const User = require('../../models/users_model');
const factory = require('../../helper/handlers_factory');
const CashTransaction = require('../../models/cash_transactions_model');
const Notification = require('../../models/notifications_model');
const notificationController = require('../../service/notifications_service');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

const validateWallet = (wallet, id) => {
  // assure that : the wallet exists
  if (!wallet) {
    return new ApiError([$.the_wallet_with_the_id_is_not_found, id], 404, {
      merge: true,
    });
  }

  // assure that : the wallet is active
  if (wallet.status !== 'active') {
    return new ApiError($.the_wallet_is_suspended, 403);
  }

  return null;
};

const validateOwner = owner => {
  // assure that : the owner is not deleted
  if (!owner || owner.deleted_at) {
    return new ApiError($.the_owner_of_this_wallet_is_deleted, 403);
  }

  // assure that : the owner is not blocked
  if (owner.blocked) {
    return new ApiError($.the_owner_of_this_wallet_is_blocked, 403);
  }

  return null;
};

// @desc get all wallets
// @route GET /api/admin/wallets/
// @access (authenticated, admin)
exports.getAllWallets = factory.getAll({
  Model: Wallet,
  fieldsToOmitFromResponse: ['__v'],
  callback: async response => {
    const wallets = await Promise.all(
      response.wallets.map(async wallet => {
        const owner = await User.findById(wallet.user_id);
        wallet.user_image_url = owner.profile_image || null;
        return wallet;
      }),
    );
    response.wallets = wallets;
    return response;
  },
});

// @desc get one wallet
// @route GET /api/admin/wallets/:id
// @access (authenticated, admin)
exports.getOneWallet = factory.getOne({
  Model: Wallet,
  fieldsToOmitFromResponse: ['__v'],
  callback: async response => {
    const owner = await User.findById(response.wallet.user_id);
    response.wallet.user_image_url = owner.profile_image || null;
    return response;
  },
});

// @desc get all cash transactions
// @route GET /api/admin/wallets/cash-transactions
// @access (authenticated, admin)
exports.getAllCashTransactions = factory.getAll({
  Model: CashTransaction,
});

// @desc get one cash transaction
// @route GET /api/admin/wallets/cash-transactions/:id
// @access (authenticated, admin)
exports.getOneCashTransaction = factory.getOne({
  Model: CashTransaction,
});

// @desc suspended a wallet
// @route PUT /api/admin/wallets/:id/suspend
// @access (authenticated, admin (walletManager))

exports.suspendWallet = async (req, res, next) => {
  // fetch the wallet
  let wallet = await Wallet.findById(req.params.id);

  // assure that : the wallet does exist .
  if (!wallet) {
    return next(
      new ApiError([$.no_wallet_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the owner
  const owner = await User.findById(wallet.user_id);

  // assure that : the owner of the wallet is not soft deleted .
  if (!owner || owner.deleted_at) {
    return next(
      new ApiError($.the_owner_of_the_wallet_is_deleted_so_no_reason_to_modify_his_wallet, 403),
    );
  }

  // assure that : the wallet is not already suspended
  if (wallet.status === 'suspended') {
    return next(new ApiError($.the_wallet_is_already_suspended, 409));
  }

  // edit the status of the wallet
  wallet.status = 'suspended';
  await wallet.save();

  wallet = wallet.toObject();
  wallet.user_image_url = owner.profile_image || null;

  return res.status(200).json({
    status: 'success',
    wallet,
  });
};

// @desc unsuspend a wallet
// @route PUT /api/admin/wallets/:id/unsuspend
// @access (authenticated, admin ( walletManager ))
exports.unSuspendWallet = async (req, res, next) => {
  // fetch the wallet
  let wallet = await Wallet.findById(req.params.id);

  // assure that : the wallet exists
  if (!wallet) {
    return next(
      new ApiError([$.no_wallet_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // fetch the owner of the wallet
  const owner = await User.findById(wallet.user_id);

  // assure that : the owner of the wallet is not soft deleted .
  if (!owner || owner.deleted_at) {
    return next(
      new ApiError($.the_owner_of_the_wallet_is_deleted_so_no_reason_to_modify_his_wallet, 403),
    );
  }

  // assure that : the wallet is indeed suspended .
  if (wallet.status !== 'suspended') {
    return next(new ApiError($.the_wallet_is_already_not_suspended, 409));
  }

  // unsuspend the wallet
  wallet.status = 'active';
  await wallet.save();

  wallet = wallet.toObject();
  wallet.user_image_url = owner.profile_image;

  return res.status(200).json({
    status: 'success',
    wallet,
  });
};

// @desc deposit into the wallet
// @route POST /api/admin/wallets/:id/deposit
// @access (authenticated, admin (wallet manager))
exports.walletDeposit = async (req, res, next) => {
  // fetch the wallet
  const wallet = await Wallet.findById(req.params.id);

  // validate the wallet .
  let error = validateWallet(wallet, req.params.id);
  if (error) return next(error);

  // fetch the owner of the wallet
  const owner = await User.findById(wallet.user_id);

  // validate the owner
  error = validateOwner(owner);
  if (error) return next(error);

  // create the cash transaction
  const cash = new CashTransaction({
    wallet_id: req.params.id,
    customer_national_number: req.body.customer_national_number,
    customer_name: req.body.customer_name,
    date: new Date(),
    type: 'deposit',
    status: 'accepted',
    amount: req.body.amount,
    responsibile_support: {
      _id: req.admin.id,
      name: req.admin.username,
    },
  });
  await cash.save();

  // increase the balance in the wallet .
  wallet.balance += +req.body.amount;
  await wallet.save();

  return res.status(200).json({
    status: 'success',
    cash,
  });
};

// @desc withdraw from the wallet
// @route POST /api/admin/wallets/:id/withdraw
// @access (authenticated, admin (wallet manager))
exports.initiateWalletWithdraw = async (req, res, next) => {
  // fetch the wallet
  const wallet = await Wallet.findById(req.params.id);

  // assure that : the wallet exists
  if (!wallet) {
    return next(
      new ApiError([$.no_wallet_was_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the withdraw amount does exist in the wallet
  if (wallet.balance < req.body.amount) {
    return next(new ApiError($.the_wallet_does_not_have_this_cash_amount, 400));
  }

  // make a deposit transaction
  const cash = new CashTransaction({
    wallet_id: req.params.id,
    customer_national_number: req.body.customer_national_number,
    customer_name: req.body.customer_name,
    date: new Date(),
    type: 'withdraw',
    status: 'pending',
    amount: req.body.amount,
    responsibile_support: {
      _id: req.admin.id,
      name: req.admin.username,
    },
  });
  await cash.save();

  // sending a notification to the user .
  const tokens = await notificationController.getTokens(wallet.user_id.toString());
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      $.new_withdraw,
      $.please_handle_withdraw,
      tokens.idsList[0],
    );
    const notification = new Notification({
      title: $.new_withdraw,
      body: $.please_handle_withdraw,
      reason: 'CashTransactions',
      reason_id: cash._id,
      notification_type: 'token',
      receivers: tokens.idsList,
    });
    await notification.save();
  }

  return res.status(200).json({
    status: 'success',
    cash,
  });
};
