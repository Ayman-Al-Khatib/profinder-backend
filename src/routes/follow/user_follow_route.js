const express = require('express');
const userFollowValidator = require('../../utils/validation/follow/users_follow_validation');
const userFollowController = require('../../controllers/follow/users_follow_contoller');
const accessControl = require('../../middleware/access_control_middleware');
const router = express.Router();

// Create a new follow relationship
router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.post('/', userFollowValidator.createFollow, userFollowController.createFollowRelationship);

// Remove a follow relationship
router.delete(
  '/:followingId',
  userFollowValidator.checkFollowingId,
  userFollowController.deleteFollowRelationship,
);

router.get(
  '/my-follower/:followingId',
  userFollowValidator.checkFollowingId,
  userFollowController.getFollowRelationshipByIdForFollower,
);
//
router.get(
  '/my-following/:followerId',
  userFollowValidator.checkFollowerId,
  userFollowController.getFollowRelationshipByIdForFollowing,
);

router.get('/all-following', userFollowController.getAllFollowingForCurrentUser);
router.get('/all-followers', userFollowController.getAllFollowersForCurrentUser);

router.get('/follower/count', userFollowController.getFollowerCount);
router.get('/following/count', userFollowController.getFollowingCount);
router.get(
  '/common-followers/:followingId',
  userFollowValidator.checkFollowingId,
  userFollowController.getCommonFollowers,
);

module.exports = router;
