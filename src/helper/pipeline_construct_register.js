const _ = require('lodash');

const Register = require('../models/registers_model');

module.exports = async options => {
  const { Model, month, type } = options;
  const endOfMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const count = await Model.find({
    $and: [{ created_at: { $gte: month } }, { created_at: { $lte: endOfMonth } }],
  }).countDocuments();

  const register = await Register.create({
    type,
    date: month,
    value: count,
  });

  return _.pick(register, ['value', 'date']);
};
