// please note : month is 0 indexed in js .

const getFirstDayOfMonth = (year, month) => {
  return new Date(Date.UTC(year, month - 1, 1));
};

const splitDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error('Start date must be earlier than end date');
  }

  const months = [];
  let current = new Date(getFirstDayOfMonth(start.getFullYear(), start.getMonth() + 1)); // Start from the first day of start month
  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth() + 1; // getUTCMonth() returns 0-based month index

    months.push(getFirstDayOfMonth(year, month));

    current.setUTCMonth(current.getUTCMonth() + 1); // Move to the next month
  }

  return months;
};

module.exports = {
  getFirstDayOfMonth,
  splitDateRange,
};
