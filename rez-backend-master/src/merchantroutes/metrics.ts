import { Router, Request, Response } from 'express';
import { metricsEndpoint } from '../config/prometheus';
import { metrics } from '../services/MetricsService';
import { logger } from '../config/logger';

const router = Router();

// Prometheus metrics endpoint
router.get('/metrics', metricsEndpoint);

// Custom application metrics
router.get('/metrics/app', (req: Request, res: Response) => {
  try {
    const appMetrics = metrics.getMetrics();
    res.json({
      success: true,
      metrics: appMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to retrieve metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    });
  }
});

// Metrics summary
router.get('/metrics/summary', (req: Request, res: Response) => {
  try {
    const summaries = {
      requests: metrics.getSummary('http_request_duration'),
      errors: metrics.getSummary('errors'),
      dbQueries: metrics.getSummary('db_query_duration'),
      cacheHits: metrics.getSummary('cache_hits'),
      cacheMisses: metrics.getSummary('cache_misses')
    };

    res.json({
      success: true,
      summaries,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to retrieve metric summaries', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metric summaries'
    });
  }
});

// Reset metrics (admin only)
router.post('/metrics/reset', (req: Request, res: Response) => {
  try {
    metrics.reset();
    logger.info('Metrics reset by admin');
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error: any) {
    logger.error('Failed to reset metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
});

export default router;
