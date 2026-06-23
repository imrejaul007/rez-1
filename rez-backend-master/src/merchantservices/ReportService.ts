import { ExportService } from './ExportService';
import { BusinessMetricsService } from './BusinessMetrics';
import { logger } from '../config/logger';

export interface ReportSchedule {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'csv' | 'json' | 'excel';
  sections: string[];
  recipients: string[]; // Email addresses
  isActive: boolean;
  lastGenerated?: Date;
  nextScheduled: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportHistory {
  id: string;
  scheduleId: string;
  merchantId: string;
  reportType: string;
  format: string;
  generatedAt: Date;
  fileSize: number;
  downloadUrl?: string;
  emailSent: boolean;
  recipients: string[];
  status: 'generated' | 'sent' | 'failed';
  errorMessage?: string;
}

export class ReportService {
  private static schedules: Map<string, ReportSchedule> = new Map();
  private static history: Map<string, ReportHistory> = new Map();
  private static scheduleCounter = 1;
  private static historyCounter = 1;
  private static reportInterval: NodeJS.Timeout | null = null;

  // Initialize the automated reporting system
  static initialize() {
    // Check for scheduled reports every hour
    this.reportInterval = setInterval(() => {
      this.processScheduledReports();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('📊 Automated reporting service initialized');
  }

  // Create a new report schedule
  static createSchedule(scheduleData: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled'>): ReportSchedule {
    const id = `schedule_${this.scheduleCounter++}`;
    const now = new Date();
    
    const schedule: ReportSchedule = {
      id,
      ...scheduleData,
      nextScheduled: this.calculateNextScheduledDate(scheduleData.frequency),
      createdAt: now,
      updatedAt: now
    };

    this.schedules.set(id, schedule);
    logger.info(`📅 Created report schedule: ${schedule.name} for merchant ${schedule.merchantId}`);
    
    return schedule;
  }

  // Update an existing schedule
  static updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): ReportSchedule | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const updatedSchedule: ReportSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date()
    };

    // Recalculate next scheduled date if frequency changed
    if (updates.frequency) {
      updatedSchedule.nextScheduled = this.calculateNextScheduledDate(updates.frequency);
    }

    this.schedules.set(scheduleId, updatedSchedule);
    return updatedSchedule;
  }

