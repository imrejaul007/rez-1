import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

const router = Router();

// Basic health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check
router.get('/health/detailed', async (req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      redis: 'unknown'
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.env.APP_VERSION || '1.0.0'
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'healthy';
      health.database = {
        state: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name
      };
    } else {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
      health.database = {
        state: getMongooseState(mongoose.connection.readyState)
      };
    }
  } catch (error: any) {
    health.services.database = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Database health check failed', { error: error.message });
  }

  // Check Redis (if configured)
  try {
    // Import Redis client if available
    // const { redisClient } = require('../config/redis');
    // await redisClient.ping();
    // health.services.redis = 'healthy';
    health.services.redis = 'not_configured';
  } catch (error: any) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
    logger.error('Redis health check failed', { error: error.message });
  }

  res.json(health);
});

// Readiness check (Kubernetes readiness probe)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if app is ready to serve traffic
    const dbReady = mongoose.connection.readyState === 1;

    // Add other readiness checks here
    // const redisReady = redisClient.status === 'ready';

    if (dbReady) {
      res.status(200).json({
        ready: true,
        checks: {
          database: dbReady
        }
      });
    } else {
      res.status(503).json({
        ready: false,
        checks: {
          database: dbReady
        }
      });
    }
  } catch (error: any) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      ready: false,
      error: error.message
    });
  }
});

// Liveness check (Kubernetes liveness probe)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

// Startup check (Kubernetes startup probe)
router.get('/startup', async (req: Request, res: Response) => {
  try {
    // Check if application has started successfully
    const dbStarted = mongoose.connection.readyState === 1;

    if (dbStarted) {
      res.status(200).json({
        started: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        started: false,
        message: 'Application still starting'
      });
    }
  } catch (error: any) {
    res.status(503).json({
      started: false,
      error: error.message
    });
  }
});

// Helper to get readable MongoDB connection state
function getMongooseState(state: number): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

export default router;
