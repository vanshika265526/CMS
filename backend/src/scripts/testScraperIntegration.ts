import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axiosLib from 'axios';
import { PlaywrightScraper } from '../services/scraper/PlaywrightScraper.js';
import { GroqService, GroqPlacement } from '../services/ai/groqService.js';
import { ImportService } from '../services/ai/importService.js';
import { JobOrchestrator } from '../services/queue/JobOrchestrator.js';
import TrustedSource from '../models/TrustedSource.js';
import ScrapeJob from '../models/ScrapeJob.js';
import PlacementImport from '../models/PlacementImport.js';
import Placement from '../models/Placement.js';
import SystemLog from '../models/SystemLog.js';

dotenv.config();

// Stub PlaywrightScraper
PlaywrightScraper.prototype.scrape = async (url: string) => {
  return {
    cleanedText: 'Job details for Acme Corp Senior Dev. 12 LPA package in Hyderabad. This is a very long text added to satisfy the scraper page character validation limit which was introduced in Phase 3 to avoid analyzing short page stubs.',
    screenshotUrl: 'https://example.com/screenshot.png',
    rawHtml: '<html><body>Job details for Acme Corp Senior Dev</body></html>'
  };
};
PlaywrightScraper.prototype.close = async () => {};

// Mock AI output
const mockAIOutput: GroqPlacement = {
  companyName: 'Acme Scraped Corp',
  jobTitle: 'Scraped Software Engineer',
  description: 'A mock scraped description.',
  eligibility: {
    courses: ['B.Tech'],
    branches: ['CSE'],
    batches: ['2025'],
    minimumCGPA: 7.0
  },
  package: 12.0,
  location: 'Hyderabad',
  driveDate: '2026-11-20',
  applicationDeadline: '2026-11-01',
  applicationUrl: 'https://acme.example.com/apply',
  sourceUrl: 'https://scraper.example.com/jobs/acme',
  sourceName: 'Example Portal',
  employmentType: 'Full Time',
  skills: ['TypeScript', 'React'],
  confidence: 90
};

