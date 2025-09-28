module.exports = function aggregateSort(sortString) {
  const sortFields = sortString.split(' ').map(field => {
    if (field.startsWith('-')) {
      return { [field.substring(1)]: -1 };
    } else {
      return { [field]: 1 };
    }
  });

  const sortObject = sortFields.reduce((acc, field) => {
    return { ...acc, ...field };
  }, {});
  return sortObject;
};
