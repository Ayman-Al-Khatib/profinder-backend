const getNestedSchemaType = require('./get_nested_schema_type');

function buildFilterWithMerge(filterQuery, model, filterDeveloper) {
  // Convert filterQuery to a string
  let queryStr = JSON.stringify(filterQuery);

  // Replace certain keywords in the string with MongoDB operators
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

  // Parse the string back to JSON
  const query = JSON.parse(queryStr);

  // Iterate over keys in the query object
  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      // Check if the value is a string and doesn't start with "$"
      const schemaType = getNestedSchemaType(model, key);

      if (
        schemaType === 'String' &&
        typeof query[key] !== 'object' &&
        query[key] !== '' &&
        !query[key].startsWith('$')
      ) {
        // Treat string fields for regex matching
        if (/[a-zA-Z\u0621-\u064A]/.test(query[key])) {
          query[key] = { $regex: query[key].toString(), $options: 'i' }; // 'i' for case-insensitivity
        }
      }
    }
  }

  const mergedFilter = { ...query, ...filterDeveloper };
  return mergedFilter;
}
module.exports = buildFilterWithMerge;
