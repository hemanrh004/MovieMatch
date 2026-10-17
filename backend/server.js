require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const AppError = require('./utils/AppError');
const { sendSuccess } = require('./utils/apiResponse');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { sanitizeInput } = require('./middleware/validationMiddleware');
const initSocket = require('./socket/socketHandler');

// ---- Environment checks ----
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_secret') {
  if (process.env.NODE_ENV === 'production') { console.error('JWT_SECRET must be set to a strong value in production.'); process.exit(1); }
  console.warn('WARNING: JWT_SECRET is missing or still the default. Set a long random value in .env');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_only_insecure_secret';
}
if (!process.env.MONGO_URI) { console.error('MONGO_URI is missing. Copy .env.example to .env and fill it in.'); process.exit(1); }
if (!process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_ACCESS_TOKEN.startsWith('your_')) {
  console.warn('WARNING: TMDB_ACCESS_TOKEN is not set. Movie endpoints will return 503 until you add it.');
}

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
const corsOptions = {
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new AppError('Not allowed by CORS', 403))),
  credentials: true,
};

const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });
app.set('io', io);
initSocket(io);

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(sanitizeInput);
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => sendSuccess(res, { status: 'ok', uptime: process.uptime() }, 'MovieMatch API is running'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/watchlist', require('./routes/watchlistRoutes'));
app.use('/api/swipes', require('./routes/swipeRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/friends', require('./routes/friendRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

app.use(notFound);
app.use(errorHandler);

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); process.exit(1); });

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => console.log(`MovieMatch API running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`));
});
