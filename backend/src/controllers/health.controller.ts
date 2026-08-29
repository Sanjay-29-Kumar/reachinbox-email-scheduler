import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { redisClient } from '../lib/rateLimiter';
import { checkElasticsearchHealth } from '../lib/elasticsearch';

export async function getHealthHandler(req: Request, res: Response) {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';
  let esStatus = 'disconnected';

  // 1. PostgreSQL Health Check
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    console.warn('[Health Check Warning] Database health check failed:', error instanceof Error ? error.message : error);
    dbStatus = 'disconnected';
  }

  // 2. Redis Health Check
  try {
    const pingResult = await redisClient.ping();
    if (pingResult === 'PONG') {
      redisStatus = 'connected';
    }
  } catch (error) {
    console.warn('[Health Check Warning] Redis health check failed:', error instanceof Error ? error.message : error);
    redisStatus = 'disconnected';
  }

  // 3. Elasticsearch Health Check
  try {
    const esHealthy = await checkElasticsearchHealth();
    if (esHealthy) {
      esStatus = 'connected';
    }
  } catch (error) {
    console.warn('[Health Check Warning] Elasticsearch health check failed:', error instanceof Error ? error.message : error);
    esStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected' && redisStatus === 'connected' && esStatus === 'connected';

  const responsePayload = {
    status: isHealthy ? 'ok' : 'unhealthy',
    database: dbStatus,
    redis: redisStatus,
    elasticsearch: esStatus,
  };

  return res.status(isHealthy ? 200 : 503).json(responsePayload);
}
