const sendEmail = require('../service/send_email');
const createToken = require('../utils/create_token');

const emailVerificationHandler = async user => {
  // Generate a verification code
  const verify_code = Math.floor(100000 + Math.random() * 900000).toString();

  // Create JWT token containing the verification code
  const token = createToken({
    info: { verify_code },
    expiresIn: process.env.JWT_EXPIRE_TIME_CODE,
  });

  // Format the verification code for better readability
  const formattedVerifyCode = verify_code.split('').join(' ');
  // Send email to the user with the verification code
  await sendEmail({
    toEmail: user.email,
    verificationCode: formattedVerifyCode,
    username: user.username,
  });

  // Save the JWT token to the user's 'verifyCode' field in the database
  user.verify_code = token;
  await user.save();
};
module.exports = emailVerificationHandler;
