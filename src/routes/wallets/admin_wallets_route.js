const express = require('express');

const adminWalletsController = require('../../controllers/wallets/admin_wallets_controller');
const adminWalletsValidation = require('../../utils/validation/wallets/admin_wallets_validation');
const accessControl = require('../../middleware/access_control_middleware');
const { typeAdmin } = require('../../helper/custon_validation');

const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['admin']));

router.get('/', adminWalletsController.getAllWallets);

router.get(
  '/cash-transactions/:id',
  adminWalletsValidation.getOneCashTransaction,
  adminWalletsController.getOneCashTransaction,
);

router.get('/cash-transactions', adminWalletsController.getAllCashTransactions);

router.get('/:id', adminWalletsValidation.getOneWallet, adminWalletsController.getOneWallet);

router.use(typeAdmin('walletManager'));

router.put(
  '/:id/suspend',
  adminWalletsValidation.suspendWallet,
  adminWalletsController.suspendWallet,
);

router.put(
  '/:id/unsuspend',
  adminWalletsValidation.unSuspendWallet,
  adminWalletsController.unSuspendWallet,
);

router.post(
  '/:id/deposit',
  adminWalletsValidation.walletDeposit,
  adminWalletsController.walletDeposit,
);

router.post(
  '/:id/withdraw',
  adminWalletsValidation.initiateWalletWithdraw,
  adminWalletsController.initiateWalletWithdraw,
);

module.exports = router;
