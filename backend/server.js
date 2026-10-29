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
const initSocketHandler = require('./socket/socketHandler');
const { seedIfEmpty } = require('./controllers/scheduleController');

// Initialize database connection
connectDB().then(() => {
  seedIfEmpty();
});

const app = express();
const server = http.createServer(app);

// CORS configuration supporting static origins and dynamic local development ports
const rawClientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : [];
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  ...rawClientUrls
].filter(Boolean);

const corsOriginHandler = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);

  // In development, allow ANY localhost/127.0.0.1 origin regardless of port
  if (process.env.NODE_ENV !== 'production') {
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(null, false);
};

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Initialize Socket.io custom handlers & authentication
initSocketHandler(io);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
