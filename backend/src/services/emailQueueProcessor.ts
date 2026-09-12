import EmailQueue from '../models/EmailQueue.js';
import Placement from '../models/Placement.js';
import { emailService } from './emailService.js';
import SystemLog from '../models/SystemLog.js';

let isProcessing = false;

export class EmailQueueProcessor {
  public static intervalId: any = null;

  public static start(intervalMs = 15000) {
    if (this.intervalId) return;
    console.log('[EmailQueueProcessor] Starting background worker loop...');
    this.intervalId = setInterval(async () => {
      await this.processQueue().catch(err => console.error('[EmailQueueProcessor] processQueue error:', err));
    }, intervalMs);
  }

  public static stop() {
    if (this.intervalId) {
      console.log('[EmailQueueProcessor] Stopping background worker loop...');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public static async processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // Find one pending job that is ready to run
      const now = new Date();
      const job = await EmailQueue.findOne({
        status: 'pending',
        runAt: { $lte: now }
      }).sort({ runAt: 1 });

      if (!job) {
        isProcessing = false;
        return;
      }

      // Atomically claim the job
      const claimedJob = await EmailQueue.findOneAndUpdate(
        { 
          _id: job._id, 
          status: 'pending',
          runAt: { $lte: now }
        },
        { 
          $set: { 
            status: 'processing',
            startedAt: new Date(),
            lastAttemptAt: new Date()
          }
        },
        { new: true }
      );

      if (!claimedJob) {
        // Job was claimed or updated by another worker/instance in the meantime
        isProcessing = false;
        return;
      }

      // Perform actual Brevo delivery attempt
      // Increment attempt count before actual sending attempt
      claimedJob.attempts += 1;
      await claimedJob.save();

      try {
        const placement = await Placement.findById(claimedJob.placementId);
        if (!placement) {
          throw { status: 400, message: `Placement reference not found: ${claimedJob.placementId}` };
        }

        // Send the email via central service
        const messageId = await emailService.sendPlacementEmail(
          claimedJob.recipientEmail,
          claimedJob.recipientName || '',
          placement
        );

        // Mark completed on success
        claimedJob.status = 'completed';
        claimedJob.processedAt = new Date();
        claimedJob.providerMessageId = messageId;
        await claimedJob.save();

      } catch (err: any) {
        const statusCode = err.status || 500;
        const errMsg = err.message || String(err);
        claimedJob.lastError = errMsg;

        const isTransient = [429, 500, 502, 503, 504].includes(statusCode) || statusCode >= 500 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';

        if (isTransient && claimedJob.attempts < 3) {
          claimedJob.status = 'pending';
          
          // Compute exponential backoff in minutes: 2^attempts minutes
          let backoffMinutes = Math.pow(2, claimedJob.attempts);
          
          // Handle Retry-After for 429 and clamp it safely (max 5 minutes)
          if (statusCode === 429 && err.retryAfter) {
            const parsedRetry = parseInt(err.retryAfter);
            if (!isNaN(parsedRetry) && parsedRetry > 0) {
              // Convert to minutes
              backoffMinutes = parsedRetry / 60;
            }
          }
          
          // Clamp backoff to sensible max (5 minutes) and ensure it's not negative
          if (backoffMinutes > 5) {
            backoffMinutes = 5;
          }
          if (backoffMinutes < 0.1) {
            backoffMinutes = 0.5; // at least 30 seconds
          }
          
          claimedJob.runAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
          await claimedJob.save();

          await SystemLog.create({
            category: 'NOTIFICATION_LOG',
            level: 'warn',
            message: `Transient email sending failure (attempt ${claimedJob.attempts}): ${errMsg}`,
            metadata: { jobId: claimedJob._id }
          }).catch(() => {});

        } else {
          // Permanent failure or retry attempts exhausted
          claimedJob.status = 'failed';
          await claimedJob.save();

          await SystemLog.create({
            category: 'NOTIFICATION_LOG',
            level: 'error',
            message: `Permanent email sending failure or retries exhausted (attempts: ${claimedJob.attempts}): ${errMsg}`,
            metadata: { jobId: claimedJob._id }
          }).catch(() => {});
        }
      }
    } catch (criticalErr: any) {
      console.error('[EmailQueueProcessor] Critical queue loop error:', criticalErr);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Recovers processing jobs that are stuck for longer than 10 minutes.
   * Resolves concurrent instance safety via atomic findOneAndUpdate transitions.
   */
  public static async recoverStuckJobs() {
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

    try {
      const stuckJobs = await EmailQueue.find({
        status: 'processing',
        startedAt: { $lt: cutoff }
      });

      if (stuckJobs.length === 0) return;

      console.log(`[EmailQueueProcessor] Recovering ${stuckJobs.length} stuck processing email jobs...`);

      for (const job of stuckJobs) {
        // Try to atomically claim/transition this specific job from processing back to pending/failed
        const targetStatus = job.attempts < 3 ? 'pending' : 'failed';
        const updateDoc: any = {
          $set: {
            status: targetStatus
          },
          $unset: {
            startedAt: "",
            lastAttemptAt: ""
          }
        };

        if (targetStatus === 'pending') {
          // Reschedule stuck job with backoff (e.g. 2 minutes)
          updateDoc.$set.runAt = new Date(Date.now() + 2 * 60 * 1000);
        }

        const recovered = await EmailQueue.findOneAndUpdate(
          {
            _id: job._id,
            status: 'processing',
            startedAt: job.startedAt // Ensure startedAt has not changed (means no concurrent worker picked it up/updated it)
          },
          updateDoc,
          { new: true }
        );

        if (recovered) {
          await SystemLog.create({
            category: 'NOTIFICATION_LOG',
            level: 'info',
            message: `Recovered stuck EmailQueue job (ID: ${job._id}). Reset status to ${targetStatus}.`,
            metadata: { jobId: job._id }
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('[EmailQueueProcessor] Stuck job recovery error:', err);
    }
  }
}
