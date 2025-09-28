const winston = require('winston');
const mongoose = require('mongoose');
/*
 * Establishes a connection to the MongoDB database based on the environment (development or production).
 * If in development mode, it uses the local database URI; otherwise, it uses the hosted database URI.
 */

module.exports = function () {
  const databaseUrl =
    process.env.NODE_ENV === 'development'
      ? process.env.MY_LOCAL_DB_URI
      : process.env.MY_HOSTED_DB_URI;

  const options = {
    readPreference: 'secondary', // Set read preference to secondary for MongoDB connection
  };

  mongoose
    .connect(databaseUrl, options) // Connect to MongoDB using the specified URL and options
    .then(() => {
      winston.info(`Connected to MongoDB at ${databaseUrl}...`);
    }) // Log success message
    .catch(error => winston.error(`Failed to connect to MongoDB at ${databaseUrl}: ${error}`));
};
