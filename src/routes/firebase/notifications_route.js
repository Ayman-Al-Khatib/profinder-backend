const express = require('express');
const accessControl = require('../../middleware/access_control_middleware');
const notificationsController = require('../../controllers/firebase/notifications_controller');
const router = express.Router();

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.get('/', notificationsController.getAllNotifications);

module.exports = router;
