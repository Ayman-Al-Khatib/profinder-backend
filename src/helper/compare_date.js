module.exports = (dateOne, dateTwo, options = { month: true, day: false }) => {
  if (!(dateOne instanceof Date)) dateOne = new Date(dateOne);
  if (!(dateTwo instanceof Date)) dateTwo = new Date(dateTwo);

  let result = dateOne.getFullYear() === dateTwo.getFullYear();
  if (options.month) result = result && dateOne.getMonth() === dateTwo.getMonth();
  if (options.day) result = dateOne.getDay() === dateTwo.getDay();

  return result;
};
