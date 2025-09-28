const winston = require('winston');
const path = require('path');

module.exports = function () {
  // Determine log level based on environment (production or development)

  const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

  // Define log directory path based on environment (logs/production or logs/development)
  const logDir = path.join('./');

  // Custom log format for Winston
  const customFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `\nTime: ${timestamp} \nLevel: [${level}] \nMessage: ${message}\n`;
  });

  // Format for file logging (includes timestamp and custom format)
  const fileFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    customFormat,
  );

  // Winston transports (logging destinations)
  const transports = [
    // Log errors to error.log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error', // Only log errors
      format: fileFormat, // Use fileFormat for formatting
    }),
    // Log all levels to combined.log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat, // Use fileFormat for formatting
    }),
  ];

  // Configure Winston logger with defined options
  winston.configure({
    level: logLevel, // Set log level
    transports: transports, // Set transports (logging destinations)
    format: winston.format.json(), // JSON format for logs
  });

  // Add console transport for logging in development mode
  if (logLevel === 'debug') {
    winston.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(), // Colorize console output
          winston.format.simple(), // Simple format for console output
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
          }),
          customFormat, // Use customFormat for console output
        ),
        level: logLevel, // Log all levels in console
      }),
    );
  }

  // Handle uncaught exceptions (synchronous errors)
  process.on('uncaughtException', ex => {
    console.log(ex); // Log exception to console
    winston.error(`Synchronous Exception: ${ex.message}`, () => {
      process.exit(1); // Exit process on error
    });
  });

  // Handle unhandled rejections (asynchronous errors)
  process.on('unhandledRejection', ex => {
    console.log(ex); // Log exception to console
    winston.error(`Asynchronous Exception: ${ex.message}`, () => {
      process.exit(1); // Exit process on error
    });
  });
};
