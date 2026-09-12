import cron from 'node-cron';
import ScrapeJob from '../../models/ScrapeJob.js';
import TrustedSource from '../../models/TrustedSource.js';
import SystemLog from '../../models/SystemLog.js';
import { PlaywrightScraper } from '../scraper/PlaywrightScraper.js';
import { GroqAIProvider } from '../ai/groqService.js';
import { ImportService } from '../ai/importService.js';

let isScraperRunning = false;

export class JobOrchestrator {
  
  static initCron() {
    const cronSchedule = process.env.SCRAPER_CRON || '0 */6 * * *';
    console.log(`[JobOrchestrator] Initializing Scraper Cron with schedule: ${cronSchedule}`);
    
    cron.schedule(cronSchedule, async () => {
      await this.triggerScraper();
    });
  }

  /**
   * Scans the database for jobs stuck in processing state for over 15 minutes,
   * resets them back to pending (if under max retries) or marks them failed.
   */
  static async recoverStuckJobs() {
    const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
    
    // Find processing jobs started before the cutoff
    const stuckJobs = await ScrapeJob.find({
      status: 'processing',
      startedAt: { $lt: cutoff }
    });
    
    if (stuckJobs.length > 0) {
      console.log(`[JobOrchestrator] Recovering ${stuckJobs.length} stuck scrape jobs...`);
      for (const job of stuckJobs) {
        job.retryCount += 1;
        job.lastError = 'Job timed out in processing state (marked stuck).';
        job.status = job.retryCount >= 3 ? 'failed' : 'pending';
        job.completedAt = new Date();
        await job.save();
        
        await SystemLog.create({
          category: 'SCRAPER_LOG',
          level: 'warn',
          message: `Recovered stuck ScrapeJob. Reset to status: ${job.status}`,
          metadata: { jobId: job._id, url: job.url }
        }).catch(() => {});

        // Update TrustedSource failure status if exists
        await TrustedSource.findByIdAndUpdate(job.sourceId, {
          lastScrapeStatus: 'failed',
          lastScrapeError: 'Scrape job timed out (marked stuck).',
          $inc: { recentFailures: 1 }
        }).catch(() => {});
      }
    }
  }