  // Delete a schedule
  static deleteSchedule(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId);
  }

  // Get schedules for a merchant
  static getSchedulesByMerchant(merchantId: string): ReportSchedule[] {
    return Array.from(this.schedules.values())
      .filter(schedule => schedule.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get a specific schedule
  static getSchedule(scheduleId: string): ReportSchedule | null {
    return this.schedules.get(scheduleId) || null;
  }

  // Calculate next scheduled date based on frequency
  private static calculateNextScheduledDate(frequency: ReportSchedule['frequency']): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'daily':
        next.setDate(now.getDate() + 1);
        next.setHours(9, 0, 0, 0); // 9 AM
        break;
      case 'weekly':
        next.setDate(now.getDate() + (7 - now.getDay() + 1) % 7 || 7); // Next Monday
        next.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(now.getMonth() + 1, 1); // First day of next month
        next.setHours(9, 0, 0, 0);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarter = (currentQuarter + 1) % 4;
        const nextYear = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
        next.setFullYear(nextYear, nextQuarter * 3, 1);
        next.setHours(9, 0, 0, 0);
        break;
    }

    return next;
  }

  // Process all scheduled reports that are due
  private static async processScheduledReports() {
    const now = new Date();
    const dueSchedules = Array.from(this.schedules.values())
      .filter(schedule => schedule.isActive && schedule.nextScheduled <= now);

    logger.info(`📊 Processing ${dueSchedules.length} scheduled reports`);

    for (const schedule of dueSchedules) {
      try {
        await this.generateScheduledReport(schedule);
        
        // Update next scheduled date
        schedule.nextScheduled = this.calculateNextScheduledDate(schedule.frequency);
        schedule.lastGenerated = now;
        schedule.updatedAt = now;
        this.schedules.set(schedule.id, schedule);

      } catch (error) {
        logger.error(`❌ Failed to generate scheduled report ${schedule.id}:`, error);
        
        // Log the failure in history
        this.addToHistory({
          scheduleId: schedule.id,
          merchantId: schedule.merchantId,
          reportType: schedule.frequency,
          format: schedule.format,
          generatedAt: now,
          fileSize: 0,
          emailSent: false,
          recipients: schedule.recipients,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // Generate a report for a specific schedule
  private static async generateScheduledReport(schedule: ReportSchedule) {
    logger.info(`📊 Generating ${schedule.frequency} report for merchant ${schedule.merchantId}`);

    // Determine date range based on frequency
    const dateRange = this.getDateRangeForFrequency(schedule.frequency);

    // Generate the report
    const exportResult = await ExportService.exportDashboardData(schedule.merchantId, {
      format: schedule.format as any,
      sections: schedule.sections,
      dateRange
    });

    // Log to history
    const historyEntry = this.addToHistory({
      scheduleId: schedule.id,
      merchantId: schedule.merchantId,
      reportType: schedule.frequency,
      format: schedule.format,
      generatedAt: new Date(),
      fileSize: exportResult.data.length,
      emailSent: false,
      recipients: schedule.recipients,
      status: 'generated'
    });

    // In a real application, you would:
    // 1. Save the file to storage (S3, local filesystem, etc.)
    // 2. Send email with attachment to recipients
    // 3. Update history with email status
    
    logger.info(`✅ Generated report ${historyEntry.id} for schedule ${schedule.id}`);
    
    // Simulate email sending
    await this.simulateEmailSending(historyEntry, exportResult);

    return historyEntry;
  }

  // Get date range for a frequency
  private static getDateRangeForFrequency(frequency: ReportSchedule['frequency']): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();

    switch (frequency) {
      case 'daily':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'quarterly':
        start.setMonth(now.getMonth() - 3, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end: now };
  }

  // Simulate email sending (in real app, use nodemailer or similar)
  private static async simulateEmailSending(historyEntry: ReportHistory, exportResult: any) {
    try {
      // Simulate email delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update history as sent
      historyEntry.status = 'sent';
      historyEntry.emailSent = true;
      this.history.set(historyEntry.id, historyEntry);

      logger.info(`📧 Simulated email sent for report ${historyEntry.id} to ${historyEntry.recipients.join(', ')}`);
    } catch (error) {
      historyEntry.status = 'failed';
      historyEntry.errorMessage = 'Failed to send email';
      this.history.set(historyEntry.id, historyEntry);
      
      logger.error(`❌ Failed to send email for report ${historyEntry.id}:`, error);
    }
  }

  // Add entry to report history
  private static addToHistory(historyData: Omit<ReportHistory, 'id'>): ReportHistory {
    const id = `history_${this.historyCounter++}`;
    const historyEntry: ReportHistory = {
      id,
      ...historyData
    };

    this.history.set(id, historyEntry);
    return historyEntry;
  }

  // Get report history for a merchant
  static getHistoryByMerchant(merchantId: string, limit: number = 50): ReportHistory[] {
    return Array.from(this.history.values())
      .filter(entry => entry.merchantId === merchantId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  // Get report history for a schedule
  static getHistoryBySchedule(scheduleId: string, limit: number = 20): ReportHistory[] {
    return Array.from(this.history.values())
      .filter(entry => entry.scheduleId === scheduleId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  // Generate an ad-hoc report
  static async generateAdHocReport(
    merchantId: string,
    reportConfig: {
      name: string;
      format: 'csv' | 'json' | 'excel';
      sections: string[];
      dateRange?: { start: Date; end: Date };
      recipients?: string[];
    }
  ): Promise<ReportHistory> {
    logger.info(`📊 Generating ad-hoc report "${reportConfig.name}" for merchant ${merchantId}`);

    try {
      const exportResult = await ExportService.exportDashboardData(merchantId, {
        format: reportConfig.format as any,
        sections: reportConfig.sections,
        dateRange: reportConfig.dateRange
      });

      const historyEntry = this.addToHistory({
        scheduleId: 'ad-hoc',
        merchantId,
        reportType: 'ad-hoc',
        format: reportConfig.format,
        generatedAt: new Date(),
        fileSize: exportResult.data.length,
        emailSent: false,
        recipients: reportConfig.recipients || [],
        status: 'generated'
      });

      // Send email if recipients provided
      if (reportConfig.recipients && reportConfig.recipients.length > 0) {
        await this.simulateEmailSending(historyEntry, exportResult);
      }

      logger.info(`✅ Generated ad-hoc report ${historyEntry.id}`);
      return historyEntry;

    } catch (error) {
      const historyEntry = this.addToHistory({
        scheduleId: 'ad-hoc',
        merchantId,
        reportType: 'ad-hoc',
        format: reportConfig.format,
        generatedAt: new Date(),
        fileSize: 0,
        emailSent: false,
        recipients: reportConfig.recipients || [],
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`❌ Failed to generate ad-hoc report:`, error);
      throw error;
    }
  }

  // Get report statistics
  static getReportStatistics(merchantId: string): {
    totalSchedules: number;
    activeSchedules: number;
    totalReportsGenerated: number;
    reportsThisMonth: number;
    successRate: number;
    lastReportGenerated?: Date;
  } {
    const schedules = this.getSchedulesByMerchant(merchantId);
    const history = this.getHistoryByMerchant(merchantId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const reportsThisMonth = history.filter(entry => entry.generatedAt >= startOfMonth).length;
    const successfulReports = history.filter(entry => entry.status === 'sent' || entry.status === 'generated').length;
    const successRate = history.length > 0 ? (successfulReports / history.length) * 100 : 0;

    return {
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.isActive).length,
      totalReportsGenerated: history.length,
      reportsThisMonth,
      successRate,
      lastReportGenerated: history.length > 0 ? history[0].generatedAt : undefined
    };
  }

  // Create sample schedules for testing
  static createSampleSchedules(merchantId: string) {
    const sampleSchedules = [
      {
        merchantId,
        name: 'Daily Sales Report',
        description: 'Daily summary of sales and orders',
        frequency: 'daily' as const,
        format: 'csv' as const,
        sections: ['dashboard', 'orders'],
        recipients: ['manager@example.com', 'owner@example.com'],
        isActive: true
      },
      {
        merchantId,
        name: 'Weekly Performance Report',
        description: 'Weekly business performance and analytics',
        frequency: 'weekly' as const,
        format: 'excel' as const,
        sections: ['dashboard', 'orders', 'products', 'analytics'],
        recipients: ['owner@example.com'],
        isActive: true
      },
      {
        merchantId,
        name: 'Monthly Cashback Report',
        description: 'Monthly cashback requests and approvals',
        frequency: 'monthly' as const,
        format: 'csv' as const,
        sections: ['cashback', 'analytics'],
        recipients: ['finance@example.com', 'owner@example.com'],
        isActive: true
      }
    ];

    sampleSchedules.forEach(scheduleData => {
      this.createSchedule(scheduleData);
    });

    logger.info(`📅 Created ${sampleSchedules.length} sample report schedules for merchant ${merchantId}`);
  }

  // Cleanup method
  static cleanup() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    logger.info('📊 Automated reporting service stopped');
  }

  // Manual trigger for testing
  static async triggerScheduledReport(scheduleId: string): Promise<ReportHistory> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return await this.generateScheduledReport(schedule);
  }

  // Get upcoming scheduled reports
  static getUpcomingReports(merchantId: string, days: number = 7): Array<{
    schedule: ReportSchedule;
    daysUntilDue: number;
  }> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return Array.from(this.schedules.values())
      .filter(schedule => 
        schedule.merchantId === merchantId && 
        schedule.isActive &&
        schedule.nextScheduled >= now &&
        schedule.nextScheduled <= futureDate
      )
      .map(schedule => ({
        schedule,
        daysUntilDue: Math.ceil((schedule.nextScheduled.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      }))
      .sort((a, b) => a.schedule.nextScheduled.getTime() - b.schedule.nextScheduled.getTime());
  }
}