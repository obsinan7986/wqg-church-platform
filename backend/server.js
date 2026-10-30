require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const liveMeetingRoutes = require('./routes/liveMeetingRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const gospelMediaRoutes = require('./routes/gospelMediaRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const hrRoutes = require('./routes/hrRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const eventRoutes = require('./routes/eventRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const auditRoutes = require('./routes/auditRoutes');
const radioRoutes = require('./routes/radioRoutes');
const siteTextRoutes = require('./routes/siteTextRoutes');
const radioService = require('./services/radioService');
const initSocketHandler = require('./socket/socketHandler');
const { seedIfEmpty } = require('./controllers/scheduleController');

// Initialize database connection
connectDB().then(() => {
  seedIfEmpty();
  radioService.init();
});

const app = express();
const server = http.createServer(app);

// Trust reverse proxy (Render, Vercel, Heroku) for correct client IP detection & rate-limiting
app.set('trust proxy', 1);

// CORS configuration supporting production domains, Vercel preview URLs, and dynamic local development
const rawClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''))
  : [];

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://wqg-church-platform-obsa1.vercel.app',
  'https://wqg-church-platform.vercel.app',
  'https://wqg-church-platform.onrender.com'
];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...rawClientUrls]))
  .filter(Boolean)
  .map((origin) => origin.toLowerCase());

const corsOriginHandler = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
  if (!origin) return callback(null, true);

  const cleanOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();

  // If wildcard is configured in CLIENT_URL
  if (process.env.CLIENT_URL === '*') {
    return callback(null, true);
  }

  // Allow localhost or 127.0.0.1 on any port in all environments for local testing
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
    return callback(null, true);
  }

  // Allow all Vercel deployments (*.vercel.app, preview URLs, branch URLs)
  if (cleanOrigin.endsWith('.vercel.app')) {
    return callback(null, true);
  }

  // Allow Render domains (*.onrender.com)
  if (cleanOrigin.endsWith('.onrender.com')) {
    return callback(null, true);
  }

  // Check explicitly configured allowed origins
  if (allowedOrigins.includes(cleanOrigin)) {
    return callback(null, true);
  }

  console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
  return callback(null, false);
};

const corsOptions = {
  origin: corsOriginHandler,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
};

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: corsOptions
});

// Initialize Socket.io custom handlers & authentication
initSocketHandler(io);

// Enable CORS middleware first to immediately handle preflight OPTIONS requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically with full CORS and byte-range streaming support
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  },
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Accept-Ranges', 'bytes');
    }
  })
);

// Attach Socket.io to request object for downstream controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Root / Health Check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/live', liveMeetingRoutes);
app.use('/api/meetings', liveMeetingRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/media-documents', mediaRoutes);
app.use('/api/media', gospelMediaRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/radio', radioRoutes);
app.use('/api/site-text', siteTextRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [Server Error] Port ${PORT} is already in use.`);
    console.error(`💡 To terminate the process using port ${PORT} in Windows PowerShell, run:`);
    console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
  } else {
    console.error('[Server Error]:', err);
  }
});

server.listen(PORT, () => {
  console.log(`[Server] WQG Platform API is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[UnhandledRejection]: ${err.message}`);
});
