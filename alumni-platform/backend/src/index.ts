import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import mentorRoutes from './routes/mentors';
import discussionRoutes from './routes/discussions';
import jobRoutes from './routes/jobs';
import chatRoutes from './routes/chat';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notifications';

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigin = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.trim()
  : 'http://localhost:3000';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (health checks, mobile apps, etc.)
    if (!origin) return callback(null, true);
    if (origin.trim() === corsOrigin || corsOrigin === '*') {
      return callback(null, true);
    }
    return callback(null, true); // permissive on free tier — tighten after stable deploy
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Security middleware
app.use(helmet({
  // Allow Firebase Google Sign-in popup (window.closed) to work
  crossOriginOpenerPolicy: false,
}));
app.use(morgan('combined'));

// CORS must be before rate limiters so that 429 responses still include CORS headers
app.use(cors(corsOptions));

// Handle OPTIONS preflight explicitly for all routes
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: { error: 'Too many requests, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 100 : 20,
  message: { error: 'AI rate limit exceeded. Please wait before making more requests.' },
});

app.use('/api/ai', aiLimiter);
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Alumni-Student Platform API',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/discussion', discussionRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Alumni Platform API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
