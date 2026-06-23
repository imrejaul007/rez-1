/**
 * Queue Service for Background Jobs
 *
 * Uses Bull queue with Redis for reliable background job processing
 *
 * Features:
 * - Async email sending
 * - SMS notifications
 * - Report generation
 * - Analytics calculations
 * - Audit log writes
 * - Cache warming
 * - Data exports
 * - Job retries with exponential backoff
 * - Job monitoring and health checks
 */

import Bull, { Queue, Job, JobOptions } from 'bull';
import { getRedisConfig } from '../config/redis';
import EmailService from './EmailService';
import SMSService from './SMSService';
import { logger } from '../config/logger';

interface EmailJobData {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
}

interface SMSJobData {
  to: string;
  message: string;
}

interface ReportJobData {
  merchantId: string;
  reportType: string;
  format: 'pdf' | 'csv' | 'xlsx';
  dateRange?: { start: Date; end: Date };
  email?: string;
}

interface AnalyticsJobData {
  merchantId: string;
  type: string;
  data: any;
}

interface AuditLogJobData {
  merchantId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  metadata?: any;
}

interface CacheWarmupJobData {
  keys: string[];
  priority?: 'high' | 'normal' | 'low';
}

interface PushNotificationJobData {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  priority?: 'high' | 'default';
}

interface CashbackJobData {
  orderId: string;
  triggeredBy: 'order_delivery' | 'admin_delivery';
  idempotencyKey: string;
}

export class QueueService {
  private static emailQueue: Queue<EmailJobData> | null = null;
  private static smsQueue: Queue<SMSJobData> | null = null;
  private static reportQueue: Queue<ReportJobData> | null = null;
  private static analyticsQueue: Queue<AnalyticsJobData> | null = null;
  private static auditLogQueue: Queue<AuditLogJobData> | null = null;
  private static cacheWarmupQueue: Queue<CacheWarmupJobData> | null = null;
  private static pushNotificationQueue: Queue<PushNotificationJobData> | null = null;
  private static cashbackQueue: Queue<CashbackJobData> | null = null;

  private static isInitialized = false;

