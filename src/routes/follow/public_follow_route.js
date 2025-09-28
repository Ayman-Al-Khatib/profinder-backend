const express = require('express');
const publicFollowValidator = require('../../utils/validation/follow/public_follow_validation');
const publicFollowController = require('../../controllers/follow/public_follow_controller');
const accessControl = require('../../middleware/access_control_middleware');
const router = express.Router();
router.use(accessControl.protected());

router.get(
  '/all-following/:followerId',
  publicFollowValidator.checkFollowerId,
  publicFollowController.getAllFollowingForUser,
);
router.get(
  '/all-followers/:followingId',
  publicFollowValidator.checkFollowingId,
  publicFollowController.getAllFollowersForUser,
);

router.get(
  '/follower/count/:followingId',
  publicFollowValidator.checkFollowingId,
  publicFollowController.getFollowerCount,
);
router.get(
  '/following/count/:followerId',
  publicFollowValidator.checkFollowerId,
  publicFollowController.getFollowingCount,
);

module.exports = router;