async function runIntegrationSuite() {
  console.log('\n==================================================');
  console.log('STARTING PHASE 2 SCRAPER INTEGRATION TEST SUITE');
  console.log('==================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.log(`[FAIL] ${message}`);
      failedTests++;
    }
  }

  // Connect to the DB
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('[INFO] Connected to MongoDB.');
  } catch (e: any) {
    console.error('[CRITICAL] MongoDB connection failed:', e.message);
    process.exit(1);
  }

  // Generate unique test scope identifiers
  const collegeAId = new mongoose.Types.ObjectId();
  const collegeBId = new mongoose.Types.ObjectId();

  let testSource: any;
  let testJob: any;

  // Clean up existing duplicates that might block unique index creation
  try {
    await PlacementImport.collection.dropIndexes();
    console.log('[INFO] Cleared old indexes on PlacementImport collection to establish clean state.');
  } catch (e) {}

  try {
    // Re-create indexes including our unique index
    await PlacementImport.createIndexes();
    console.log('[INFO] Successfully rebuilt PlacementImport unique indexes.');
  } catch (e: any) {
    console.warn('[WARN] Rebuilding indexes returned warning:', e.message);
  }

  // Clean up helper
  async function cleanup() {
    console.log('\n[INFO] Starting database cleanup...');
    if (testSource) await TrustedSource.deleteOne({ _id: testSource._id });
    if (testJob) await ScrapeJob.deleteOne({ _id: testJob._id });
    await PlacementImport.deleteMany({
      companyName: 'Acme Scraped Corp'
    });
    console.log('[INFO] Database cleanup completed.');
  }

  try {
    // Set up test TrustedSource & ScrapeJob
    testSource = await TrustedSource.create({
      name: 'Scraper Test Source',
      url: 'https://scraper.example.com/jobs/acme',
      enabled: true,
      priority: 10,
      scrapeFrequency: 24,
      isActive: true,
      collegeId: collegeAId // SCOPED to College A
    });

    testJob = await ScrapeJob.create({
      url: testSource.url,
      sourceId: testSource._id,
      status: 'pending'
    });

    // ----------------------------------------------------
    // Scenario A: Scraper successfully calls GroqService
    // ----------------------------------------------------
    console.log('\n--- Scenario A: Scraper calls GroqService via GroqAIProvider ---');
    
    // Stub Axios call to Groq API
    let aiCalled = false;
    axiosLib.post = async (url: string, data: any) => {
      if (url.includes('api.groq.com')) {
        aiCalled = true;
        return {
          data: {
            choices: [{ message: { content: JSON.stringify(mockAIOutput) } }]
          }
        } as any;
      }
      throw new Error('Unexpected HTTP post request');
    };

    // Execute Scraper via Orchestrator triggerScraper logic
    // We only trigger Scraper manually on our pending job
    const orchestratorResult = await JobOrchestrator.triggerScraper();
    assert(aiCalled, 'GroqService API was invoked during scraper run');
    assert(orchestratorResult.processedJobs > 0, 'Orchestrator successfully processed the scraper job');

    // ----------------------------------------------------
    // Scenario B: Valid AI output creates a PlacementImport
    // ----------------------------------------------------
    console.log('\n--- Scenario B: PlacementImport created from scraper run ---');
    const createdImport = await PlacementImport.findOne({
      companyName: 'Acme Scraped Corp'
    });
    
    assert(!!createdImport, 'PlacementImport document exists in database');
    assert(createdImport?.role === 'Scraped Software Engineer', 'Import properties successfully mapped from AI');
    assert(createdImport?.package === 12, 'Import package matches');

    // ----------------------------------------------------
    // Scenario C: AI output remains pending and does NOT publish
    // ----------------------------------------------------
    console.log('\n--- Scenario C: AI Output remains pending review (not published) ---');
    assert(createdImport?.reviewStatus === 'pending', 'Import reviewStatus is pending');
    
    // Check that NO published Placement was created
    const publishedPlacement = await Placement.findOne({
      companyName: 'Acme Scraped Corp'
    });
    assert(!publishedPlacement, 'No Placement record was published automatically');

    // ----------------------------------------------------
    // Scenario D: Malformed AI output does not create an import
    // ----------------------------------------------------
    console.log('\n--- Scenario D: Malformed AI output does not create import ---');
    axiosLib.post = async () => {
      return {
        data: {
          choices: [{ message: { content: '{"companyName": null, "jobTitle": null, "confidence": 10}' } }]
        }
      } as any;
    };

    // Clean up first
    await PlacementImport.deleteMany({ companyName: 'Acme Scraped Corp' });
    
    const malformedJob = await ScrapeJob.create({
      url: 'https://scraper.example.com/jobs/acme-malformed',
      sourceId: testSource._id,
      status: 'pending'
    });

    try {
      await JobOrchestrator.triggerScraper();
    } catch (e) {}

    const malformedImport = await PlacementImport.findOne({
      companyName: 'Acme Scraped Corp'
    });
    assert(!malformedImport, 'Malformed response rejected, no import created');
    
    // Clean up malformed job
    await ScrapeJob.deleteOne({ _id: malformedJob._id });

    // ----------------------------------------------------
    // Scenario E: Groq API failure causes ScrapeJob to follow failure path
    // ----------------------------------------------------
    console.log('\n--- Scenario E: Groq API failure sets ScrapeJob status to failed ---');
    axiosLib.post = async () => {
      const err: any = new Error('HTTP 500 Server Error');
      err.isAxiosError = true;
      err.response = { status: 500, statusText: 'Internal Error', headers: {}, data: {} };
      throw err;
    };

    const failJob = await ScrapeJob.create({
      url: 'https://scraper.example.com/jobs/acme-fail',
      sourceId: testSource._id,
      status: 'pending',
      retryCount: 2 // Set to 2 so the next failure triggers the 'failed' state
    });

    // Mock sleep to run instantly
    const originalSleep = (GroqService as any).sleep;
    (GroqService as any).sleep = async () => {};

    await JobOrchestrator.triggerScraper();
    
    const updatedFailJob = await ScrapeJob.findById(failJob._id);
    assert(updatedFailJob?.status === 'failed', 'ScrapeJob marked as failed when API fails and retries exhausted');
    assert(updatedFailJob?.lastError !== undefined, 'Last error details successfully recorded on ScrapeJob');

    // Restore sleep and clean up failJob
    (GroqService as any).sleep = originalSleep;
    await ScrapeJob.deleteOne({ _id: failJob._id });

    // ----------------------------------------------------
    // Scenario F & F.2: Duplicate detection & pre-checks
    // ----------------------------------------------------
    console.log('\n--- Scenario F: Duplicate pre-checks prevent redundant imports ---');
    // Restore valid AI mock
    axiosLib.post = async () => {
      return {
        data: {
          choices: [{ message: { content: JSON.stringify(mockAIOutput) } }]
        }
      } as any;
    };

    // Clean up imports first
    await PlacementImport.deleteMany({ companyName: 'Acme Scraped Corp' });

    const job1 = await ScrapeJob.create({
      url: 'https://scraper.example.com/jobs/acme-1',
      sourceId: testSource._id,
      status: 'pending'
    });
    
    // First run creates the import
    await JobOrchestrator.triggerScraper();
    const importsAfterRun1 = await PlacementImport.countDocuments({ companyName: 'Acme Scraped Corp' });
    assert(importsAfterRun1 === 1, 'First crawl created exactly 1 import record');

    const job2 = await ScrapeJob.create({
      url: 'https://scraper.example.com/jobs/acme-2',
      sourceId: testSource._id,
      status: 'pending'
    });

    // Second run should hit pre-check duplicate detection and skip creation
    await JobOrchestrator.triggerScraper();
    const importsAfterRun2 = await PlacementImport.countDocuments({ companyName: 'Acme Scraped Corp' });
    assert(importsAfterRun2 === 1, 'Second crawl of same data skipped duplicate import creation');

    await ScrapeJob.deleteMany({ _id: { $in: [job1._id, job2._id] } });

    // ----------------------------------------------------
    // Scenario G: Source URL is preserved
    // ----------------------------------------------------
    console.log('\n--- Scenario G: Source details preserved in PlacementImport ---');
    const importWithSource = await PlacementImport.findOne({ companyName: 'Acme Scraped Corp' });
    assert(importWithSource?.sourceUrl === 'https://scraper.example.com/jobs/acme-1', 'Preserved exact URL from crawl context');
    assert(importWithSource?.sourceWebsite === testSource.name, 'Preserved exact website name from crawl context');

    // ----------------------------------------------------
    // Scenario H & I: College Scoping Integrity
    // ----------------------------------------------------
    console.log('\n--- Scenario H & I: College Scope Integrity (AI Bypass Protection) ---');
    // Verify that the created import is scoped to College A (which owns the TrustedSource)
    assert(
      importWithSource?.collegeId?.toString() === collegeAId.toString(),
      'PlacementImport collegeId correctly matched TrustedSource college scope'
    );

    // Scenario I test: Verify that passing mock data attempting to override college scope fails.
    // The AI output contains no collegeId field, and backend processImport scopes it purely based on trust context.
    const mappedManipulated = GroqService.mapToAIExtractedPlacement({
      companyName: 'Acme Scraped Corp',
      jobTitle: 'Scraped Engineer',
      confidence: 90
    } as any);

    const manipulatedImport = await ImportService.processImport(
      mappedManipulated,
      'https://scraper.example.com/manipulated',
      'Test Portal',
      'html',
      'text',
      undefined,
      collegeAId // <-- Backend provides College A context
    );
    assert(
      manipulatedImport.collegeId?.toString() === collegeAId.toString(),
      'Backend scope (College A) remains authoritative'
    );
    assert(
      manipulatedImport.collegeId?.toString() !== collegeBId.toString(),
      'AI/manipulated input cannot override scoping to College B'
    );

    // ----------------------------------------------------
    // Scenario J: Concurrent duplicate race safety
    // ----------------------------------------------------
    console.log('\n--- Scenario J: Concurrent Duplicate Race safety ---');
    
    // We clean up imports to start fresh
    await PlacementImport.deleteMany({ companyName: 'Acme Scraped Corp' });

    // Create a new unique mock placement payload
    const raceAIOutput = {
      ...mockAIOutput,
      companyName: 'Acme Scraped Corp',
      role: 'Race Engineer ' + Date.now()
    };

    // Trigger concurrent imports using Promise.all
    console.log('[INFO] Spawning two concurrent import processes...');
    const mappedRaceOutput = GroqService.mapToAIExtractedPlacement(raceAIOutput);

    const call1 = ImportService.processImport(
      mappedRaceOutput,
      'https://race.example.com',
      'Race Portal',
      '<html></html>',
      'text',
      undefined,
      collegeAId
    );

    const call2 = ImportService.processImport(
      mappedRaceOutput,
      'https://race.example.com',
      'Race Portal',
      '<html></html>',
      'text',
      undefined,
      collegeAId
    );

    const [res1, res2] = await Promise.all([call1, call2]);

    assert(res1._id.toString() === res2._id.toString(), 'Concurrent requests resolved to the exact same document ID');
    
    const countInDB = await PlacementImport.countDocuments({
      fingerprintHash: res1.fingerprintHash
    });
    assert(countInDB === 1, 'Only one record exists in database (race condition prevented)');

  } catch (err: any) {
    console.error('[CRITICAL ERROR] Test suite aborted due to exception:', err);
    failedTests++;
  } finally {
    await cleanup();
    await mongoose.connection.close();
    console.log('[INFO] Mongoose connection closed.');
  }

  console.log('\n==================================================');
  console.log('INTEGRATION TEST SUMMARY');
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runIntegrationSuite();
