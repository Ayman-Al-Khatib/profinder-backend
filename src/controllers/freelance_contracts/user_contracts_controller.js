const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const mongoose = require('mongoose');

const Contract = require('../../models/freelance_contracts_model');
const Project = require('../../models/freelance_projects_model');
const User = require('../../models/users_model');
const Transaction = require('../../models/wallet_transactions_model');
const Notification = require('../../models/notifications_model.js');
const Wallet = require('../../models/wallets_model');
const Application = require('../../models/freelance_applications_model');
const notificationController = require('../../service/notifications_service.js');
const factory = require('../../helper/handlers_factory');
const validContract = require('../../utils/validation/freelance_contracts/validate_contract');
const profit = require('../../helper/calc_application_profit');
const processFile = require('../../helper/process_file');
const validProject = require('../../utils/validation/freelance_projects/validate_project');
const ApiError = require('../../utils/api_error');
const getFullName = require('../../helper/get_full_name.js');
const getFileName = require('../../helper/get_file_name_from_private_url');
const $ = require('../../locales/keys');

// admin revising it => if shipped || deadline exceeded .

const FILE_UPLOAD_PATH = '/private/pdf/contracts/';
const FILE_NAME_GENERATOR = filename => {
  return (
    ('freelancecontract-' + new Date().toISOString() + '-' + _.random(10000) + '-' + filename)
      .trim()
      // eslint-disable-next-line no-useless-escape
      .replace(/[\/\\^$*+?()|[\]{}:\s]/g, '-')
  );
};
const CONSTRUCT_PDF_FILE_PATH = filename =>
  path.join(__dirname, '../../../uploads/private/pdf/contracts/', filename);

const POPULATION_ARRAY = [
  { path: 'freelance_project_id', select: '_id title' },
  { path: 'service_executor_id', select: '_id username profile_image' },
  { path: 'service_publisher_id', select: '_id username profile_image' },
  { path: 'wallet_transaction_id' },
  { path: 'responsibile_support.wallet_transaction_id' },
];

const ONE_CONTRACT_PIPELINE = (id, userId) => [
  {
    $match: {
      _id: new mongoose.Types.ObjectId(id),
      service_publisher_id: new mongoose.Types.ObjectId(userId),
    },
  },
  {
    $lookup: {
      from: 'freelanceprojects',
      localField: 'freelance_project_id',
      foreignField: '_id',
      as: 'project',
    },
  },
  { $unwind: '$project' },
  {
    $lookup: {
      from: 'users',
      localField: 'service_publisher_id',
      foreignField: '_id',
      as: 'publisher',
    },
  },
  { $unwind: '$publisher' },
  {
    $lookup: {
      from: 'users',
      localField: 'service_executor_id',
      foreignField: '_id',
      as: 'executor',
    },
  },
  { $unwind: '$executor' },
  {
    $lookup: {
      from: 'wallettransactions',
      localField: 'wallet_transaction_id',
      foreignField: '_id',
      as: 'wallet_transaction_id',
    },
  },
  { $unwind: '$wallet_transaction_id' },
  {
    $addFields: {
      responsibile_support_lookup: {
        $cond: {
          if: { $gt: [{ $type: '$responsibile_support.wallet_transaction_id' }, 'missing'] },
          then: {
            from: 'wallettransactions',
            localField: 'responsibile_support.wallet_transaction_id',
            foreignField: '_id',
            as: 'responsibile_support.wallet_transaction_id',
          },
          else: null,
        },
      },
    },
  },
  {
    $lookup: {
      from: 'wallettransactions',
      localField: 'responsibile_support.wallet_transaction_id',
      foreignField: '_id',
      as: 'responsibile_support.wallet_transaction_id',
    },
  },
  {
    $project: {
      _id: 1,
      freelance_project_id: {
        _id: '$project._id',
        title: '$project.title',
      },
      service_publisher_id: {
        _id: '$publisher._id',
        username: '$publisher.username',
        profile_image: '$publisher.profile_image',
      },
      service_executor_id: {
        _id: '$executor._id',
        username: '$executor.username',
        profile_image: '$executor.profile_image',
      },
      status: 1,
      description: 1,
      terms_and_conditions: 1,
      attached_links: 1,
      attached_files: 1,
      payment: 1,
      start_date: 1,
      deadline: 1,
      end_date: 1,
      wallet_transaction_id: 1,
      created_at: 1,
      updated_at: 1,
    },
  },
];

