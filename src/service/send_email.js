const nodemailer = require('nodemailer');
const fs = require('fs');
const $ = require('../locales/keys');
const tr = require('../helper/translate');
const path = require('path');

module.exports = async ({
  fromEmail = process.env.FROM_EMAIL,
  toEmail,
  verificationCode,
  username,
  subject = 'Verify your email',
  imagePaths = [],
}) => {
  const emailTemplate = fs.readFileSync(
    path.join(__dirname, '../../src/view/email_template.html'),
    'utf8',
  );

  const emailContent = emailTemplate
    .replace('{{verificationCode}}', verificationCode)
    .replace('{{username}}', username)
    .replace(/{{URL_API_HOSTING}}/g, process.env.URL_API_HOSTING);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD_EMAIL,
    },
  });

  const attachments = imagePaths.map(imagePath => ({
    filename: imagePath.split('/').pop(),
    path: imagePath,
  }));

  const mailOptions = {
    from: `"ProFinder" <${fromEmail}>`,
    to: toEmail,
    subject: subject,
    html: emailContent,
    ...(imagePaths.length > 0 && { attachments: attachments }),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    err.status = 401;
    err.message = tr(
      $.an_error_occurred_while_sending_the_email_to_the_address_you_provided_please_ensure_you_have_an_active_internet_connection_and_that_the_email_address_is_correct_then_try_again,
    );
    throw err;
  }
};
