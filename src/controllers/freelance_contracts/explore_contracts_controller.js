const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const { default: mongoose } = require('mongoose');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

const Contract = require('../../models/freelance_contracts_model');
const Project = require('../../models/freelance_projects_model');
const User = require('../../models/users_model');
const Transaction = require('../../models/wallet_transactions_model');
const Wallet = require('../../models/wallets_model');
const Notification = require('../../models/notifications_model.js');

const validProject = require('../../utils/validation/freelance_projects/validate_project');
const ApiError = require('../../utils/api_error');
const notificationController = require('../../service/notifications_service.js');
const getFullName = require('../../helper/get_full_name.js');
const convertValues = require('../../helper/convert_values');
const buildFilterWithMerge = require('../../helper/build_filter_with_merge');
const getFileNameFromPrivateURL = require('../../helper/get_file_name_from_private_url');
const printContract = require('../../helper/print_contract');
const parseSortString = require('../../helper/parse_sort_string.js');
const $ = require('../../locales/keys');

const getFilePathByName = filename => {
  return process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../../uploads/private/pdf/contracts/', filename)
    : path.join('uploads/private/pdf/contracts/', filename).replace(/\\/g, '/');
};

const PENDING_STATUS = [
  'pending',
  'successfully_done',
  'admin_revising_it',
  'resolved_by_admin',
  'shipped_from_executor',
];

const CONTRACT_POPULATION_ARR = [
  { path: 'freelance_project_id', select: '_id title' },
  { path: 'service_executor_id', select: '_id username profile_image' },
  { path: 'service_publisher_id', select: '_id username profile_image' },
  { path: 'wallet_transaction_id' },
  { path: 'responsibile_support.wallet_transaction_id' },
];

const ONE_CONTRACT_PIPELINE = (id, userId, validation = true) => [
  // Match the contract by ID
  {
    $match: {
      _id: new mongoose.Types.ObjectId(id),
      service_executor_id: new mongoose.Types.ObjectId(userId),
    },
  },

  // Lookup and unwind the freelance project
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
    $match: validation
      ? { 'project.deleted_at': { $exists: false }, 'project.blocked': { $exists: false } }
      : {},
  },

  // Lookup and unwind the service publisher
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
    $match: validation
      ? { 'publisher.deleted_at': { $exists: false }, 'publisher.blocked': { $exists: false } }
      : {},
  },

  // Lookup and unwind the service executor
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
      responsibile_support_exists: { $gt: [{ $type: '$responsibile_support' }, 'missing'] },
    },
  },
  {
    $lookup: {
      from: 'wallettransactions',
      localField: 'responsibile_support.wallet_transaction_id',
      foreignField: '_id',
      as: 'responsibile_support.wallet_transaction_id',
      let: { responsibile_support_exists: '$responsibile_support_exists' },
      pipeline: [{ $match: { $expr: { $eq: ['$responsibile_support_exists', true] } } }],
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
      responsibile_support: 1,
    },
  },
];

// @desc get all contracts that the user is executor
// @route GET /api/explore/freelance-projects/
// @access (authenticated, user)
exports.getAllExecutingContract = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = Math.max(1, parseInt(req.query.limit)) || 10;
  const skip = (page - 1) * limit;
  const sort = req.query.sort ? parseSortString(req.query.sort) : null;

  req.query = _.pick(req.query, ['status', 'start_date', 'end_date', 'deadline', 'payment']);
  req.query = buildFilterWithMerge(req.query, Contract, null);
  req.query = convertValues(req.query);

  const match = {
    service_executor_id: new mongoose.Types.ObjectId(req.user.id),
    deleted_at: { $exists: false },
    ...req.query,
  };

  const pipeline = [
    {
      $match: match,
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
      $match: {
        $or: [
          {
            status: {
              $in: PENDING_STATUS,
            },
          },
          { 'project.deleted_at': { $exists: false }, 'project.blocked': { $exists: false } },
        ],
      },
    },
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
      $match: {
        $or: [
          {
            status: {
              $in: PENDING_STATUS,
            },
          },
          { 'publisher.deleted_at': { $exists: false }, 'publlisher.blocked': { $exists: false } },
        ],
      },
    },
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
      $unwind: {
        path: '$responsibile_support.wallet_transaction_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $facet: {
        documents: [
          {
            $project: {
              _id: 1,
              freelance_project_id: { _id: '$project._id', title: '$project.title' },
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
              responsibile_support: 1,
            },
          },
          { $sort: sort ? sort : { created_at: 1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total_count: [{ $count: 'count' }],
      },
    },
  ];
  const result = await Contract.aggregate(pipeline);

  const response = {
    status: 'success',
    pagination: {
      page,
      limit,
      total_count: result[0]?.total_count[0]?.count || 0,
      count: result[0]?.documents?.length || 0,
    },
    contracts: result[0]?.documents || [],
  };

  return res.status(200).json(response);
};

