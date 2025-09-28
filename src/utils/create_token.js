const jwt = require('jsonwebtoken');

const createToken = ({ info, expiresIn }) =>
  jwt.sign(info, process.env.JWT_SECRET_KEY, {
    expiresIn: expiresIn | process.env.JWT_EXPIRE_TIME_TOKEN,
  });

module.exports = createToken;
