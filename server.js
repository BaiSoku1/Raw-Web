require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const uploadRoute = require('./routes/upload');
const rawRoute = require('./routes/raw');
const { router: filesRoute } = require('./routes/files');
const { getStats } = require('./database/database');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMITED', message: 'Too many requests' }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'UPLOAD_RATE_LIMITED', message: 'Too many uploads, try again later' }
});

app.use('/api/', globalLimiter);

app.use('/api/upload', uploadLimiter, uploadRoute);
app.use('/api/files', filesRoute);

app.get('/api/stats', (req, res) => {
  const stats = getStats();
  res.json({
    success: true,
    status: 'operational',
    files: stats.total_files,
    storageBytes: stats.total_size,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/raw', rawRoute);

app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html',
  maxAge: '1h'
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/raw/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Something went wrong' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Endpoint not found' });
  }
  res.status(404).type('text/plain').send('Not found');
});

app.listen(PORT, () => {
  console.log(`RAWDROP running on http://localhost:${PORT}`);
});