  static async triggerScraper() {
    if (isScraperRunning) {
      console.log('[JobOrchestrator] Scraper is already running. Skipping trigger.');
      return { alreadyRunning: true, activeSources: 0, enqueuedJobs: 0, processedJobs: 0, failedJobs: 0 };
    }
    
    isScraperRunning = true;
    let activeSources = 0;
    let enqueuedJobs = 0;
    let processedJobs = 0;
    let failedJobs = 0;
    let scraper: PlaywrightScraper | null = null;
    
    try {
      await SystemLog.create({ category: 'SCRAPER_LOG', level: 'info', message: 'Scraper run started' });
      
      // Perform stuck job recovery first
      await this.recoverStuckJobs();

      // 1. Enqueue new jobs from Enabled & Active TrustedSources
      const sources = await TrustedSource.find({ enabled: true, isActive: true }).sort({ priority: -1 });
      activeSources = sources.length;
      for (const source of sources) {
        const existingJob = await ScrapeJob.findOne({ sourceId: source._id, status: { $in: ['pending', 'processing'] } });
        if (!existingJob) {
          await ScrapeJob.create({ url: source.url, sourceId: source._id, status: 'pending' });
          enqueuedJobs += 1;
        }
      }

      // 2. Process Jobs
      scraper = new PlaywrightScraper();
      const jobs = await ScrapeJob.find({ status: 'pending' }).limit(10);
      
      for (const job of jobs) {
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();

        const source = sources.find(s => s._id.toString() === job.sourceId?.toString());
        const sourceName = source?.name || 'Unknown Source';
        const collegeId = source?.collegeId;

        try {
          // Scrape site
          const { cleanedText, screenshotUrl, rawHtml } = await scraper.scrape(job.url);
          
          // Verify that page has meaningful content (> 150 characters)
          if (!cleanedText || cleanedText.trim().length < 150) {
            await SystemLog.create({
              category: 'SCRAPER_LOG',
              level: 'info',
              message: `Crawl successful but content is too short/irrelevant: ${job.url}. Skipping import.`,
              metadata: { jobId: job._id, textLength: cleanedText?.length || 0 }
            }).catch(() => {});

            job.status = 'completed';
            job.completedAt = new Date();
            await job.save();
            processedJobs += 1;

            if (source) {
              source.lastScrapedAt = new Date();
              source.lastScrapeStatus = 'success';
              source.lastScrapeError = undefined;
              source.recentFailures = 0;
              await source.save();
            }
            continue;
          }

          // Extract placement details using GroqAIProvider adapter
          const aiProvider = new GroqAIProvider({ sourceUrl: job.url, sourceName });
          const aiData = await aiProvider.extractPlacementData(cleanedText);
          
          // Verify that AI extracted critical fields
          if (!aiData.companyName || !aiData.role) {
            await SystemLog.create({
              category: 'SCRAPER_LOG',
              level: 'info',
              message: `Crawl successful but AI detected no valid placement opportunity: ${job.url}. Skipping import.`,
              metadata: { jobId: job._id }
            }).catch(() => {});

            job.status = 'completed';
            job.completedAt = new Date();
            await job.save();
            processedJobs += 1;

            if (source) {
              source.lastScrapedAt = new Date();
              source.lastScrapeStatus = 'success';
              source.lastScrapeError = undefined;
              source.recentFailures = 0;
              await source.save();
            }
            continue;
          }

          // Check if the drive is already expired
          if (aiData.deadline) {
            const deadlineDate = new Date(aiData.deadline);
            if (!isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
              await SystemLog.create({
                category: 'SCRAPER_LOG',
                level: 'info',
                message: `Crawl successful but placement is expired (Deadline: ${aiData.deadline}): ${job.url}. Skipping import.`,
                metadata: { jobId: job._id }
              }).catch(() => {});

              job.status = 'completed';
              job.completedAt = new Date();
              await job.save();
              processedJobs += 1;

              if (source) {
                source.lastScrapedAt = new Date();
                source.lastScrapeStatus = 'success';
                source.lastScrapeError = undefined;
                source.recentFailures = 0;
                await source.save();
              }
              continue;
            }
          }

          // Process import using existing mapper and duplicate constraints
          await ImportService.processImport(aiData, job.url, sourceName, rawHtml, cleanedText, screenshotUrl, collegeId);
          
          job.status = 'completed';
          job.completedAt = new Date();
          await job.save();
          processedJobs += 1;
          
          if (source) {
            source.lastScrapedAt = new Date();
            source.lastScrapeStatus = 'success';
            source.lastScrapeError = undefined;
            source.recentFailures = 0;
            await source.save();
          }
          
        } catch (error: any) {
          // Network, browser, or AI extraction failure -> retry enqueuing
          job.retryCount += 1;
          job.lastError = error.message;
          job.status = job.retryCount >= 3 ? 'failed' : 'pending';
          if (job.status === 'failed') {
            failedJobs += 1;
          }
          await job.save();

          if (source) {
            source.lastScrapedAt = new Date();
            source.lastScrapeStatus = 'failed';
            source.lastScrapeError = error.message.substring(0, 500);
            source.recentFailures = (source.recentFailures || 0) + 1;
            await source.save();
          }
        }
      }

      await SystemLog.create({ category: 'SCRAPER_LOG', level: 'info', message: 'Scraper run finished successfully' });
      return { activeSources, enqueuedJobs, processedJobs, failedJobs };
    } catch (error: any) {
      await SystemLog.create({ category: 'SCRAPER_LOG', level: 'error', message: 'Scraper run encountered critical failure', metadata: { error: error.message } });
      return { activeSources, enqueuedJobs, processedJobs, failedJobs, error: error.message };
    } finally {
      if (scraper) {
        await scraper.close().catch(() => {});
      }
      isScraperRunning = false;
    }
  }
}