// @desc get one contract user is executing
// @route GET /api/explore/freelance-projects/:id
// @access (authenticated, user)
exports.getOneExecutingContract = async (req, res, next) => {
  // fetch the contract
  const contract = await Contract.findOne({
    _id: req.params.id,
    $or: [{ service_executor_id: req.user.id }, { service_publisher_id: req.user.id }],
    deleted_at: { $exists: false },
  }).populate(CONTRACT_POPULATION_ARR);

  const notFoundErr = new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, {
    merge: true,
  });

  // assure that : the contract exists and not deleted
  if (!contract) {
    return next(notFoundErr);
  }

  // fetch the contract and validate it
  const project = await Project.findById(contract.freelance_project_id);
  let error = validProject(
    project,
    { softDeleted: true, blocked: true },
    { ...req, params: { id: project._id } },
  );
  if (error && !PENDING_STATUS.some(status => status === contract.status)) return next(notFoundErr);

  // fetch the publisher and validate it
  const publisher = await User.findById(contract.service_publisher_id);
  if (
    (!publisher || publisher.deleted_at || publisher.blocked) &&
    !PENDING_STATUS.some(status => status === contract.status)
  ) {
    return next(notFoundErr);
  }

  return res.status(200).json({
    status: 'success',
    contract,
  });
};

