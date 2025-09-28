const _ = require('lodash');

function extractQueryParameters(permittedKeys, requestQueries, fieldsToSearch) {
  // Extract permitted keys from the request query parameters
  const queryFilters = _.pick(requestQueries, permittedKeys);
  const exists = _.pick(requestQueries, ['exists']).exists || '';
  const keys = exists.split(',');

  keys.forEach(pair => {
    const [key, value] = pair.split('=');
    if (queryFilters[key] === undefined && permittedKeys.includes(key)) {
      queryFilters[key] = { $exists: value === 'true' || value === true };
    }
  });

  // Extract additional operations from the request query parameters (like pagination, sorting, limiting, etc.)
  const operationalParameters = _.pick(requestQueries, [
    'page',
    'sort',
    'limit',
    'fields',
    'search',
  ]);

  let orConditionsToSearch;
  if (operationalParameters.search && fieldsToSearch) {
    orConditionsToSearch = {
      $or: fieldsToSearch.map(field => ({
        [field]: { $regex: operationalParameters.search, $options: 'i' },
      })),
    };
  } else {
    orConditionsToSearch = null;
  }

  // Return an object containing the query filters and operational parameters
  return {
    queryFilters,
    operationalParameters,
    orConditionsToSearch,
  };
}

module.exports = extractQueryParameters;
