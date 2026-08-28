import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import prisma from './lib/prisma';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ReachInbox Email Scheduler API is running'
  });
});

app.get('/api/db-health', async (req: Request, res: Response) => {
  try {
    // Test PostgreSQL database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default app;
