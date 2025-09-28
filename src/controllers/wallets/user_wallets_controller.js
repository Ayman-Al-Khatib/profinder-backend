const _ = require('lodash');

const Wallet = require('../../models/wallets_model');
const CashTransaction = require('../../models/cash_transactions_model');
const WalletTransaction = require('../../models/wallet_transactions_model');
const User = require('../../models/users_model');
const factory = require('../../helper/handlers_factory');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');
const { default: mongoose } = require('mongoose');

const STATISTICS_PIPELINE = (req, start_date, end_date, type) => [
  {
    $match: {
      wallet_id: new mongoose.Types.ObjectId(req.user.wallet_id),
      deleted_at: { $exists: false },
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      },
      type,
    },
  },
  {
    $facet: {
      pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
      rejected: [{ $match: { status: 'rejected' } }, { $count: 'count' }],
      accepted: [
        { $match: { status: 'accepted' } },
        {
          $group: {
            _id: null,
            total_count: { $sum: 1 },
            max_amount: { $max: '$amount' },
            min_amount: { $min: '$amount' },
            total_sum: { $sum: '$amount' },
            average_amount: { $avg: '$amount' },
          },
        },
      ],
    },
  },
  {
    $project: {
      pending_count: { $arrayElemAt: ['$pending.count', 0] },
      rejected_count: { $arrayElemAt: ['$rejected.count', 0] },
      accepted_count: { $arrayElemAt: ['$accepted.total_count', 0] },
      max_accepted_amount: { $arrayElemAt: ['$accepted.max_amount', 0] },
      min_accepted_amount: { $arrayElemAt: ['$accepted.min_amount', 0] },
      sum_accepted_amount: { $arrayElemAt: ['$accepted.total_sum', 0] },
      avg_accepted_amount: { $arrayElemAt: ['$accepted.average_amount', 0] },
    },
  },
];

// @desc get my wallet
// @route GET api/uesr/wallets/my-wallet
// @access (authenticated, user)
exports.getMyWallet = async (req, res) => {
  const wallet = await Wallet.findById(req.user.wallet_id);

  return res.status(200).json({
    status: 'success',
    wallet,
  });
};

// @desc get all cash transactions
// @route GET /api/user/wallets/my-wallet/cash-transactions
// @access (authenticated, user)
exports.getMyCashTransaction = async (req, res, next) => {
  req.query = _.pick(req.query, [
    'type',
    'date',
    'status',
    'amount',
    'page',
    'current_page',
    'limit',
    'sort',
  ]);
  const filterDeveloper = {
    wallet_id: req.user.wallet_id,
  };

  return factory.getAll({
    Model: CashTransaction,
    filterDeveloper,
  })(req, res, next);
};

