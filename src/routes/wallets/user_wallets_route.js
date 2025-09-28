const express = require('express');

const userWalletsController = require('../../controllers/wallets/user_wallets_controller');
const userWalletsValidation = require('../../utils/validation/wallets/user_wallets_validation');
const accessControl = require('../../middleware/access_control_middleware');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get(
  '/my-wallet/cash-transactions/:id',
  userWalletsValidation.getOneTransaction,
  userWalletsController.getOneCashTransactions,
);

router.get(
  '/my-wallet/wallet-transactions/:id',
  userWalletsValidation.getOneTransaction,
  userWalletsController.getOneWalletTransaction,
);

router.get('/my-wallet/wallet-transactions', userWalletsController.getMyWalletTransactions);

router.get('/my-wallet/cash-transactions', userWalletsController.getMyCashTransaction);

router.get('/my-wallet', userWalletsController.getMyWallet);

router.get(
  '/my-wallet/statistics',
  userWalletsValidation.statisticsValidation,
  userWalletsController.statistics,
);

router.put(
  '/my-wallet/cash-transactions/:id/handle',
  userWalletsValidation.handleWithdrawTransaction,
  userWalletsController.handleWithdrawTransaction,
);

module.exports = router;
