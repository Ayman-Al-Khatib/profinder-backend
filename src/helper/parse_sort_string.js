const parseSortString = sortString => {
  const sortObject = {};
  const sortFields = sortString.split(',');

  sortFields.forEach(field => {
    if (field.startsWith('-')) {
      sortObject[field.substring(1)] = -1;
    } else {
      sortObject[field] = 1;
    }
  });

  return sortObject;
};

module.exports = parseSortString;