// @desc refuse a contract
// @route PUT /api/explore/freelance-projects/:id/refuse
// @access (authenticated, user)
exports.refuseContract = async (req, res, next) => {
  // fetch the contract
  let result = await Contract.aggregate(ONE_CONTRACT_PIPELINE(req.params.id, req.user.id));

  // assure that : the contract exists .
  if (result.length < 1) {
    return next(
      new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // get the contract from the list of docs .
  result = result[0];

  if (result.status === 'refused_by_executor') {
    return next(new ApiError($.you_already_refused_this_contract, 409));
  }

  // assure that : the contract is awaiting for acception .
  if (result.status !== 'awaiting_executor_acception') {
    return next(new ApiError($.you_cannot_refuse_to_execute_the_service_at_this_stage, 400));
  }

  // cancel the transaction .
  const transaction = await Transaction.findById(result.wallet_transaction_id);
  const wallet = await Wallet.findById(transaction.sending_wallet_id);
  // assure that  : the transaction is indeed pending
  if (transaction.status === 'pending') {
    wallet.balance += transaction.amount;
    transaction.status = 'cancelled';
    await wallet.save();
    await transaction.save();
  } else {
    return next(new ApiError($.there_is_a_problem_with_the_contract_wallet_transaction));
  }

  // refuse the contract .
  await Contract.findByIdAndUpdate(req.params.id, {
    status: 'refused_by_executor',
  });
  result.status = 'refused_by_executor';

  const tokens = await notificationController.getTokens(result.service_publisher_id._id.toString());
  const name = await getFullName(req);
  if (tokens && tokens.idsList.length > 0) {
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.has_refused_your_contract,
      tokens.idsList[0],
      { contract_id: result._id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.has_refused_your_contract,
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

  return res.status(200).json({ status: 'success', contract: result });
};

// @desc accept a contract
// @route PUT /api/explore/freelance-contracts/:id/accept
// @access (authenticated, user)
exports.acceptContract = async (req, res, next) => {
  // fetch the contract
  let result = await Contract.aggregate(ONE_CONTRACT_PIPELINE(req.params.id, req.user.id));

  // assure that : the contract exists .
  if (result.length < 1) {
    return next(
      new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // get the contract from the list of docs .
  result = result[0];

  if (result.status === 'pending') {
    return next(new ApiError($.you_already_accepted_this_contract, 409));
  }

  // assure that : the contract is awaiting for acception .
  if (result.status !== 'awaiting_executor_acception') {
    return next(new ApiError($.you_cannot_accept_the_contract_at_this_stage, 400));
  }

  // assure that : the project status is open and update it
  const project = await Project.findById(result.freelance_project_id);
  if (project.status !== 'open') {
    return next(
      new ApiError(
        $.this_project_is_no_longer_open_for_contribution_please_refuse_this_contract,
        400,
      ),
      400,
    );
  }
  project.status = 'contracted';

  // assure that : publisher and executor wallet is not suspended
  const pubWallet = await Wallet.findOne({ user_id: result.service_publisher_id._id });
  if (pubWallet.status === 'suspended') {
    return next(
      new ApiError($.the_publisher_cannot_make_freelance_contracts_suspended_wallet, 400),
    );
  }
  const execWallet = await Wallet.findOne({ user_id: result.service_executor_id._id });
  if (execWallet.status === 'suspended') {
    return next(
      new ApiError($.your_wallet_is_suspended_you_cannot_deal_with_freelance_contracts, 403),
    );
  }

  // assure that : the wallet transaction status is valid (pending)
  const transaction = await Transaction.findById(result.wallet_transaction_id);
  if (transaction.status !== 'pending') {
    return next(new ApiError($.there_is_a_problem_with_the_contract_wallet_transaction, 400));
  }

  // accept the contract .
  await Contract.findByIdAndUpdate(req.params.id, {
    status: 'pending',
  });
  await project.save();
  result.status = 'pending';

  const tokens = await notificationController.getTokens(result.service_publisher_id._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    const name = await getFullName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.has_accepted_your_contract,
      tokens.idsList[0],
      { contract_id: result._id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.has_accepted_your_contract,
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
    console.log(notification);
    notification.save();
  }

  return res.status(200).json({ status: 'success', contract: result });
};

// @desc ship a contract
// @route PUT /api/explore/freelance-contracts/:id/ship
// @access (authenticated, user)
exports.shipContract = async (req, res, next) => {
  // fetch the contract
  let result = await Contract.aggregate(ONE_CONTRACT_PIPELINE(req.params.id, req.user.id, false));

  // assure that : the contract exists .
  if (result.length < 1) {
    return next(
      new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true }),
    );
  }

  // get the contract from the list of docs .
  result = result[0];

  // assure that : the contract is not already shipped
  if (result.status === 'shipped_from_executor') {
    return next(new ApiError($.you_have_already_shipped_the_contract, 409));
  }

  // assure that : the contract is awaiting for shipping .
  if (result.status !== 'pending') {
    return next(new ApiError($.you_cannot_ship_the_contract_at_this_stage, 400));
  }

  // ship the contract .
  const shippingDate = new Date();
  await Contract.findByIdAndUpdate(req.params.id, {
    status: 'shipped_from_executor',
    end_date: shippingDate,
  });
  result.status = 'shipped_from_executor';
  result.end_date = shippingDate;

  const tokens = await notificationController.getTokens(result.service_publisher_id._id.toString());
  if (tokens && tokens.idsList.length > 0) {
    const name = await getFullName(req);
    notificationController.sendNotificationToSingleToken(
      tokens.tokensList[0],
      name,
      $.has_delivered_the_work,
      tokens.idsList[0],
      { contract_id: result._id.toString() },
    );
    const notification = new Notification({
      title: name,
      body: $.has_delivered_the_work,
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

  return res.status(200).json({ status: 'success', contract: result });
};

// @desc download a contract attahced file
// @route GET /api/explore/contracts/:id/attahced-files/:url
// @access (authenticated ,user)
exports.downloadFile = async (req, res, next) => {
  // extract the file name
  const fileUrl = req.params.url;

  // query the contract .
  const contract = await Contract.findOne({
    $or: [{ service_publisher_id: req.user.id }, { service_executor_id: req.user.id }],
    _id: req.params.id,
  });

  // assert that : the contract that holds the file does exist, not soft deleted .
  if (!contract || contract.deleted_at) {
    return next(new ApiError($.no_attached_file_was_found_with_this_url, 404, { merge: true }));
  }

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
    res.setHeader('Content-Disposition', `attachment: filename=${filename}`);

    // send the pdf file .
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    const file = bucket.file(filePath);
    console.log(filePath);
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
    res.setHeader('Content-Disposition', `attachment: filename=${filename}`);
    file.createReadStream().pipe(res);
  }
};

// @desc print a contract and download it
// @route GET /api/explore/contracts/:id/print-and-download
// @access (authenticated ,user)
exports.printAndDownload = async (req, res, next) => {
  let contract = await Contract.findOne({
    _id: req.params.id,
    $or: [{ service_publisher_id: req.user.id }, { service_executor_id: req.user.id }],
  }).populate(CONTRACT_POPULATION_ARR);

  // assert that : the contract that holds the file does exist, not soft deleted .
  if (!contract || contract.deleted_at) {
    return next(new ApiError($.no_attached_file_was_found_with_this_url, 404, { merge: true }));
  }

  contract = contract.toObject();

  try {
    const pdfBytes = await printContract(contract);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contract.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.log(error);
    return next(new ApiError($.something_went_wrong));
  }
};
