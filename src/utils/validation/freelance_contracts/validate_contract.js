const ApiError = require('../../api_error');
const $ = require('../../../locales/keys');

module.exports = (
  contract,
  options = { softDeleted: true, permission: true, executor: false },
  req,
) => {
  // assure that : the contract exists
  if (!contract) {
    return new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true });
  }

  // assure that : the contract is not deleted
  if (options.softDeleted && contract.deleted_at) {
    return new ApiError([$.no_contract_was_found_for_the_id, req.params.id], 404, { merge: true });
  }

  // assure that : the user has authority to modify the contract
  if (options.permission && contract.service_publisher_id.toString() !== req.user.id.toString()) {
    return new ApiError($.you_dont_have_permission, 403);
  }

  if (options.executor && contract.service_executor_id.toString() !== req.user.id.toString()) {
    return new ApiError($.you_dont_have_permission, 403);
  }

  return null;
};