// @desc get one cash transaction
// @route GET /api/user/wallets/my-wallet/cash-transactions/:id
// @access (authenticated, user)
exports.getOneCashTransactions = async (req, res, next) => {
  // fetch the transaction
  const transaction = await CashTransaction.findById(req.params.id);

  // assure that : the transaction exists
  if (!transaction) {
    return next(new ApiError([$.transaction_not_found, req.params.id], 404, { merge: true }));
  }

  // assure that : the user has access to this transactino
  if (transaction.wallet_id.toString() !== req.user.wallet_id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  return res.status(200).json({
    status: 'success',
    transaction,
  });
};

// @desc handle a deposit transaction
// @route PUT /api/user/walletys/my-wallet/cash-transactions/:id/handle?option= 'accept' | 'reject'
// @access (authenticated, user)
exports.handleWithdrawTransaction = async (req, res, next) => {
  // fetch the transaction
  const transaction = await CashTransaction.findById(req.params.id);

  // fetch the wallet
  const wallet = await Wallet.findById(transaction.wallet_id);

  // assure that : the user has access to this wallet
  if (wallet.user_id.toString() !== req.user.id.toString()) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  // assure that : the transaction does exist
  if (!transaction) {
    return next(
      new ApiError([$.no_cash_transaction_found_with_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // assure that : the transaction is of type ' withdraw '
  if (transaction.type !== 'withdraw') {
    return next(new ApiError($.you_can_only_accept_withdraw_transactions, 400));
  }

  // assure that : the transaction status is pending
  if (transaction.status !== 'pending') {
    return next(new ApiError($.transaction_is_already_handled, 409));
  }

  if (req.query.option === 'accept') {
    // assure that : the amount of the transaction exists in the balance
    if (wallet.balance < transaction.amount) {
      return next(new ApiError($.you_dont_have_this_amount_in_your_wallet, 400));
    }

    // handle the withdraw
    wallet.balance -= transaction.amount;
    transaction.status = 'accepted';
  } else {
    transaction.status = 'rejected';
  }
  await wallet.save();
  await transaction.save();

  // response
  return res.status(200).json({
    status: 'success',
    transaction,
  });
};

exports.statistics = async (req, res, next) => {
  let { options, start_date, end_date } = req.query;
  options = options.split(' ');

  end_date = new Date(end_date);
  end_date.setDate(end_date.getDate() + 1);

  let result = {};

  if (options.includes('deposit')) {
    const deposit = await CashTransaction.aggregate(
      STATISTICS_PIPELINE(req, start_date, end_date, 'deposit'),
    );

    const depositResult = {
      count: deposit[0].accepted_count || 0,
      max_amount: deposit[0].max_accepted_amount || 0,
      min_amount: deposit[0].min_accepted_amount || 0,
      sum_amount: deposit[0].sum_accepted_amount || 0,
      avg_amount: deposit[0].avg_accepted_amount || 0,
    };

    result.deposit = depositResult;
  }

  if (options.includes('withdraw')) {
    const withdraw = await CashTransaction.aggregate(
      STATISTICS_PIPELINE(req, start_date, end_date, 'withdraw'),
    );

    const withdrawResult = {
      pending_count: withdraw[0].pending_count || 0,
      rejected_count: withdraw[0].rejected_count || 0,
      accepted_count: withdraw[0].accepted_count || 0,
      max_accepted_amount: withdraw[0].max_accepted_amount || 0,
      min_accepted_amount: withdraw[0].min_accepted_amount || 0,
      sum_accepted_amount: withdraw[0].sum_accepted_amount || 0,
      avg_accepted_amount: withdraw[0].avg_accepted_amount || 0,
    };

    result.withdraw = withdrawResult;
  }

  if (options.includes('transaction')) {
    const sent = await WalletTransaction.aggregate([
      {
        $match: {
          sending_wallet_id: new mongoose.Types.ObjectId(req.user.wallet_id),
          deleted_at: { $exists: false },
          created_at: {
            $gte: new Date(start_date),
            $lte: new Date(end_date),
          },
        },
      },
      {
        $facet: {
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
          succeeded: [
            { $match: { status: 'succeeded' } },
            {
              $group: {
                _id: null,
                total_count: { $sum: 1 },
                max_amount: { $max: '$amount' },
                min_amount: { $min: '$amount' },
                total_sum: { $sum: '$amount' },
                average_amount: { $avg: '$amount' },
              },
            },
          ],
        },
      },
      {
        $project: {
          pending_count: { $arrayElemAt: ['$pending.count', 0] },
          cancelled_count: { $arrayElemAt: ['$cancelled.count', 0] },
          succeeded_count: { $arrayElemAt: ['$succeeded.total_count', 0] },
          max_succeeded_amount: { $arrayElemAt: ['$succeeded.max_amount', 0] },
          min_succeeded_amount: { $arrayElemAt: ['$succeeded.min_amount', 0] },
          sum_succeeded_amount: { $arrayElemAt: ['$succeeded.total_sum', 0] },
          avg_succeeded_amount: { $arrayElemAt: ['$succeeded.average_amount', 0] },
        },
      },
    ]);

    const sentResult = {
      pending_count: sent[0].pending_count || 0,
      cancelled_count: sent[0].cancelled_count || 0,
      succeeded_count: sent[0].succeeded_count || 0,
      max_succeeded_amount: sent[0].max_succeeded_amount || 0,
      min_succeeded_amount: sent[0].min_succeeded_amount || 0,
      sum_succeeded_amount: sent[0].sum_succeeded_amount || 0,
      avg_succeeded_amount: sent[0].avg_succeeded_amount || 0,
    };

    const received = await WalletTransaction.aggregate([
      {
        $match: {
          receiving_wallet_id: new mongoose.Types.ObjectId(req.user.wallet_id),
          deleted_at: { $exists: false },
          created_at: {
            $gte: new Date(start_date),
            $lte: new Date(end_date),
          },
        },
      },
      {
        $facet: {
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
          succeeded: [
            { $match: { status: 'succeeded' } },
            {
              $group: {
                _id: null,
                total_count: { $sum: 1 },
                max_amount: { $max: '$amount' },
                min_amount: { $min: '$amount' },
                total_sum: { $sum: '$amount' },
                average_amount: { $avg: '$amount' },
              },
            },
          ],
        },
      },
      {
        $project: {
          pending_count: { $arrayElemAt: ['$pending.count', 0] },
          cancelled_count: { $arrayElemAt: ['$cancelled.count', 0] },
          succeeded_count: { $arrayElemAt: ['$succeeded.total_count', 0] },
          max_succeeded_amount: { $arrayElemAt: ['$succeeded.max_amount', 0] },
          min_succeeded_amount: { $arrayElemAt: ['$succeeded.min_amount', 0] },
          sum_succeeded_amount: { $arrayElemAt: ['$succeeded.total_sum', 0] },
          avg_succeeded_amount: { $arrayElemAt: ['$succeeded.average_amount', 0] },
        },
      },
    ]);

    const receivedResult = {
      pending_count: received[0].pending_count || 0,
      cancelled_count: received[0].cancelled_count || 0,
      succeeded_count: received[0].succeeded_count || 0,
      max_succeeded_amount: received[0].max_succeeded_amount || 0,
      min_succeeded_amount: received[0].min_succeeded_amount || 0,
      sum_succeeded_amount: received[0].sum_succeeded_amount || 0,
      avg_succeeded_amount: received[0].avg_succeeded_amount || 0,
    };

    result.transactions = { sent: sentResult, received: receivedResult };
  }

  return res.status(200).json(result);
};

exports.getMyWalletTransactions = async (req, res, next) => {
  req.query = _.pick(req.query, ['status', 'amount', 'page', 'limit', 'sort']);

  const filterDeveloper = {
    $or: [{ sending_wallet_id: req.user.wallet_id }, { receiving_wallet_id: req.user.wallet_id }],
  };

  const callback = async responseData => {
    responseData.wallettransactions = await Promise.all(
      responseData.wallettransactions.map(async transaction => {
        const sender = await User.findOne({ wallet_id: transaction.sending_wallet_id })
          .select('username profile_id profile_image')
          .populate({
            path: 'profile_id',
            select: 'full_name',
          })
          .lean();
        const receiver = await User.findOne({ wallet_id: transaction.receiving_wallet_id })
          .select('username profile_id profile_image')
          .populate({
            path: 'profile_id',
            select: 'full_name',
          })
          .lean();

        const sent = transaction.sending_wallet_id.toString() === req.user.wallet_id.toString();
        return { ...transaction, sent, sender, receiver };
      }),
    );
    return responseData;
  };

  return factory.getAll({
    Model: WalletTransaction,
    filterDeveloper,
    callback,
  })(req, res, next);
};

exports.getOneWalletTransaction = async (req, res, next) => {
  const transaction = await WalletTransaction.findById(req.params.id).lean();

  if (!transaction) {
    return next(new ApiError([$.transaction_not_found, req.params.id], 404, { merge: true }));
  }

  if (
    transaction.sending_wallet_id.toString() !== req.user.wallet_id.toString() &&
    transaction.receiving_wallet_id.toString() !== req.user.wallet_id.toString()
  ) {
    return next(new ApiError($.you_dont_have_permission, 403));
  }

  const sent = transaction.sending_wallet_id === req.user.wallet_id;
  const sender = await User.findOne({ wallet_id: transaction.sending_wallet_id })
    .select('username profile_id profile_image')
    .populate({
      path: 'profile_id',
      select: 'full_name',
    })
    .lean();
  const receiver = await User.findOne({ wallet_id: transaction.receiving_wallet_id })
    .select('username profile_id profile_image')
    .populate({
      path: 'profile_id',
      select: 'full_name',
    })
    .lean();

  return res.status(200).json({
    status: 'success',
    transaction: { ...transaction, sent, sender, receiver },
  });
};
