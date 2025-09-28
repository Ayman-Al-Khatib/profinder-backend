const express = require('express');
const pubicTopicsPostsController = require('../../controllers/topics_posts/pubic_topics_posts_controller');
const accessControl = require('../../middleware/access_control_middleware');
const router = express.Router();

router.get('/:name', accessControl.protected(), pubicTopicsPostsController.getAllTopics);

module.exports = router;
