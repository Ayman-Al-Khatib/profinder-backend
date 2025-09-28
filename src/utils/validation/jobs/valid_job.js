const ApiError = require('../../../utils/api_error');
const $ = require('../../../locales/keys');

exports.validJob = (
  job,
  options = {
    softDeleted: true,
    blocked: false,
  },
  req,
) => {
  // assure that : the job exists .
  if (!job) {
    return new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true });
  }

  // assure that : the job is not soft deleted .
  if (options.softDeleted && job.deleted_at) {
    return new ApiError([$.no_job_was_found_with_the_id, req.params.id], 404, { merge: true });
  }

  // assure that : the job is not blocked .
  if (options.blocked && job.blocked) {
    return new ApiError([$.the_job_with_the_id_is_blocked, req.params.id], 400, { merge: true });
  }

  return null;
};

exports.jobIsClosed = job => {
  return job.closes_at && new Date(job.closes_at) < new Date();
};
