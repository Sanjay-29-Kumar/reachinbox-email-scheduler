import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './lib/prisma';
import { redisClient } from './lib/rateLimiter';
import { validateEnvironment } from './lib/envValidation';

// 1. Validate Environment
validateEnvironment();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// 2. Graceful Shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] Closed HTTP server connections.');

    try {
      await prisma.$disconnect();
      console.log('[Server] Disconnected PostgreSQL Prisma client.');
    } catch (dbErr) {
      console.error('[Server Error] Error disconnecting Prisma:', dbErr);
    }

    try {
      await redisClient.quit();
      console.log('[Server] Disconnected Redis client.');
    } catch (redisErr) {
      console.error('[Server Error] Error disconnecting Redis:', redisErr);
    }

    console.log('[Server] Graceful shutdown completed.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
