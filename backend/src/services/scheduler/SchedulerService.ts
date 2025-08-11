import * as cron from 'node-cron';
import { DataProcessingPipeline, PipelineConfig } from '../pipeline/DataProcessingPipeline';
import { SchedulerConfig, ScheduleConfig, loadSchedulerConfig } from './SchedulerConfig';
import { NotificationService } from './NotificationService';
import { HealthCheckService } from './HealthCheckService';
import { SupportedSite } from '../scraper';

export interface ScheduledJob {
  name: string;
  task: cron.ScheduledTask;
  config: ScheduleConfig;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'idle' | 'error' | 'disabled';
  runCount: number;
  errorCount: number;
}

export interface SchedulerStatus {
  isRunning: boolean;
  jobs: Record<string, ScheduledJob>;
  totalJobs: number;
  activeJobs: number;
  lastHealthCheck?: Date;
  maintenanceMode: boolean;
}

/**
 * Main scheduler service that manages automated scraping operations
 */
export class SchedulerService {
  private config: SchedulerConfig;
  private jobs: Map<string, ScheduledJob> = new Map();
  private notificationService: NotificationService;
  private healthCheckService: HealthCheckService;
  private pipelineConfig: PipelineConfig;
  private isRunning: boolean = false;
  private maintenanceMode: boolean = false;

  constructor(pipelineConfig: PipelineConfig, schedulerConfig?: SchedulerConfig) {
    this.config = schedulerConfig || loadSchedulerConfig();
    this.pipelineConfig = pipelineConfig;
    this.notificationService = new NotificationService(this.config.notifications);
    this.healthCheckService = new HealthCheckService(this.config.healthCheck);
  }

  /**
   * Start the scheduler service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting scheduler service...');
    
    // Create and start scheduled jobs
    for (const [scheduleName, scheduleConfig] of Object.entries(this.config.schedules)) {
      if (scheduleConfig.enabled) {
        await this.createScheduledJob(scheduleName, scheduleConfig);
      }
    }

    this.isRunning = true;
    console.log(`Scheduler started with ${this.jobs.size} active jobs`);
  }

  /**
   * Stop the scheduler service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping scheduler service...');

    // Stop all scheduled jobs
    for (const [jobName, job] of this.jobs) {
      job.task.stop();
      job.status = 'disabled';
      console.log(`Stopped scheduled job: ${jobName}`);
    }

    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  /**
   * Create a scheduled job
   */
  private async createScheduledJob(scheduleName: string, scheduleConfig: ScheduleConfig): Promise<void> {
    try {
      const task = cron.schedule(
        scheduleConfig.cronExpression,
        async () => {
          await this.executeScheduledScraping(scheduleName, scheduleConfig);
        },
        {
          scheduled: false,
          timezone: scheduleConfig.timezone || 'UTC',
        }
      );

      const job: ScheduledJob = {
        name: scheduleName,
        task,
        config: scheduleConfig,
        status: 'idle',
        runCount: 0,
        errorCount: 0,
      };

      // Calculate next run time
      this.updateJobNextRunTime(job);

      this.jobs.set(scheduleName, job);
      task.start();

      console.log(`Created scheduled job: ${scheduleName} (${scheduleConfig.cronExpression})`);
    } catch (error) {
      console.error(`Failed to create scheduled job ${scheduleName}:`, error);
      throw error;
    }
  }

  /**
   * Execute scheduled scraping operation
   */
  private async executeScheduledScraping(scheduleName: string, scheduleConfig: ScheduleConfig): Promise<void> {
    const job = this.jobs.get(scheduleName);
    if (!job) {
      console.error(`Job not found: ${scheduleName}`);
      return;
    }

    // Check if already running
    if (job.status === 'running') {
      console.log(`Skipping ${scheduleName} - already running`);
      return;
    }

    // Check maintenance mode
    if (this.isInMaintenanceWindow()) {
      console.log(`Skipping ${scheduleName} - maintenance mode`);
      if (scheduleConfig.notificationsEnabled) {
        await this.notificationService.notifyMaintenanceMode(scheduleName);
      }
      return;
    }

    job.status = 'running';
    job.lastRun = new Date();
    job.runCount++;
    this.updateJobNextRunTime(job);

    console.log(`Starting scheduled scraping: ${scheduleName}`);

    try {
      // Perform health check if enabled
      if (scheduleConfig.healthCheckEnabled && this.config.healthCheck.enabled) {
        console.log(`Performing health check for ${scheduleName}`);
        const healthCheck = await this.healthCheckService.isSystemReady();
        
        if (!healthCheck.ready) {
          throw new Error(`Health check failed: ${healthCheck.reason}`);
        }
        
        console.log(`Health check passed for ${scheduleName}`);
      }

      // Create pipeline for this specific schedule
      const pipeline = new DataProcessingPipeline(this.pipelineConfig);
      await pipeline.initialize();

      // Execute scraping for configured sites
      let result;
      if (scheduleConfig.sites.length === 1 && scheduleConfig.sites[0]) {
        // Process single site
        const siteResult = await pipeline.processSite(scheduleConfig.sites[0]);
        result = {
          success: siteResult.errors.length === 0,
          totalProcessed: siteResult.scraped,
          newProperties: siteResult.stored, // Simplified
          updatedProperties: 0,
          translatedProperties: siteResult.translated,
          errors: siteResult.errors,
          processingTime: siteResult.processingTime,
          siteResults: new Map([[scheduleConfig.sites[0], siteResult]]),
        };
      } else {
        // Process all configured sites
        result = await pipeline.processAllSites();
      }

      await pipeline.cleanup();

      job.status = 'idle';
      
      console.log(`Completed scheduled scraping: ${scheduleName}`, {
        totalProcessed: result.totalProcessed,
        errors: result.errors.length,
        processingTime: result.processingTime,
      });

      // Send success notification
      if (scheduleConfig.notificationsEnabled) {
        await this.notificationService.notifyScrapingComplete(scheduleName, result);
      }

    } catch (error) {
      job.status = 'error';
      job.errorCount++;
      
      console.error(`Scheduled scraping failed: ${scheduleName}`, error);

      // Send error notification
      if (scheduleConfig.notificationsEnabled) {
        await this.notificationService.notifyScrapingError(scheduleName, error as Error);
      }
    }
  }

