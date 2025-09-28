const Report = require('../../models/posts_and_related/reports_model');
const ApiError = require('../../utils/api_error');
const $ = require('../../locales/keys');

// @desc handle report
// @route /api/admin/reports/:id/handle
// @access (authenticated, admin (with the appropriate role ))

exports.handleReport = async (req, res, next) => {
  // fetch the report
  const report = await Report.findById(req.params.id).populate('reported_item_id');

  // assure that : the report does exist .
  if (!report)
    return next(new ApiError([$.the_report_does_not_exist, req.params.id], 404, { merge: true }));

  // assure that : the report is not already handled .
  if (report.status !== 'awaiting_review')
    return next(new ApiError($.the_report_is_already_handled, 409));

  // assure that : the reported item does exist .
  const reportedItem = report.reported_item_id;
  report.reported_item_id = reportedItem._id;
  if (!reportedItem) {
    return next(new ApiError($.the_reported_item_does_not_exists, 404));
  }

  // handle the report
  report.responsibile_support_id = req.admin.id;
  report.responsibile_support_name = req.admin.username;
  report.status = req.body.status;
  report.comment = req.body.comment;

  // save the report
  await report.save();

  // decrease the unhandled reports
  reportedItem.unhandled_reports--;
  await reportedItem.save();

  return res.status(200).json({
    status: 'success',
    report,
  });
};
