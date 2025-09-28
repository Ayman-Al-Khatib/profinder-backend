// Required modules
const { winston, server } = require('./src/config/app_config');
require('./src/routes/index_socket');
// const f = require('./src/controllers/firebase/notifications_service');
// const $ = require('./src/locales/keys');
// Start server
const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;

server.listen(EXPRESS_PORT, () => {
  // Log server start message
  winston.info(`Server Express is running on port ${EXPRESS_PORT}`);
});

// async function a() {
//   const result = await f.sendNotificationToTopic(
//     'users',
//     $.account_not_approved,
//     $.account_not_approved,
//   );
//   console.log('🚀 ~ a ~ result:', result);
// }

// async function b() {
//   const result = await f.sendNotificationToSingleToken(
//     'calf_M4KTvuifwpONrCgdk:APA91bHU7cZ7cyKPY2TObdM3oZEeNyqCHn8c_aGHrprGWe_GdDXDO2D8lJqPnQ5farurn0z6-xeGphHxBqAz1Dwuy9HwucFKzNxjiIRLyGTUHX8A4CGJrBmIKOxeLjMZr0YtMoZuFM_L',
//     $.account_not_approved,
//     $.account_not_approved,
//     '66ad4feabd0eb3a9edf19693',
//   );
//   console.log('🚀 ~ a ~ result:', result);
// }
// async function c() {
//   const result = await f.sendNotificationToMultipleTokens(
//     [
//       'calf_M4KTvuifwpONrCgdk:APA91bHU7cZ7cyKPY2TObdM3oZEeNyqCHn8c_aGHrprGWe_GdDXDO2D8lJqPnQ5farurn0z6-xeGphHxBqAz1Dwuy9HwucFKzNxjiIRLyGTUHX8A4CGJrBmIKOxeLjMZr0YtMoZuFM_L',
//     ],
//     $.account_not_approved,
//     $.account_not_approved,
//     ['66ad4feabd0eb3a9edf19693'],
//   );
//   console.log('🚀 ~ a ~ result:', result);
// }
