import { Router, Request, Response } from 'express';
import { SchedulerService, ScheduleConfig } from '../services/scheduler';
import { PipelineConfig } from '../services/pipeline/DataProcessingPipeline';
import { TranslationConfig } from '../services/translation/TranslationConfig';

const router = Router();

// Global scheduler instance (in a real app, this might be managed differently)
let schedulerService: SchedulerService | null = null;

/**
 * Initialize scheduler with default configuration
 */
function getSchedulerService(): SchedulerService {
  if (!schedulerService) {
    // Default pipeline configuration
    const pipelineConfig: PipelineConfig = {
      scraperConfig: {
        browserConfig: {
          headless: true,
          timeout: 60000,
          viewport: { width: 1920, height: 1080 },
        },
        scraperOptions: {
          maxRetries: 3,
          retryDelay: 5000,
          requestDelay: 2000,
          maxConcurrentPages: 2,
          timeout: 60000,
        },
      },
      translationConfig: new TranslationConfig(),
      processingOptions: {
        batchSize: 20,
        maxConcurrentSites: 2,
        enableDuplicateDetection: true,
        enableDataUpdate: true,
        skipTranslationOnError: false,
      },
    };

    schedulerService = new SchedulerService(pipelineConfig);
  }
  return schedulerService;
}

/**
 * GET /api/scheduler/status
 * Get scheduler status and job information
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const scheduler = getSchedulerService();
    const status = scheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      error: 'Failed to get scheduler status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/start
 * Start the scheduler service
 */
router.post('/start', async (_req: Request, res: Response) => {
  try {
    const scheduler = getSchedulerService();
    await scheduler.start();
    res.json({ message: 'Scheduler started successfully' });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    res.status(500).json({
      error: 'Failed to start scheduler',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/stop
 * Stop the scheduler service
 */
router.post('/stop', async (_req: Request, res: Response) => {
  try {
    const scheduler = getSchedulerService();
    await scheduler.stop();
    res.json({ message: 'Scheduler stopped successfully' });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    res.status(500).json({
      error: 'Failed to stop scheduler',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/scheduler/jobs
 * Get job statistics
 */
router.get('/jobs', async (_req: Request, res: Response) => {
  try {
    const scheduler = getSchedulerService();
    const statistics = scheduler.getJobStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Error getting job statistics:', error);
    res.status(500).json({
      error: 'Failed to get job statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/jobs/:jobName/toggle
 * Enable or disable a specific job
 */
router.post('/jobs/:jobName/toggle', async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params;
    const { enabled } = req.body;

    if (!jobName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'jobName is required',
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'enabled field must be a boolean',
      });
    }

    const scheduler = getSchedulerService();
    await scheduler.toggleJob(jobName, enabled);
    
    return res.json({ 
      message: `Job ${jobName} ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Error toggling job:', error);
    return res.status(500).json({
      error: 'Failed to toggle job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/jobs/:jobName/trigger
 * Manually trigger a specific job
 */
router.post('/jobs/:jobName/trigger', async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params;
    
    if (!jobName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'jobName is required',
      });
    }
    
    const scheduler = getSchedulerService();
    
    // Trigger job asynchronously
    scheduler.triggerJob(jobName).catch(error => {
      console.error(`Manual job trigger failed for ${jobName}:`, error);
    });
    
    return res.json({ 
      message: `Job ${jobName} triggered successfully` 
    });
  } catch (error) {
    console.error('Error triggering job:', error);
    return res.status(500).json({
      error: 'Failed to trigger job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/jobs
 * Add a new scheduled job
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { jobName, scheduleConfig } = req.body;

    if (!jobName || !scheduleConfig) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'jobName and scheduleConfig are required',
      });
    }

    // Validate schedule config
    const config: ScheduleConfig = {
      enabled: scheduleConfig.enabled ?? true,
      cronExpression: scheduleConfig.cronExpression,
      timezone: scheduleConfig.timezone || 'Asia/Tokyo',
      sites: scheduleConfig.sites || ['suumo'],
      healthCheckEnabled: scheduleConfig.healthCheckEnabled ?? true,
      notificationsEnabled: scheduleConfig.notificationsEnabled ?? true,
    };

    const scheduler = getSchedulerService();
    await scheduler.addJob(jobName, config);
    
    return res.json({ 
      message: `Job ${jobName} added successfully`,
      config 
    });
  } catch (error) {
    console.error('Error adding job:', error);
    return res.status(500).json({
      error: 'Failed to add job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/scheduler/jobs/:jobName
 * Remove a scheduled job
 */
router.delete('/jobs/:jobName', async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params;
    
    if (!jobName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'jobName is required',
      });
    }
    
    const scheduler = getSchedulerService();
    await scheduler.removeJob(jobName);
    
    return res.json({ 
      message: `Job ${jobName} removed successfully` 
    });
  } catch (error) {
    console.error('Error removing job:', error);
    return res.status(500).json({
      error: 'Failed to remove job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/scheduler/health
 * Perform system health check
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const scheduler = getSchedulerService();
    const healthResult = await scheduler.performHealthCheck();
    res.json(healthResult);
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({
      error: 'Failed to perform health check',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/notifications/test
 * Test notification configuration
 */
router.post('/notifications/test', async (_req: Request, res: Response) => {
  try {
    const scheduler = getSchedulerService();
    const testResult = await scheduler.testNotifications();
    res.json(testResult);
  } catch (error) {
    console.error('Error testing notifications:', error);
    res.status(500).json({
      error: 'Failed to test notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/scheduler/maintenance
 * Enable or disable maintenance mode
 */
router.post('/maintenance', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'enabled field must be a boolean',
      });
    }

    const scheduler = getSchedulerService();
    scheduler.setMaintenanceMode(enabled);
    
    return res.json({ 
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Error setting maintenance mode:', error);
    return res.status(500).json({
      error: 'Failed to set maintenance mode',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;