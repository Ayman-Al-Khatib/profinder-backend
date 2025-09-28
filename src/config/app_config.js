// Required modules
require('express-async-errors');
require('dotenv').config();

const express = require('express');
const i18n = require('i18n');
const path = require('path');
const winston = require('winston');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
// Configure Firebase Admin SDK
const firebaseConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  storageBucket: 'gs://pro-finder-f7777.appspot.com',
});

// Error handling middleware
const globalError = require('../middleware/error_middleware'); // Global error handling middleware
require('./log')(); // Configure logging
require('./db_connection')(); // Connect to the database

const { getGlobalImage } = require('../middleware/get_global_images');
// Localization keys
const $ = require('../locales/keys'); // Localization keys
const tr = require('../helper/translate'); // Translation helper
const ApiError = require('../utils/api_error'); // Custom API error handler
const myRoutes = require('../routes/index');

// Custom modules
const security = require('./security'); // Custom security configuration middleware
require('./redis_config'); // Load Redis configuration

const app = express(); // Create Express application instance
const server = http.createServer(app); // Create HTTP server instance using Express app

// Socket.IO configuration
const socketIoOptions = {
  cors: {
    // origin: ['https://profinder-d0g1.onrender.com', 'http://127.0.0.1:5500'], // Allowed origins for CORS
    origin: '*', // Allowed origins for CORS
    methods: ['GET', 'POST'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'], // Allowed headers
    credentials: true,
  },
};

const io = socketIo(server, socketIoOptions);

// Middleware setup for serving attachments
app.use((req, res, next) => {
  const fileExtension = path.extname(req.path);
  if (['.pdf', '.docx', '.xlsx'].includes(fileExtension)) {
    // Set Content-Disposition header for certain file types
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.path)}"`);
  }
  next();
});

// Internationalization configuration
i18n.configure({
  autoReload: true, // Auto-reload language files
  updateFiles: false, // Do not update language files
  defaultLocale: 'en', // Default locale
  directory: path.join(__dirname, '../locales'), // Directory containing language files
  locales: ['en', 'ar'], // Supported locales
  queryParameter: 'lang', // Query parameter for setting language
  register: global, // Register i18n globally
});

// Initialize i18n middleware
app.use(i18n.init);
app.use((req, res, next) => {
  let lang = req.query.lang || req.header('Accept-language') || 'en';
  if (!['en', 'ar'].includes(lang)) lang = 'en';
  i18n.setLocale(lang);
  next();
});

// Set language for Socket.IO connections
io.use((socket, next) => {
  let lang =
    socket.handshake.query.lang ||
    socket.handshake.headers['Accept-language'] ||
    socket.handshake.headers['accept-language'] ||
    'en';
  if (!['en', 'ar'].includes(lang)) lang = 'en';
  i18n.setLocale(lang);
  next();
});

// Apply security configurations
security(app);

app.use(express.json({ limit: '10kb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use('/assets', express.static(path.join(__dirname, '../../assets')));
app.use('/public/*', getGlobalImage);
app.use('/public', express.static(path.join(__dirname, '../../uploads/public')));

// Routes setup
myRoutes(app);

// Serve index.html and handle 404 errors
app.use((req, res, next) => {
  return next(
    new ApiError(
      tr(
        $.the_page_you_are_looking_for_might_have_been_removed_had_its_name_changed_or_is_temporarily_unavailable_Please_check_the_URL_for_typos_or_visit_our_homepage_to_start_a_new_search,
      ),
      404,
    ),
  );
});

// Handle global errors
app.use(globalError); // Use global error handler middleware

// Export modules for external use
module.exports = {
  app,
  winston,
  io,
  server,
};