  /**
   * Initialize all queues
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('⚠️ Queue service already initialized');
      return;
    }

    try {
      const redisConfig = getRedisConfig();

      if (!redisConfig.enabled) {
        logger.info('⚠️ Queue service disabled (Redis not available)');
        return;
      }

      // Use URL constructor for robust parsing (handles user:password@host:port)
      const parsedUrl = new URL(redisConfig.url);
      const redisOptions = {
        redis: {
          host: parsedUrl.hostname || 'localhost',
          port: parseInt(parsedUrl.port || '6379', 10),
          password: parsedUrl.password || redisConfig.password || undefined,
          maxRetriesPerRequest: redisConfig.maxRetries
        }
      };

      // Initialize queues
      this.emailQueue = new Bull('email', redisOptions);
      this.smsQueue = new Bull('sms', redisOptions);
      this.reportQueue = new Bull('report', redisOptions);
      this.analyticsQueue = new Bull('analytics', redisOptions);
      this.auditLogQueue = new Bull('auditLog', redisOptions);
      this.cacheWarmupQueue = new Bull('cacheWarmup', redisOptions);
      this.pushNotificationQueue = new Bull('pushNotification', redisOptions);
      this.cashbackQueue = new Bull('cashback', redisOptions);

      // Setup processors
      this.setupEmailProcessor();
      this.setupSMSProcessor();
      this.setupReportProcessor();
      this.setupAnalyticsProcessor();
      this.setupAuditLogProcessor();
      this.setupCacheWarmupProcessor();
      this.setupPushNotificationProcessor();
      this.setupCashbackProcessor();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('✅ Queue service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize queue service:', error);
      throw error;
    }
  }

  /**
   * Add email job to queue
   */
  static async sendEmail(data: EmailJobData, options?: JobOptions): Promise<Job<EmailJobData> | null> {
    if (!this.emailQueue) {
      logger.error('Email queue not initialized');
      return null;
    }

    return await this.emailQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options
    });
  }

  /**
   * Add SMS job to queue
   */
  static async sendSMS(data: SMSJobData, options?: JobOptions): Promise<Job<SMSJobData> | null> {
    if (!this.smsQueue) {
      logger.error('SMS queue not initialized');
      return null;
    }

    return await this.smsQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options
    });
  }

  /**
   * Add report generation job to queue
   */
  static async generateReport(data: ReportJobData, options?: JobOptions): Promise<Job<ReportJobData> | null> {
    if (!this.reportQueue) {
      logger.error('Report queue not initialized');
      return null;
    }

    return await this.reportQueue.add(data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      timeout: 300000, // 5 minutes
      removeOnComplete: false,
      removeOnFail: false,
      ...options
    });
  }

  /**
   * Add analytics calculation job to queue
   */
  static async calculateAnalytics(data: AnalyticsJobData, options?: JobOptions): Promise<Job<AnalyticsJobData> | null> {
    if (!this.analyticsQueue) {
      logger.error('Analytics queue not initialized');
      return null;
    }

    return await this.analyticsQueue.add(data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options
    });
  }

  /**
   * Add audit log job to queue
   */
  static async writeAuditLog(data: AuditLogJobData, options?: JobOptions): Promise<Job<AuditLogJobData> | null> {
    if (!this.auditLogQueue) {
      logger.error('Audit log queue not initialized');
      return null;
    }

    return await this.auditLogQueue.add(data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      ...options
    });
  }

  /**
   * Add cache warmup job to queue
   */
  static async warmupCache(data: CacheWarmupJobData, options?: JobOptions): Promise<Job<CacheWarmupJobData> | null> {
    if (!this.cacheWarmupQueue) {
      logger.error('Cache warmup queue not initialized');
      return null;
    }

    return await this.cacheWarmupQueue.add(data, {
      priority: data.priority === 'high' ? 1 : data.priority === 'low' ? 10 : 5,
      removeOnComplete: true,
      ...options
    });
  }

  /**
   * Add push notification job to queue.
   * Falls back to direct send if queue is unavailable.
   */
  static async sendPushNotification(
    data: PushNotificationJobData,
    options?: JobOptions
  ): Promise<Job<PushNotificationJobData> | null> {
    if (!this.pushNotificationQueue) {
      // Fallback: direct send if queue not initialized (Redis down)
      try {
        const pushNotificationService = (await import('./pushNotificationService')).default;
        await pushNotificationService.sendPushToUser(data.userId, {
          title: data.title,
          body: data.body,
          data: data.data,
          channelId: data.channelId,
          priority: data.priority,
        });
      } catch (err) {
        logger.error('Push notification fallback failed', { userId: data.userId, error: err });
      }
      return null;
    }

    return await this.pushNotificationQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options
    });
  }

  /**
   * Enqueue cashback processing for a delivered order.
   * Falls back to synchronous processing if queue is unavailable.
   */
  static async enqueueCashback(
    data: CashbackJobData,
    options?: JobOptions
  ): Promise<Job<CashbackJobData> | null> {
    if (!this.cashbackQueue) {
      // Fallback: direct synchronous processing if queue not initialized
      try {
        const cashbackService = (await import('./cashbackService')).default;
        const { Types } = await import('mongoose');
        await cashbackService.createCashbackFromOrder(new Types.ObjectId(data.orderId));
      } catch (err) {
        logger.error('Cashback fallback (sync) failed', { orderId: data.orderId, error: err });
      }
      return null;
    }

    return await this.cashbackQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: data.idempotencyKey,
      ...options,
    });
  }

  /**
   * Get queue health status
   */
  static async getHealthStatus(): Promise<any> {
    const queues = [
      { name: 'Email', queue: this.emailQueue },
      { name: 'SMS', queue: this.smsQueue },
      { name: 'Report', queue: this.reportQueue },
      { name: 'Analytics', queue: this.analyticsQueue },
      { name: 'AuditLog', queue: this.auditLogQueue },
      { name: 'CacheWarmup', queue: this.cacheWarmupQueue },
      { name: 'PushNotification', queue: this.pushNotificationQueue },
      { name: 'Cashback', queue: this.cashbackQueue }
    ];

    const health = await Promise.all(
      queues.map(async ({ name, queue }) => {
        if (!queue) {
          return { name, status: 'disabled' };
        }

        try {
          const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount()
          ]);

          return {
            name,
            status: 'healthy',
            waiting,
            active,
            completed,
            failed,
            delayed
          };
        } catch (error) {
          return {
            name,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return {
      timestamp: new Date().toISOString(),
      queues: health,
      overall: health.every(q => q.status === 'healthy' || q.status === 'disabled') ? 'healthy' : 'degraded'
    };
  }

  /**
   * Setup email processor
   */
  private static setupEmailProcessor(): void {
    this.emailQueue?.process(async (job: Job<EmailJobData>) => {
      logger.info(`Processing email job ${job.id}`);
      const { to, subject, body, html, from } = job.data;

      try {
        await EmailService.send({ to, subject, text: body, html, from });
        return { success: true, messageId: `msg_${Date.now()}` };
      } catch (error) {
        logger.error('Email sending failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Setup SMS processor
   */
  private static setupSMSProcessor(): void {
    this.smsQueue?.process(async (job: Job<SMSJobData>) => {
      logger.info(`Processing SMS job ${job.id}`);
      const { to, message } = job.data;

      try {
        await SMSService.send({ to, message });
        return { success: true, messageId: `sms_${Date.now()}` };
      } catch (error) {
        logger.error('SMS sending failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Setup report processor
   */
  private static setupReportProcessor(): void {
    this.reportQueue?.process(async (job: Job<ReportJobData>) => {
      logger.info(`Processing report job ${job.id}`, { reportType: job.data.reportType, merchantId: job.data.merchantId });
      const { merchantId, reportType, format, dateRange, email } = job.data;

      try {
        // Report generation — aggregates data from DB and sends via email
        const { Order } = await import('../models/Order');
        const dateFilter: any = {};
        if (dateRange?.start) dateFilter.$gte = new Date(dateRange.start);
        if (dateRange?.end) dateFilter.$lte = new Date(dateRange.end);

        const orders = await Order.find({
          'items.store': merchantId,
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        }).select('orderNumber totals status createdAt').lean();

        const reportData = {
          merchantId,
          reportType,
          generatedAt: new Date(),
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.totals?.grandTotal || 0), 0),
        };

        if (email) {
          await EmailService.send({
            to: email,
            subject: `Your ${reportType} Report`,
            text: `Report generated with ${reportData.totalOrders} orders, total revenue: ${reportData.totalRevenue}`,
          });
        }

        return { success: true, ...reportData };
      } catch (error) {
        logger.error('Report generation failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Setup analytics processor
   */
  private static setupAnalyticsProcessor(): void {
    this.analyticsQueue?.process(async (job: Job<AnalyticsJobData>) => {
      logger.info(`Processing analytics job ${job.id}`, { type: job.data.type, merchantId: job.data.merchantId });
      const { merchantId, type, data } = job.data;

      try {
        const { Order } = await import('../models/Order');
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [orderCount, revenue] = await Promise.all([
          Order.countDocuments({ 'items.store': merchantId, createdAt: { $gte: thirtyDaysAgo } }),
          Order.aggregate([
            { $match: { 'items.store': merchantId, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } },
          ]),
        ]);

        return {
          success: true,
          calculatedAt: new Date(),
          metrics: { orderCount, revenue: revenue[0]?.total || 0, type },
        };
      } catch (error) {
        logger.error('Analytics calculation failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Setup audit log processor
   */
  private static setupAuditLogProcessor(): void {
    this.auditLogQueue?.process(async (job: Job<AuditLogJobData>) => {
      const { merchantId, action, resourceType, resourceId, userId, metadata } = job.data;

      try {
        const { AdminAuditLog } = await import('../models/AdminAuditLog');
        await AdminAuditLog.create({
          adminId: userId || merchantId,
          action,
          targetType: resourceType,
          targetId: resourceId,
          metadata,
          createdAt: new Date(),
        });
        return { success: true, loggedAt: new Date() };
      } catch (error) {
        logger.error('Audit log write failed', { error, action, resourceType });
        throw error;
      }
    });
  }

  /**
   * Setup cache warmup processor
   */
  private static setupCacheWarmupProcessor(): void {
    this.cacheWarmupQueue?.process(async (job: Job<CacheWarmupJobData>) => {
      logger.info(`🔥 Processing cache warmup job ${job.id}`);
      const { keys } = job.data;

      try {
        // TODO: Implement cache warmup logic
        logger.info(`Warming up ${keys.length} cache keys`);

        // Simulate cache warmup
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { success: true, warmedKeys: keys.length };
      } catch (error) {
        logger.error('Cache warmup failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup push notification processor
   */
  private static setupPushNotificationProcessor(): void {
    this.pushNotificationQueue?.process(async (job: Job<PushNotificationJobData>) => {
      const { notificationId, userId, title, body, data, channelId, priority } = job.data;

      try {
        const pushNotificationService = (await import('./pushNotificationService')).default;
        await pushNotificationService.sendPushToUser(userId, {
          title,
          body,
          data,
          channelId,
          priority,
        });

        // Mark notification push as delivered
        const { Notification } = await import('../models/Notification');
        await Notification.findByIdAndUpdate(notificationId, {
          $set: { 'deliveryStatus.push.delivered': true, 'deliveryStatus.push.deliveredAt': new Date() }
        });

        return { success: true, userId, notificationId };
      } catch (error) {
        logger.error('Push notification delivery failed', { error, jobId: job.id, userId, notificationId });
        throw error;
      }
    });
  }

  /**
   * Setup cashback processor
   */
  private static setupCashbackProcessor(): void {
    this.cashbackQueue?.process(async (job: Job<CashbackJobData>) => {
      const { orderId, triggeredBy } = job.data;
      logger.info(`Processing cashback job ${job.id}`, { orderId, triggeredBy });

      try {
        const cashbackService = (await import('./cashbackService')).default;
        const { Types } = await import('mongoose');
        const result = await cashbackService.createCashbackFromOrder(new Types.ObjectId(orderId));

        return {
          success: true,
          orderId,
          cashbackId: result?._id?.toString() || null,
          amount: result?.amount || 0,
        };
      } catch (error) {
        logger.error('Cashback processing failed', { error, jobId: job.id, orderId });
        throw error; // Let Bull retry
      }
    });
  }

  /**
   * Setup event listeners for all queues
   */
  private static setupEventListeners(): void {
    const queues = [
      this.emailQueue,
      this.smsQueue,
      this.reportQueue,
      this.analyticsQueue,
      this.auditLogQueue,
      this.cacheWarmupQueue,
      this.pushNotificationQueue,
      this.cashbackQueue
    ];

    queues.forEach(queue => {
      if (!queue) return;

      queue.on('completed', (job, result) => {
        logger.info(`✅ Job ${job.id} completed in queue ${queue.name}`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`❌ Job ${job?.id} failed in queue ${queue.name}:`, err.message);
      });

      queue.on('stalled', (job) => {
        logger.warn(`⚠️ Job ${job.id} stalled in queue ${queue.name}`);
      });
    });
  }

  /**
   * Shutdown queue service
   */
  static async shutdown(): Promise<void> {
    const queues = [
      this.emailQueue,
      this.smsQueue,
      this.reportQueue,
      this.analyticsQueue,
      this.auditLogQueue,
      this.cacheWarmupQueue,
      this.pushNotificationQueue,
      this.cashbackQueue
    ];

    await Promise.all(
      queues.map(async queue => {
        if (queue) {
          await queue.close();
        }
      })
    );

    this.isInitialized = false;
    logger.info('📦 Queue service shut down');
  }
}
