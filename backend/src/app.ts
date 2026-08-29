import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import emailRoutes from './routes/email.routes';
import { getMetricsText, metricsRegistry } from './lib/metrics';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Metrics Endpoint
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

// Health Check Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ReachInbox Email Scheduler API is running',
  });
});

app.get('/api/db-health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.use('/api/emails', emailRoutes);

export default app;
