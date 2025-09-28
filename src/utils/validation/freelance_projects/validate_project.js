const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');

module.exports = (
  project,
  options = { softDeleted: false, blocked: false, permission: false, executor: false },
  req,
) => {
  if (!project) {
    // validate that : the project exists
    return new ApiError([$.freelance_project_not_found, req.params.id], 404, { merge: true });
  }

  if (options.softDeleted && project.deleted_at) {
    // validate that : the project is not soft deleted .
    return new ApiError([$.freelance_project_not_found, req.params.id], 404, { merge: true });
  }

  if (options.blocked && project.blocked) {
    // validate that : the project is not blocked
    return new ApiError([$.freelance_project_is_blocked, req.params.id], 403, { merge: true });
  }

  if (options.permission) {
    // validate that : the user has the permission to modify the project
    if (project.publisher_id.toString() !== req.user.id.toString()) {
      return new ApiError($.you_dont_have_permission, 403);
    }
  }

  if (options.executor) {
    // validate that : the user is the executor of this project
    if (project.done_by.toString() !== req.user.id.toString()) {
      return new ApiError($.you_dont_have_permission, 403);
    }
  }

  return null;
};
