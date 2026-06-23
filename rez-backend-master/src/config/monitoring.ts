// @ts-nocheck
/**
 * Comprehensive Monitoring Configuration
 * Phase 5 Week 5-6: Resilience & Reliability
 *
 * Grafana dashboards, Prometheus metrics, and alerting rules
 */

import { logger } from './logger';

// ─────────────────────────────────────────────────────────────────────────
// GRAFANA DASHBOARD DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────

export const grafanaDashboards = {
  /**
   * System Health Dashboard
   */
  systemHealth: {
    title: 'REZ System Health',
    panels: [
      {
        title: 'Service Status',
        targets: ['up{job="rez-backend"}', 'up{job="rez-merchant-service"}', 'up{job="rez-auth-service"}'],
        type: 'stat',
      },
      {
        title: 'Memory Usage',
        targets: ['process_resident_memory_bytes{job="rez-backend"}'],
        type: 'graph',
        unit: 'decbytes',
      },
      {
        title: 'CPU Usage',
        targets: ['rate(process_cpu_seconds_total{job="rez-backend"}[5m]) * 100'],
        type: 'graph',
        unit: 'percent',
      },
      {
        title: 'Event Loop Lag',
        targets: ['nodejs_eventloop_lag_seconds{job="rez-backend"}'],
        type: 'graph',
        unit: 'ms',
      },
    ],
  },

  /**
   * API Performance Dashboard
   */
  apiPerformance: {
    title: 'API Performance',
    panels: [
      {
        title: 'Request Rate',
        targets: ['rate(http_requests_total[5m])'],
        type: 'graph',
        unit: 'reqps',
      },
      {
        title: 'P99 Latency',
        targets: ['histogram_quantile(0.99, http_request_duration_seconds)'],
        type: 'graph',
        unit: 'ms',
      },
      {
        title: 'Error Rate',
        targets: ['rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100'],
        type: 'stat',
        unit: 'percent',
      },
      {
        title: 'Cache Hit Rate',
        targets: ['rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100'],
        type: 'gauge',
        unit: 'percent',
      },
    ],
  },

  /**
   * Database Performance Dashboard
   */
  databasePerformance: {
    title: 'Database Performance',
    panels: [
      {
        title: 'Query Latency (P99)',
        targets: ['histogram_quantile(0.99, mongodb_query_duration_seconds)'],
        type: 'graph',
        unit: 'ms',
      },
      {
        title: 'Connection Pool Usage',
        targets: ['mongodb_connections_current / mongodb_connections_max'],
        type: 'gauge',
        unit: 'percent',
      },
      {
        title: 'Slow Queries',
        targets: ['rate(mongodb_slow_queries_total[5m])'],
        type: 'stat',
        unit: 'short',
      },
      {
        title: 'Index Usage',
        targets: ['mongodb_index_accesses_total'],
        type: 'table',
      },
    ],
  },

  /**
   * Job Queue Dashboard
   */
  jobQueue: {
    title: 'Job Queue Status',
    panels: [
      {
        title: 'Queue Depth',
        targets: ['job_queue_depth{queue="email"}', 'job_queue_depth{queue="sms"}', 'job_queue_depth{queue="push"}'],
        type: 'graph',
      },
      {
        title: 'Job Processing Rate',
        targets: ['rate(job_processed_total[5m])'],
        type: 'graph',
        unit: 'jobps',
      },
      {
        title: 'Job Failure Rate',
        targets: ['rate(job_failed_total[5m]) / rate(job_processed_total[5m]) * 100'],
        type: 'stat',
        unit: 'percent',
      },
      {
        title: 'Average Job Duration',
        targets: ['job_processing_duration_seconds'],
        type: 'graph',
        unit: 'ms',
      },
    ],
  },

  /**
   * Business Metrics Dashboard
   */
  businessMetrics: {
    title: 'Business Metrics',
    panels: [
      {
        title: 'Orders Per Minute',
        targets: ['rate(orders_created_total[1m])'],
        type: 'graph',
      },
      {
        title: 'Revenue (1h)',
        targets: ['increase(revenue_total[1h])'],
        type: 'stat',
        unit: 'short',
      },
      {
        title: 'Transaction Success Rate',
        targets: ['rate(transactions_successful_total[5m]) / rate(transactions_total[5m]) * 100'],
        type: 'gauge',
        unit: 'percent',
      },
      {
        title: 'Active Users',
        targets: ['users_active_now'],
        type: 'stat',
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// ALERTING RULES
// ─────────────────────────────────────────────────────────────────────────

export const alertingRules = [
  // Critical alerts (page oncall)
  {
    name: 'ServiceDown',
    condition: 'up{job="rez-backend"} == 0',
    duration: '1m',
    severity: 'critical',
    action: 'page_oncall',
  },
  {
    name: 'HighErrorRate',
    condition: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05',
    duration: '5m',
    severity: 'critical',
    action: 'page_oncall',
  },
  {
    name: 'DatabaseConnectionPoolExhausted',
    condition: 'mongodb_connections_current / mongodb_connections_max > 0.9',
    duration: '2m',
    severity: 'critical',
    action: 'page_oncall',
  },

  // High alerts (notify team)
  {
    name: 'P99LatencyHigh',
    condition: 'histogram_quantile(0.99, http_request_duration_seconds) > 1',
    duration: '10m',
    severity: 'high',
    action: 'notify_team',
  },
  {
    name: 'JobQueueBacklogHigh',
    condition: 'job_queue_depth > 5000',
    duration: '15m',
    severity: 'high',
    action: 'notify_team',
  },
  {
    name: 'MemoryUsageHigh',
    condition: 'process_resident_memory_bytes > 1.5e9', // 1.5 GB
    duration: '10m',
    severity: 'high',
    action: 'notify_team',
  },

  // Warning alerts (log)
  {
    name: 'SlowQueryDetected',
    condition: 'mongodb_query_duration_seconds > 1',
    duration: '5m',
    severity: 'warning',
    action: 'log_alert',
  },
  {
    name: 'CacheHitRateLow',
    condition: 'rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.5',
    duration: '20m',
    severity: 'warning',
    action: 'log_alert',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SLO DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────

export const slos = [
  {
    name: 'API Availability',
    target: 99.9, // 99.9%
    window: '30d',
    metric: 'rate(http_requests_total{status!~"5.."}[5m]) / rate(http_requests_total[5m])',
  },
  {
    name: 'API Latency P99',
    target: 200, // 200ms
    window: '30d',
    metric: 'histogram_quantile(0.99, http_request_duration_seconds)',
  },
  {
    name: 'Job Processing Success',
    target: 99.5, // 99.5%
    window: '30d',
    metric: 'rate(job_processed_total[5m]) / (rate(job_processed_total[5m]) + rate(job_failed_total[5m]))',
  },
  {
    name: 'Database Availability',
    target: 99.95, // 99.95%
    window: '30d',
    metric: 'mongodb_up',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// MONITORING INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────

export function initializeMonitoring(): void {
  logger.info('[MONITORING] Initializing monitoring configuration', {
    dashboardCount: Object.keys(grafanaDashboards).length,
    alertRuleCount: alertingRules.length,
    sloCount: slos.length,
  });

  // TODO: Implement actual Prometheus/Grafana provisioning
  // This would:
  // 1. Create Grafana dashboards via API
  // 2. Register Prometheus alerting rules
  // 3. Configure Grafana notification channels
  // 4. Set up SLO recording rules

  logger.info('[MONITORING] Monitoring configuration loaded', {
    dashboards: Object.keys(grafanaDashboards).join(', '),
    slos: slos.map((s) => s.name).join(', '),
  });
}

export default {
  grafanaDashboards,
  alertingRules,
  slos,
  initializeMonitoring,
};
