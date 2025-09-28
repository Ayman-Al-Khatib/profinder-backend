const ApiError = require('../utils/api_error');
const $ = require('../locales/keys');
const multer = require('multer');

const handleJwtInvalidSignature = () => new ApiError($.invalid_token_please_login_again, 401);

const handleJwtExpired = () =>
  new ApiError($.expired_token_please_login_again, 403, {
    data: { refresh_token: true },
  });

const handleDuplicateId = () => new ApiError($.duplicate_id_found_please_provide_a_unique_id, 400);

const handleInvalidObjectId = err =>
  new ApiError([$.invalid, ':', [err.path, 'Id'].join('')], 400, { merge: true });

const handleMulterFields = err => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ApiError($.file_size_exceeded_maximum_file_size_allowed, 400);
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    return new ApiError($.too_many_files_uploaded_Maximum_number_of_files_allowed, 400);
  } else {
    return new ApiError(
      [
        $.an_error_occurred_in_the_field,
        err.field + '.',
        $.verify_that_the_field_name_is_written_correctly_and_check_the_number_of_allowed_images,
      ],
      400,
      { merge: true },
    );
  }
};

// eslint-disable-next-line no-unused-vars
const globalError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.log(
    '=======================================================================================================================',
  );

  if (process.env.NODE_ENV === 'development') console.warn(err.stack);
  console.log('\n');

  if (process.env.NODE_ENV === 'development') console.warn(JSON.stringify(err));
  console.log('\n');
  console.error(
    Array.isArray(err.msg || err.message) ? err.msg.join('\n') : err.msg || err.message,
  );
  console.log(
    '=======================================================================================================================\n',
  );

  // Multer error handling
  if (err instanceof multer.MulterError) {
    err = handleMulterFields(err);
  }

  // JWT errors handling
  if (err.name === 'JsonWebTokenError') {
    err = handleJwtInvalidSignature();
  }
  if (err.name === 'TokenExpiredError') {
    err = handleJwtExpired();
  }

  // MongoDB duplicate key error handling
  if (err.name === 'MongoServerError' && err.code === 11000) {
    err = handleDuplicateId();
  }
  // Mongoose invalid ObjectId error handling
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    err = handleInvalidObjectId(err);
  }

  const errMsg = err.msg || err.message;
  const uniqueMessages = Array.isArray(errMsg) ? [...new Set(errMsg)] : [errMsg];
  res.status(err.statusCode).json({
    status: err.status,
    message: uniqueMessages,
    ...err.data,
  });
};

module.exports = globalError;
