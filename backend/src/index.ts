import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initDB } from './db/schema';
import { startScheduler } from './services/scheduler';
import authRoutes from './routes/authRoutes';
import credentialRoutes from './routes/credentialRoutes';
import breachRoutes from './routes/breachRoutes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts — try again later' },
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/breach', breachRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize
initDB();
startScheduler();

app.listen(config.port, () => {
  console.log(`[SecureVault] Server running on port ${config.port}`);
  console.log(`[SecureVault] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
