module.exports = value => {
  if (typeof value == 'number') return true;
  if (typeof value != 'string') return false;
  return !isNaN(value) && !isNaN(parseFloat(value));
};
