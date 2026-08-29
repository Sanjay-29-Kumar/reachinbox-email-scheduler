import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import emailRoutes from './routes/email.routes';
import authRoutes from './routes/auth.routes';
import { getMetricsText, metricsRegistry } from './lib/metrics';
import { getHealthHandler } from './controllers/health.controller';

const app: Application = express();

// CORS Configuration
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: allowedOrigin === '*' ? true : [allowedOrigin, 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
    credentials: true,
  })
);

app.use(express.json());

// Health Check Endpoints
app.get('/health', getHealthHandler);
app.get('/api/health', getHealthHandler);

// Prometheus Metrics Endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metricsText = await getMetricsText();
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.status(200).send(metricsText);
  } catch (error) {
    console.error('Error generating Prometheus metrics:', error);
    res.status(500).send('# Failed to generate metrics\n');
  }
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Email API Routes
app.use('/api/emails', emailRoutes);

// 404 Handler for Unknown Routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { error: err.stack } : {}),
  });
});

export default app;
