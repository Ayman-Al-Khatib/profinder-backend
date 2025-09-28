const path = require('path');
const fs = require('fs');

const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

const Contract = require('../../models/freelance_contracts_model');
const Project = require('../../models/freelance_projects_model');
const Transaction = require('../../models/wallet_transactions_model');
const Wallet = require('../../models/wallets_model');
const Notification = require('../../models/notifications_model.js');
const User = require('../../models/users_model');
const notificationController = require('../../service/notifications_service.js');
const profit = require('../../helper/calc_application_profit');
const ApiError = require('../../utils/api_error');
const factory = require('../../helper/handlers_factory');
const validContract = require('../../utils/validation/freelance_contracts/validate_contract');
const documentsCounter = require('../../helper/documents_counter');
const getFileNameFromPrivateURL = require('../../helper/get_file_name_from_private_url');
const $ = require('../../locales/keys');

const getFilePathByName = filename => {
  return process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../../uploads/private/pdf/contracts/', filename)
    : path.join('uploads/private/pdf/contracts/', filename).replace(/\\/g, '/');
};

const CONTRACT_POPULATION_ARR = [
  { path: 'freelance_project_id', select: '_id title' },
  { path: 'service_executor_id', select: '_id username profile_image' },
  { path: 'service_publisher_id', select: '_id username profile_image' },
  { path: 'wallet_transaction_id' },
  { path: 'responsibile_support.wallet_transaction_id' },
];

// @desc get all contracts with its transaction
// @route GET /api/admin/freelance-contracts/
// @access (authenticated, admin)
exports.getContracts = factory.getAll({
  Model: Contract,
  populateDeveloper: CONTRACT_POPULATION_ARR,
});

// @desc get one contract with its transaction
// @route GET /api/admin/freelance-contracts/:id
// @access (authenticated, admin)
exports.getContract = factory.getOne({ Model: Contract, populationOpt: CONTRACT_POPULATION_ARR });

// @desc process one confilicting contract
// @route PUT /api/admin/freelance-contracts/:id/resolve
// @access (authenticated, admin (freelance manager role))
exports.resolveContract = async (req, res, next) => {
  // fetch the contract
  const contract = await Contract.findById(req.params.id);

  // validate the contract :
  let error = validContract(contract, { softDeleted: true }, req);
  if (error) return next(error);

  // validate the state of the contract
  if (contract.status !== 'admin_revising_it') {
    return next(new ApiError($.this_contract_does_not_need_resolving));
  }

  // fetch the transaction and validate it
  const transaction = await Transaction.findById(contract.wallet_transaction_id);
  if (transaction.status !== 'pending') {
    return next(new ApiError($.there_is_a_problem_with_the_contract_wallet_transaction, 400));
  }

  // assure that : the new amount is smaller or equal than the old one
  if (transaction.amount < req.body.new_amount) {
    return next(
      new ApiError($.new_amount_should_be_a_float_greater_than_0_and_smaller_than_the_old_amount),
    );
  }

  const publisher = await User.findById(contract.service_publisher_id);
  const execuctor = await User.findById(contract.service_executor_id);

  // fetch the publisher wallet
  const publisherWallet = await Wallet.findOne({ user_id: contract.service_publisher_id });

  // fetch the executor wallet
  const executorWallet = await Wallet.findOne({ user_id: contract.service_executor_id });

  // increase the amount of the old transaction to the publisher wallet
  publisherWallet.balance += transaction.amount;

  // cancel the old transaction
  transaction.status = 'cancelled';
  await transaction.save();

  // create new transaction
  const newTransaction = new Transaction({
    receiving_wallet_id: transaction.receiving_wallet_id,
    sending_wallet_id: transaction.sending_wallet_id,
    application_profit: profit(req.body.new_amount),
    amount: req.body.new_amount,
    status: 'succeeded',
    respsonsible_admin: { ...req.body.admin },
  });

  // deduce its amount from the publisher
  publisherWallet.balance -= newTransaction.amount;

  // increase its amount to the executor
  executorWallet.balance += newTransaction.amount - newTransaction.application_profit;

  // PROFIT

  // save
  await publisherWallet.save();
  await executorWallet.save();
  await newTransaction.save();

  // Update the contract status
  contract.status = 'resolved_by_admin';
  contract.responsibile_support = {
    _id: req.admin.id,
    name: req.admin.username,
    documentry: req.body.documentry,
    wallet_transaction_id: newTransaction._id,
  };
  await contract.save();

  // Update the freelance project
  await Project.updateOne(
    { _id: contract.freelance_project_id },
    { $set: { done_by: contract.service_executor_id, status: 'completed' } },
  );

  // populate the contract
  await contract.populate(CONTRACT_POPULATION_ARR);

  const tokens = await notificationController.getTokens([
    execuctor._id.toString(),
    publisher._id.toString(),
  ]);

  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToMultipleTokens(
      tokens.tokensList,
      $.admin_resolved,
      $.contract_resolved_by_admin,
      tokens.idsList,
      { contract_id: contract._id.toString() },
    );
    const notification = new Notification({
      title: $.admin_resolved,
      body: $.contract_resolved_by_admin,
      reason: 'Contracts',
      reason_id: contract._id,
      notification_type: 'token',
      receivers: tokens.idsList,
    });
    await notification.save();
  }

  return res.status(200).json({
    status: 'success',
    contract,
  });
};

// @desc count contract with specific filteration
// @route GET /api/admin/freelance-contracts/count
// @access (authenticated, admin)
exports.countProjects = async (req, res) => {
  const count = await documentsCounter({ Model: Contract, query: req.query });

  return res.status(200).json({
    status: 'success',
    contracts_count: count,
  });
};

// @desc download a contract attahced file
// @route GET /api/admin/contracts/attahced-files/:url
// @access (authenticated, admin)
exports.downloadFile = async (req, res, next) => {
  // extract the file name
  const fileUrl = req.params.url;

  // get the file name from the url
  const filename = getFileNameFromPrivateURL(fileUrl);

  // build the file path.
  const filePath = getFilePathByName(filename);

  if (process.env.NODE_ENV === 'development') {
    // assert that : the file does exist .
    if (!fs.existsSync(filePath)) {
      return next(new ApiError($.no_attached_file_was_found_with_this_url, 404));
    }

    // set response header to fit the pdf file .
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; "filename=${filename}"`);

    // send the pdf file .
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    const file = bucket.file(filePath);

    // check if the file exists on the cloud .
    const [exists] = await file.exists();

    if (!exists) {
      return res
        .status(404)
        .json({ status: 'failure', messages: [$.no_attached_file_was_found_with_this_url] });
    }

    await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2025',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; "filename=${filename}"`);
    file.createReadStream().pipe(res);
  }
};
