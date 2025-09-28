// Required modules
const cors = require('cors'); // Middleware for enabling CORS
// const helmet = require('helmet'); // Middleware for setting HTTP headers for security
// const rateLimit = require('express-rate-limit'); // Middleware for rate limiting requests
// const redis = require('./redis_config'); // Redis configuration module
// const RedisStoreBrute = require('express-brute-redis'); // Redis store for Express Brute
// const { RedisStore } = require('rate-limit-redis'); // Redis store for rate limiting
// const mongoSanitize = require('express-mongo-sanitize'); // Middleware for sanitizing input

// // Initialize Redis store for Express Brute
// const bruteStore = new RedisStoreBrute(
//   process.env.NODE_ENV === 'development'
//     ? {} // Use default options if in development environment
//     : {
//         url: process.env.redisUrl, // Use redisUrl environment variable for Redis connection URL
//         socket: {
//           connectTimeout: 10000, // Set connection timeout to 10 seconds
//         },
//       },
// );

// Function to create a new Redis store with a unique prefix
// function createRateLimitStore(prefix) {
//   return new RedisStore({
//     sendCommand: (...args) => redis.sendCommand(args), // Function to send Redis commands
//     prefix, // Prefix for Redis keys
//   });
// }

// Set up CORS middleware
function setupCors(app) {
  // const allowedOrigins = ['https://profinder-d0g1.onrender.com']; // Whitelisted origins
  const corsOptions = {
    // origin: function (origin, callback) {
    //   if (!origin) return callback(null, true);
    //   if (allowedOrigins.indexOf(origin) !== -1) {
    //     callback(null, true); // Allow requests from whitelisted origins
    //   } else {
    //     callback(new Error('Not allowed by CORS')); // Block requests from other origins
    //   }
    // },
    origin: '*', // Allow all origins

    methods: 'GET,PUT,POST,DELETE', // Allowed HTTP methods
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization', // Allowed headers
    exposedHeaders: 'Content-Length,X-Kuma-Revision', // Headers exposed to clients
    credentials: true, // Enable credentials (cookies, HTTP authentication)
    preflightContinue: false, // Disable preflight requests caching
    optionsSuccessStatus: 204, // HTTP status code for successful OPTIONS requests
  };
  app.use(cors(corsOptions)); // Enable CORS with defined options
}

// Set up Helmet middleware for security headers
// function setupHelmet(app) {
//   app.use(helmet());
// }

// Set up rate limiting middleware
// function setupRateLimiter(app) {
//   const limitPostDeletePut = rateLimit({
//     store: createRateLimitStore('post-delete-put'), // Redis store for POST, DELETE, PUT requests
//     windowMs: 1 * 60 * 1000, // 1 minute window for rate limiting
//     max: 20, // Max 20 requests per window
//     message: {
//       status: 'failure',
//       message: 'Too many requests from this IP, please try again later.', // Rate limit exceeded message
//     },
//   });

//   const limitGet = rateLimit({
//     store: createRateLimitStore('get'), // Redis store for GET requests
//     windowMs: 1 * 60 * 1000, // 1 minute window for rate limiting
//     max: 30, // Max 30 requests per window
//     message: {
//       status: 'failure',
//       message: 'Too many requests from this IP, please try again later.', // Rate limit exceeded message
//     },
//   });

//   const limitLogin = rateLimit({
//     store: createRateLimitStore('login'), // Redis store for login requests
//     windowMs: 15 * 60 * 1000, // 15 minute window for rate limiting
//     max: 5, // Max 5 requests per window
//     message: {
//       status: 'failure',
//       message: 'Too many login requests from this IP, please try again later.', // Rate limit exceeded message
//     },
//   });

//   // Apply rate limiting to specific login routes
//   app.use('/api/super-admins/login', limitLogin);
//   app.use('/api/admins/login', limitLogin);
//   app.use('/api/users/login', limitLogin);

//   // Generic rate limiting middleware for GET and other requests
//   app.use((req, res, next) => {
//     if (req.method === 'GET') {
//       limitGet(req, res, next); // Apply limitGet for GET requests
//     } else {
//       limitPostDeletePut(req, res, next); // Apply limitPostDeletePut for POST, DELETE, PUT requests
//     }
//   });
// }

// Set up Express Brute middleware for brute-force protection
// const bruteforce = new ExpressBrute(bruteStore, {
//   freeRetries: 0, // No free retries allowed
//   minWait: 1000, // Minimum wait time between requests (in ms)
//   maxWait: 1000, // Maximum wait time between requests (in ms)
//   lifetime: 60, // Time window for counting retries (in seconds)
//   failCallback: function (req, res, next, nextValidRequestDate) {
//     // Callback function when brute-force protection fails
//     const errorResponse = {
//       status: 'failure',
//       message: 'Too many requests in this time frame.',
//       next_valid_request_date: nextValidRequestDate, // Date when next valid request is allowed
//     };
//     res.status(429).json(errorResponse); // Respond with 429 Too Many Requests status
//   },
// });

// Set up brute-force protection middleware
// function setupBouncer(app) {
//   // app.use(bruteforce.prevent); // Apply Express Brute middleware to prevent brute-force attacks
// }

// Set up HTTP Parameter Pollution protection
// function setupHpp(app) {
//   // Middleware function to prevent repeated parameters
//   function preventRepeatedParameters(req, res, next) {
//     const fieldsToProtect = ['limit', 'page', 'exists', 'fields', 'sort', 'search'];

//     fieldsToProtect.forEach(field => {
//       if (Array.isArray(req.query[field])) {
//         req.query[field] = req.query[field][req.query[field].length - 1]; // Use the last value in case of array
//       }
//     });

//     next();
//   }
//   app.use(preventRepeatedParameters);
// }

// Set up Content Security Policy
// function setupCsp(app) {
//   // Middleware to set Content-Security-Policy header
//   app.use((req, res, next) => {
//     res.setHeader('Content-Security-Policy', "script-src 'self' https://trusted-scripts.com");
//     next(); // Proceed to next middleware
//   });
// }

// Function to sanitize request objects by replacing prohibited characters
// function sanitizeMongo(app) {
//   app.use(mongoSanitize({ replaceWith: '_' })); // Apply express-mongo-sanitize middleware
// }

// Apply all security middleware
function applySecurity(app) {
  setupCors(app);
  // setupHelmet(app);
  // setupRateLimiter(app);
  // setupBouncer(app);
  // setupHpp(app);
  // sanitizeMongo(app);
  // setupCsp(app);
}

module.exports = applySecurity;
