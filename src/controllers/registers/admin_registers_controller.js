const Register = require('../../models/registers_model');
const Project = require('../../models/freelance_projects_model');
const User = require('../../models/users_model');
const Transaction = require('../../models/wallet_transactions_model');
const { Job } = require('../../models/jobs_model');
const { splitDateRange } = require('../../helper/split_date_range');
const constructRegister = require('../../helper/construct_register');

function compare(a, b) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
}

const COUNT_PIPE_LINE = (startDate, endDate) => [
  {
    $match: {
      created_at: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    },
  },
  {
    $count: 'totalCount',
  },
  {
    $project: {
      _id: 0,
      value: '$totalCount',
    },
  },
];

const PROFIT_SUM_PIPELINE = (startDate, endDate) => [
  {
    $match: {
      created_at: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      status: 'succeeded',
    },
  },
  {
    $group: {
      _id: null,
      totalProfit: { $sum: '$application_profit' },
    },
  },
  {
    $project: {
      _id: 0,
      value: '$totalProfit',
    },
  },
];

const registerFactory = (Model, type, pipeline) => {
  return async (req, res) => {
    const { start_date, end_date } = req.query;

    let months = splitDateRange(start_date, end_date);

    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];

    let registers = await Register.find({
      type,
      date: { $gte: firstMonth, $lte: lastMonth },
    }).select('date value -_id');

    months = months.filter(month => {
      return !registers.some(register => register.date.getUTCMonth() === month.getUTCMonth());
    });

    let newRegisters = await months.reduce(async (accPromise, curr) => {
      const acc = await accPromise;
      const register = await constructRegister({ Model, month: curr, type, pipeline });
      acc.push(register);
      return acc;
    }, []);

    registers = [...newRegisters, ...registers].sort(compare);

    return res.status(200).json({ status: 'success', registers });
  };
};

exports.jobsRegister = registerFactory(Job, 'job', COUNT_PIPE_LINE);

exports.projectsRegister = registerFactory(Project, 'project', COUNT_PIPE_LINE);

exports.profitsRegister = registerFactory(Transaction, 'profit', PROFIT_SUM_PIPELINE);

exports.usersRegister = registerFactory(User, 'user', COUNT_PIPE_LINE);

exports.deleteRegisters = async (req, res, next) => {
  await Register.deleteMany();
  return res.status(204).send();
};