  /**
   * Check if currently in maintenance window
   */
  private isInMaintenanceWindow(): boolean {
    if (!this.config.maintenance.enabled) {
      return false;
    }

    const now = new Date();
    const timezone = this.config.maintenance.maintenanceWindow.timezone;
    
    // Convert current time to maintenance timezone
    const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const currentTime = nowInTimezone.getHours() * 60 + nowInTimezone.getMinutes();
    
    const [startHour, startMinute] = this.config.maintenance.maintenanceWindow.start.split(':').map(Number);
    const [endHour, endMinute] = this.config.maintenance.maintenanceWindow.end.split(':').map(Number);
    
    const startTime = (startHour || 0) * 60 + (startMinute || 0);
    const endTime = (endHour || 0) * 60 + (endMinute || 0);

    // Handle overnight maintenance windows
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Update job's next run time
   */
  private updateJobNextRunTime(job: ScheduledJob): void {
    try {
      // This is a simplified calculation - in a real implementation,
      // you might want to use a more sophisticated cron parser
      const now = new Date();
      job.nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Simplified: next day
    } catch (error) {
      console.error(`Failed to calculate next run time for ${job.name}:`, error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    const jobsArray = Array.from(this.jobs.values());
    
    return {
      isRunning: this.isRunning,
      jobs: Object.fromEntries(this.jobs),
      totalJobs: this.jobs.size,
      activeJobs: jobsArray.filter(job => job.status !== 'disabled').length,
      maintenanceMode: this.isInMaintenanceWindow(),
    };
  }

  /**
   * Enable/disable a specific job
   */
  async toggleJob(jobName: string, enabled: boolean): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (enabled && job.status === 'disabled') {
      job.task.start();
      job.status = 'idle';
      console.log(`Enabled job: ${jobName}`);
    } else if (!enabled && job.status !== 'disabled') {
      job.task.stop();
      job.status = 'disabled';
      console.log(`Disabled job: ${jobName}`);
    }
  }

  /**
   * Manually trigger a scheduled job
   */
  async triggerJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (job.status === 'running') {
      throw new Error(`Job ${jobName} is already running`);
    }

    console.log(`Manually triggering job: ${jobName}`);
    await this.executeScheduledScraping(jobName, job.config);
  }

  /**
   * Add a new scheduled job
   */
  async addJob(jobName: string, scheduleConfig: ScheduleConfig): Promise<void> {
    if (this.jobs.has(jobName)) {
      throw new Error(`Job already exists: ${jobName}`);
    }

    await this.createScheduledJob(jobName, scheduleConfig);
    console.log(`Added new job: ${jobName}`);
  }

  /**
   * Remove a scheduled job
   */
  async removeJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    job.task.stop();
    this.jobs.delete(jobName);
    console.log(`Removed job: ${jobName}`);
  }

  /**
   * Update scheduler configuration
   */
  async updateConfig(newConfig: Partial<SchedulerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Update notification service
    if (newConfig.notifications) {
      this.notificationService = new NotificationService(this.config.notifications);
    }

    // Update health check service
    if (newConfig.healthCheck) {
      this.healthCheckService = new HealthCheckService(this.config.healthCheck);
    }

    console.log('Scheduler configuration updated');
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<any> {
    return await this.healthCheckService.performHealthCheck();
  }

  /**
   * Test notifications
   */
  async testNotifications(): Promise<any> {
    return await this.notificationService.testNotifications();
  }

  /**
   * Enable/disable maintenance mode
   */
  setMaintenanceMode(enabled: boolean): void {
    this.maintenanceMode = enabled;
    console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get job statistics
   */
  getJobStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [jobName, job] of this.jobs) {
      stats[jobName] = {
        runCount: job.runCount,
        errorCount: job.errorCount,
        successRate: job.runCount > 0 ? ((job.runCount - job.errorCount) / job.runCount * 100).toFixed(2) + '%' : 'N/A',
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        status: job.status,
      };
    }

    return stats;
  }
}