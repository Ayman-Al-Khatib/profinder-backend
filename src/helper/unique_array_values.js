module.exports = arr => {
  if (arr.length === 0) return true;
  const lowerCaseValues = arr.map(value => value.toLowerCase());
  return new Set(lowerCaseValues).size === lowerCaseValues.length;
};
