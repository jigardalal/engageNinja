/**
 * EngageNinja Backend Server
 * Express server with middleware and route handlers
 */

// Load backend/.env (project-level). Tenant creds live in DB.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Configuration
const PORT = process.env.BACKEND_PORT || 5173;
const FRONTEND_URL = process.env.CORS_ORIGIN || 'http://localhost:3173';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const SESSION_TIMEOUT_DAYS = parseInt(process.env.SESSION_TIMEOUT_DAYS || 30);

// Initialize Express app
const app = express();

// ===== MIDDLEWARE =====

// CORS middleware - allow localhost development origins
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
};

// In development, allow multiple localhost ports for flexibility
if (NODE_ENV === 'development') {
  corsOptions.origin = (origin, callback) => {
    // Allow localhost on any port, or no origin (for direct API calls)
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow in development
    }
  };
} else {
  corsOptions.origin = FRONTEND_URL;
}

app.use(cors(corsOptions));

// Raw body for webhooks (needed for signature validation)
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Body parsing middleware (skip for webhook raw endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks')) return next();
  return express.json({ limit: '10mb' })(req, res, () => {
    return express.urlencoded({ limit: '10mb', extended: true })(req, res, next);
  });
});

// Cookie parser middleware
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT_DAYS * 24 * 60 * 60 * 1000 // Convert days to milliseconds
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ===== ROUTES =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    name: 'EngageNinja API',
    version: '0.1.0',
    status: 'running',
    environment: NODE_ENV
  });
});

// ===== ROUTE MOUNTING =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenant/users', require('./routes/tenant-users'));
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/admin', require('./routes/admin'));
// app.use('/api/users', require('./routes/users'));
// app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/templates', require('./routes/templates'));

// ===== BILLING SERVICE INITIALIZATION =====
let billingService = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const db = require('./db');
    const StripeProvider = require('./services/stripe');
    billingService = new StripeProvider(db, stripe);
    console.log('✓ Stripe billing service initialized');
  } catch (error) {
    console.warn('⚠ Failed to initialize Stripe billing service:', error.message);
  }
}

// Mount billing routes even if Stripe is not configured so we can still serve the summary endpoint.
const createBillingRoutes = require('./routes/billing');
app.use('/api/billing', createBillingRoutes(require('./db'), billingService));

// Pass billingService to webhook handlers via app.locals
app.locals.billingService = billingService;

app.use('/webhooks', require('./routes/webhooks'));

// ===== ERROR HANDLING =====

// 404 handler for non-existent routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`Error: ${message}`, err);

  res.status(statusCode).json({
    error: err.name || 'Error',
    message: message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ===== DATABASE INITIALIZATION =====

// Run pending database migrations on startup
const migrator = require('./db/migrator');
try {
  migrator.initialize();
} catch (error) {
  console.error('Failed to run database migrations:');
  console.error(error);
  process.exit(1);
}

// ===== SERVER STARTUP =====

const server = app.listen(PORT, () => {
  console.log(`\n🚀 EngageNinja Backend Server`);
  console.log(`================================`);
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${NODE_ENV}`);
  console.log(`✓ CORS Origin: ${FRONTEND_URL}`);
  console.log(`✓ Health check: GET /health\n`);

  // Start message queue processor for sending queued messages
  const messageQueue = require('./services/messageQueue');
  messageQueue.startMessageProcessor();
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n📍 Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
