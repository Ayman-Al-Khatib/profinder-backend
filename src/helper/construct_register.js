const _ = require('lodash');

const Register = require('../models/registers_model');

module.exports = async options => {
  const { Model, month, type, pipeline } = options;
  const endOfMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const result = await Model.aggregate(pipeline(month, endOfMonth));

  const register = new Register({
    type,
    date: month,
    value: result[0]?.value || 0,
  });

  if (new Date().getMonth() > month.getUTCMonth()) {
    await register.save();
  }

  return _.pick(register, ['value', 'date']);
};
