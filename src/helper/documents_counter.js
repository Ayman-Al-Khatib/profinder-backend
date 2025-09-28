const extractQueryParameters = require('../helper/extract_query_parameters');
const getAllFields = require('../helper/get_all_field_schema');
const buildFilterWithMerge = require('../helper/build_filter_with_merge');

module.exports = async ({ Model, filterDeveloper, query }) => {
  const { queryFilters } = extractQueryParameters(
    [...getAllFields(Model.schema), ...Object.keys(Model.schema.paths)],
    query,
  );
  const finalFilter = buildFilterWithMerge(queryFilters, Model, filterDeveloper);
  return await Model.countDocuments(finalFilter);
};