// @desc create contract
// @route POST /api/user/freelance-contracts/
// @access (authenticated, user)
exports.createContract = async (req, res, next) => {
  const fields = [
    'freelance_project_id',
    'service_executor_id',
    'description',
    'terms_and_conditions',
    'attached_links',
    'payment',
    'start_date',
    'deadline',
  ];

  // extract only these fields from the request body
  req.body = _.pick(req.body, fields);

  // fetch the freelance project
  const project = await Project.findById(req.body.freelance_project_id);

  // validate the project
  let error = validProject(project, { softDeleted: true, blocked: true, permission: true }, req);
  if (error) return next(error);

  // assure that : the project is open
  if (project.status !== 'open') {
    return next(new ApiError($.you_can_only_make_contracts_for_open_projects, 400));
  }

  // fetch the executer
  const executor = await User.findById(req.body.service_executor_id);

  // validate the executor
  if (!executor || executor.deleted_at || executor.blocked)
    return next(
      new ApiError([$.no_user_found_for_this_Id, req.body.service_executor_id], 404, {
        merge: true,
      }),
    );

  // assure that : the executor has applied to contribute to this project
  const application = await Application.findOne({ user_id: executor._id, project_id: project._id });
  if (!application) {
    return next(new ApiError($.the_user_did_not_apply_for_this_project, 400));
  }
  // assure that : there is not pending contract for this project
  let contract = await Contract.findOne({
    freelance_project_id: project._id,
    status: { $ne: 'refused_by_executor' },
    deleted_at: { $exists: false },
  });
  if (contract) {
    return next(new ApiError($.there_is_already_a_pending_contract_for_this_project, 400));
  }

  // assure that : the service publisher has the payment in his wallet
  const publisherWallet = await Wallet.findById(req.user.wallet_id);
  if (publisherWallet.balance < req.body.payment) {
    return next(new ApiError($.you_dont_have_this_amount_in_your_wallet, 400));
  }
  if (publisherWallet.status === 'suspending') {
    return next(
      new ApiError($.your_wallet_is_suspended_you_cannot_deal_with_freelance_contracts, 403),
    );
  }

  // assure that : the service executor wallet is not suspended
  const executorWallet = await Wallet.findById(executor.wallet_id);
  if (executorWallet.status === 'suspended') {
    return next(new ApiError($.the_executor_cannot_make_freelance_contribution, 400));
  }

  // process the attached files if exists
  const attachedFiles = [];
  if (req.files?.attached_files?.length > 0) {
    for (const file of req.files.attached_files) {
      const processedFile = await processFile(
        file,
        FILE_NAME_GENERATOR,
        FILE_UPLOAD_PATH,
        'private-pdf',
      );
      attachedFiles.push(processedFile);
    }
  }

  // create the wallet transaction .
  const transaction = new Transaction({
    sending_wallet_id: req.user.wallet_id,
    receiving_wallet_id: executor.wallet_id,
    application_profit: profit(req.body.payment),
    amount: req.body.payment,
    status: 'pending',
  });
  await transaction.save();

  // deduce the payment from the publisher wallet
  publisherWallet.balance -= req.body.payment;
  await publisherWallet.save();

  // create the contract
  contract = new Contract({
    ...req.body,
    service_publisher_id: req.user.id,
    status: 'awaiting_executor_acception',
    attached_files: attachedFiles,
    wallet_transaction_id: transaction._id,
  });
  await contract.save();
  await contract.populate(POPULATION_ARRAY);

  const tokens = await notificationController.getTokens(executor._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    const name = await getFullName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.made_a_contract_with_you,
      tokens.idsList[0],
      { contract_id: contract._id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.made_a_contract_with_you,
      reason: 'Contracts',
      reason_id: contract._id,
      notification_type: 'token',
      sent_by: req.user.id,
      receivers: tokens.idsList,
      special_data: {
        data: req.user.id,
        type: 'Users',
      },
    });
    notification.save();
  }

  return res.status(200).json({
    status: 'success',
    contract,
  });
};

// @desc get my contracts
// @route GET /api/user/freelance-contracts/
// @access (authenticated, user)
exports.getCreatedContracts = async (req, res, next) => {
  // extract the fields that the user can filter on
  const fields = [
    'status',
    'start_date',
    'sort',
    'end_date',
    'deadline',
    'page',
    'payment',
    'current_page',
    'limit',
  ];
  req.query = _.pick(req.query, fields);

  // get only the contracts of this user , not deleted
  const filterDeveloper = {
    deleted_at: { $exists: false },
    service_publisher_id: req.user.id,
  };

  return factory.getAll({
    Model: Contract,
    filterDeveloper,
    populateDeveloper: POPULATION_ARRAY,
    fieldsToOmitFromResponse: ['__v'],
  })(req, res, next);
};

