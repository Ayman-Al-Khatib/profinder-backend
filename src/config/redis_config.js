// Import required modules
const { createClient } = require('redis');
const winston = require('winston');

let redisClient;

(async () => {
  // Initialize Redis client with appropriate configuration based on NODE_ENV
  redisClient = createClient(
    process.env.NODE_ENV === 'development'
      ? {} // Use default options if in development environment
      : {
          url: process.env.REDIS_URL, // Use redisUrl environment variable for Redis connection URL
          socket: {
            connectTimeout: 10000, // Set connection timeout to 10 seconds
          },
        },
  );
  // Event listener for Redis client errors
  redisClient.on('error', err => console.error('Redis Client Error', err));
  // Connect to Redis server
  await redisClient.connect();
  // Retrieve all keys ending with ':socketId'
  const socketIDsKeys = await redisClient.keys('*:socketId');
  // If socketID keys are found, delete them and log the count of deleted keys
  if (socketIDsKeys.length != 0) {
    const counterSocketIDsDeleted = await redisClient.del(socketIDsKeys);
    console.log('Number of socketId keys deleted:', counterSocketIDsDeleted);
  }
  // Retrieve all keys ending with ':status'
  const statusUserKeys = await redisClient.keys('*:status');
  // If status keys are found, delete them and log the count of deleted keys
  if (statusUserKeys != 0) {
    const counterStatusUsersDeleted = await redisClient.del(statusUserKeys);
    console.log('Number of status keys deleted:', counterStatusUsersDeleted);
  }

  /*
    FLUSHDB  – Deletes all keys from the connection's current database.
    FLUSHALL – Deletes all keys from all databases on current host.
  */
  // Uncomment the following line to delete all keys from all Redis databases
  // await redisClient.flushAll();

  winston.info(`Connected to Redis ...`);
})();

module.exports = redisClient;
