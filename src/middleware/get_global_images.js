const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

exports.getGlobalImage = async (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  const file = bucket.file('uploads/public/' + req.params['0']);
  const [exists] = await file.exists();
  if (!exists) {
    return res.status(404).json({ status: 'failure', messages: 'File not found' });
  }

  await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2025',
  });

  file.createReadStream().pipe(res);
};