// @desc get one contract
// @route GET /api/user/freelance-contracts/:id
// @access (authenticated, user)
exports.getOneContract = async (req, res, next) => {
  // fetch the contract
  const contract = await Contract.findById(req.params.id);

  // validate the contract : not soft deleted and the user has access to it
  let error = validContract(contract, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // fetch the project
  const project = await Project.findById(contract.freelance_project_id);

  // validate the project .
  error = validProject(
    project,
    { softDeleted: true, permission: true },
    { ...req, params: { id: project._id.toString() } },
  );
  if (error) return next(error);

  await contract.populate(POPULATION_ARRAY);

  return res.status(200).json({
    status: 'success',
    contract,
  });
};

// @desc update one contract
// @route PUT /api/user/freelance-contracts/:id
// @access (authenticated, user)
exports.updateContract = async (req, res, next) => {
  // fetch the contract
  let contract = await Contract.findById(req.params.id);

  // validate the contract
  let error = validContract(contract, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // fetch the project
  const project = await Project.findById(contract.freelance_project_id);

  // validate the project
  error = validProject(
    project,
    { softDeleted: true, blocked: true, permission: true },
    { ...req, params: { id: project._id.toString() } },
  );
  if (error) return next(error);

  // assure that : the state of the contract is valid
  if (contract.status !== 'awaiting_executor_acception') {
    return next(new ApiError($.you_cannot_update_the_contract_at_this_stage, 403));
  }

  // fields that can be updated
  const fieldsFromBody = [
    'description',
    'terms_and_conditions',
    'attached_links',
    'payment',
    'start_date',
    'deadline',
    'attached_files',
  ];
  req.body = _.pick(req.body, fieldsFromBody);

  // if new files are uploaded , or deleting the old files .
  if (req.files?.attached_files?.length > 0 || req.body.attached_files === '') {
    // delete the old files
    contract.attached_files.forEach(file => {
      const filename = getFileName(file.url);
      const path = CONSTRUCT_PDF_FILE_PATH(filename);
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    });
  }
  // update the attached files
  const attachedFiles = [];
  if (req.files?.attached_files?.length > 0) {
    req.body.attached_files = [];
    // store the new files
    for (const file of req.files.attached_files) {
      const processedFile = await processFile(
        file,
        FILE_NAME_GENERATOR,
        FILE_UPLOAD_PATH,
        'private-pdf',
      );
      attachedFiles.push(processedFile);
    }
  }

  if (req.body.payment) {
    // cancel the old wallet transaction
    let transaction = await Transaction.findById(contract.wallet_transaction_id);
    transaction.status = 'cancelled';
    await transaction.save();
    const wallet = await Wallet.findById(transaction.sending_wallet_id);
    wallet.balance += transaction.amount;
    // assure that : the user has this amount in his wallet
    if (wallet.balance < req.body.payment) {
      return next(new ApiError($.you_dont_have_this_amount_in_your_wallet, 400));
    }
    wallet.balance -= req.body.payment;
    await wallet.save();
    // make a new transaction
    // create the wallet transaction .
    const newTransaction = new Transaction({
      sending_wallet_id: transaction.sending_wallet_id,
      receiving_wallet_id: transaction.receiving_wallet_id,
      application_profit: profit(req.body.payment),
      amount: req.body.payment,
      status: 'pending',
    });
    await newTransaction.save();
    req.body.wallet_transaction_id = newTransaction._id;
  }

  if (req.body.attached_files === '') req.body.attached_files = [];

  contract = await Contract.findByIdAndUpdate(
    contract._id,
    { $set: { ...req.body } },
    { new: true },
  ).populate(POPULATION_ARRAY);

  return res.status(200).json({
    status: 'success',
    contract,
  });

  // const callback = async response => {
  //   const executor = await User.findById(contract.service_executor_id).select(
  //     '_id username profile_image',
  //   );
  //   const publisher = await User.findById(contract.service_publisher_id).select(
  //     '_id username profile_image',
  //   );
  //   const project = await Project.findById(contract.freelance_project_id).select('_id title');
  //   response.contract.service_executor_id = executor;
  //   response.contract.service_publisher_id = publisher;
  //   response.contract.freelance_project_id = project;
  //   return response;
  // };

  // return factory.updateOne({
  //   Model: Contract,
  //   fields: [...fieldsFromBody, 'attached_files', 'wallet_transaction_id'],
  //   callback,
  // })(req, res, next);
};

// @desc delete one contract
// @route DELETE /api/user/freelance-contracts/:_id
// @access (authenticated, user)
exports.deleteContract = async (req, res, next) => {
  // fetch the contract
  const contract = await Contract.findById(req.params.id);

  // validate the contract
  let error = validContract(contract, { softDeleted: true, permission: true }, req);
  if (error) return next(error);

  // fetch the project
  const project = await Project.findById(contract.freelance_project_id);

  // validate the project
  error = validProject(
    project,
    { softDeleted: true, permission: true },
    { ...req, params: { id: project._id.toString() } },
  );

  // check the the status of the contract is valid
  if (
    contract.status !== 'refused_by_executor' &&
    contract.status !== 'awaiting_executor_acception'
  ) {
    return next(new ApiError($.you_cannot_delete_the_contract_at_this_stage, 403));
  }

  // process deleting the wallet transactions
  const transaction = await Transaction.findById(contract.wallet_transaction_id);
  if (transaction.status !== 'cancelled') {
    transaction.status = 'cancelled';
    await transaction.save();

    const wallet = await Wallet.findById(transaction.sending_wallet_id);
    wallet.balance += transaction.amount;
    await wallet.save();
  }

  // delete the attached files
  contract.attached_files?.forEach(file => {
    const filename = getFileName(file.url);
    const path = CONSTRUCT_PDF_FILE_PATH(filename);
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  });

  // delete the contract
  contract.deleted_at = new Date();
  await contract.save();

  return res.status(204).send();
};

// @desc mark one contract as successfully done .
// @route PUT /api/user/freelance-projects/:id/success
// @access (authenticated, user)
exports.successContract = async (req, res, next) => {
  // fetch the contract .
  let result = await Contract.aggregate(ONE_CONTRACT_PIPELINE(req.params.id, req.user.id));

  // assure that : the contract exists .
  if (result.length < 1) {
    return next(
      new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // extract the contract from the result array
  result = result[0];

  // assure that : the contract is not already marked successfully done
  if (result.status === 'successfully_done') {
    return next(new ApiError($.you_already_marked_the_contract_as_successfully_done, 409));
  }

  // assure that : the contract is shipped
  if (result.status !== 'shipped_from_executor') {
    return next(
      new ApiError(
        $.the_contract_should_be_marked_as_shipped_before_making_it_successfully_done,
        400,
      ),
    );
  }

  // fetch the transaction and validate it
  const transaction = await Transaction.findById(result.wallet_transaction_id);
  if (transaction.status !== 'pending') {
    return next(new ApiError($.there_is_a_problem_with_the_contract_wallet_transaction, 400));
  }

  // Update the contract status
  await Contract.updateOne({ _id: req.params.id }, { $set: { status: 'successfully_done' } });

  // Update the freelance project
  await Project.updateOne(
    { _id: result.freelance_project_id },
    { $set: { done_by: result.service_executor_id, status: 'completed' } },
  );

  // Update the wallet transaction
  transaction.status = 'succeeded';
  await transaction.save();

  // Update the executor's wallet balance
  await Wallet.updateOne(
    { _id: transaction.receiving_wallet_id },
    { $inc: { balance: transaction.amount - transaction.application_profit } },
  );

  const tokens = await notificationController.getTokens(result.service_executor_id._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    const name = await getFullName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.has_marked_the_contract_as_success,
      tokens.idsList[0],
      { contract_id: result._id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.has_marked_the_contract_as_success,
      reason: 'Contracts',
      reason_id: result._id,
      notification_type: 'token',
      sent_by: req.user.id,
      receivers: tokens.idsList,
      special_data: {
        data: req.user.id,
        type: 'Users',
      },
    });
    notification.save();
  }

  result.status = 'successfully_done';

  return res.status(200).json({
    status: 'success',
    contract: result,
  });
};

// @desc mark it to 'admin_revising_it' .
// @route PUT /api/user/freelance-projects/:id/complain
// @access (authenticated, user)
exports.complainContract = async (req, res, next) => {
  // fetch the contract .
  let result = await Contract.aggregate(ONE_CONTRACT_PIPELINE(req.params.id, req.user.id));

  // assure that : the contract exists .
  if (result.length < 1) {
    return next(
      new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // extract the contract from the result array
  result = result[0];

  // assure that : the contract is not already complained.
  if (result.status === 'admin_revising_it') {
    return next(new ApiError($.you_have_already_complained_about_the_contract, 409));
  }
  // assure that : the contract is shipped
  if (result.status !== 'shipped_from_executor' && result.deadline > new Date()) {
    return next(
      new ApiError(
        $.the_contract_should_either_be_shipped_or_the_deadline_met_before_you_can_complain_about_it,
        400,
      ),
    );
  }

  // Update the contract status
  await Contract.updateOne({ _id: req.params.id }, { $set: { status: 'admin_revising_it' } });

  result.status = 'admin_revising_it';

  const tokens = await notificationController.getTokens(result.service_executor_id._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    const name = await getFullName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.has_marked_the_contract_complain,
      tokens.idsList[0],
      { contract_id: result._id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.has_marked_the_contract_complain,
      reason: 'Contracts',
      reason_id: result._id,
      notification_type: 'token',
      sent_by: req.user.id,
      receivers: tokens.idsList,
      special_data: {
        data: req.user.id,
        type: 'Users',
      },
    });
    notification.save();
  }

  return res.status(200).json({
    status: 'success',
    contract: result,
  });
};
// next :
// suggestions (companies , jobs, projects)
