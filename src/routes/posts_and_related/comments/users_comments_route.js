const express = require('express');
const router = express.Router();
const accessControl = require('../../../middleware/access_control_middleware');
const commentsValidator = require('../../../utils/validation/posts_and_related/comments_validation');
const commentsController = require('../../../controllers/posts_and_related/comments/users_comments_controller');
const reportValidate = require('../../../utils/validation/reports/report_validate');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.post('/', commentsValidator.createCommentValidation, commentsController.createComment);

router.get('/', commentsController.getAllComments);
router.delete('/:id', commentsValidator.accessibilityAllowed, commentsController.deleteOne);

router.post(
  '/:id/report',
  commentsValidator.accessibilityAllowed,
  reportValidate.createReportValidator,
  commentsController.reportComments,
);

router.put('/:id', commentsValidator.updateCommentValidation, commentsController.updateComment);

module.exports = router;
