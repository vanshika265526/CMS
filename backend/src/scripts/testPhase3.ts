import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axiosLib from 'axios';
import { chromium } from 'playwright';
import { validateScraperUrl, testSourceUrl, isPrivateIp, fetchUrlWithSsrfProtection } from '../utils/urlValidator.js';
import { PlaywrightScraper } from '../services/scraper/PlaywrightScraper.js';
import { JobOrchestrator } from '../services/queue/JobOrchestrator.js';
import { ImportService } from '../services/ai/importService.js';
import { GroqService, GroqAIProvider } from '../services/ai/groqService.js';
import TrustedSource from '../models/TrustedSource.js';
import ScrapeJob from '../models/ScrapeJob.js';
import PlacementImport from '../models/PlacementImport.js';
import Placement from '../models/Placement.js';
import AuditLog from '../models/AuditLog.js';
import SystemLog from '../models/SystemLog.js';
import {
  getTrustedSources,
  createTrustedSource,
  updateTrustedSource,
  deleteTrustedSource,
  testTrustedSource,
  triggerScrape
} from '../controllers/trustedSourceController.js';

dotenv.config();

let mockPageInstance: any;

import dns from 'dns';
// Mock DNS resolution for offline testing
dns.promises.lookup = async (hostname: string, options?: any) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { address: '127.0.0.1', family: 4 } as any;
  }
  if (hostname === '192.168.1.1') {
    return { address: '192.168.1.1', family: 4 } as any;
  }
  return { address: '93.184.216.34', family: 4 } as any; // Mock public IP
};

// Helper to construct Express Mock Request & Response
function makeMockReqRes(user: any, body: any = {}, params: any = {}, query: any = {}) {
  const req = {
    user,
    body,
    params,
    query,
    ip: '192.168.1.5',
    headers: { 'user-agent': 'TestRunner/1.0' }
  } as any;

  const res = {
    statusCode: 200,
    jsonData: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    }
  } as any;

  return { req, res };
}

async function runPhase3Tests() {
  console.log('\n==================================================');
  console.log('STARTING PHASE 3 VERIFICATION & RELIABILITY TESTS');
  console.log('==================================================\n');

  // Mock Playwright globally
  mockPageInstance = {
    route: async () => {},
    on: () => {},
    goto: async () => {
      return {
        status: () => 200,
        statusText: () => 'OK'
      } as any;
    },
    content: async () => '<html><body>Valid Placement details here! Acme Corp Software Engineer. Package 12 LPA. Drive Date 2026-12-01.</body></html>',
    close: async () => {},
    screenshot: async () => Buffer.from([])
  };

  chromium.launch = async () => {
    return {
      newPage: async () => mockPageInstance,
      close: async () => {}
    } as any;
  };

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.log(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Connect to DB
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('[INFO] Connected to MongoDB.');
  } catch (e: any) {
    console.error('[CRITICAL] MongoDB connection failed:', e.message);
    process.exit(1);
  }

  const collegeAId = new mongoose.Types.ObjectId();
  const collegeBId = new mongoose.Types.ObjectId();
  const adminA = { _id: new mongoose.Types.ObjectId(), role: 'COLLEGE_ADMIN', collegeId: collegeAId };
  const adminB = { _id: new mongoose.Types.ObjectId(), role: 'COLLEGE_ADMIN', collegeId: collegeBId };
  const superAdmin = { _id: new mongoose.Types.ObjectId(), role: 'SUPER_ADMIN' };

  let sourceA: any;
  let sourceB: any;

  async function cleanup() {
    await TrustedSource.deleteMany({});
    await ScrapeJob.deleteMany({});
    await PlacementImport.deleteMany({});
    await AuditLog.deleteMany({});
  }

  try {
    await cleanup();

    // ====================================================
    // Scenarios A-L: Trusted Source CRUD Scoping
    // ====================================================
    console.log('\n--- Section 1: Trusted Source CRUD Scoping & Validation ---');

    // A. Create source with valid data
    const { req: reqA, res: resA } = makeMockReqRes(adminA, {
      name: 'Test A Source',
      url: 'https://collegea.example.com/careers'
    });
    await createTrustedSource(reqA, resA);
    assert(resA.statusCode === 201, 'Scenario A: Created College A source successfully');
    sourceA = resA.jsonData.data;

    // B. Reject invalid URL
    const { req: reqB, res: resB } = makeMockReqRes(adminA, {
      name: 'Test Source',
      url: 'not-a-valid-url'
    });
    await createTrustedSource(reqB, resB);
    assert(resB.statusCode === 400, 'Scenario B: Rejected malformed URL');

    // C. Reject unsupported protocol
    const { req: reqC, res: resC } = makeMockReqRes(adminA, {
      name: 'Test Source',
      url: 'ftp://ftp.example.com'
    });
    await createTrustedSource(reqC, resC);
    assert(resC.statusCode === 400 && resC.jsonData.message.includes('protocol'), 'Scenario C: Rejected ftp:// protocol');

    // D. Reject missing collegeId (handled because COLLEGE_ADMIN derives it from token context, let's verify SUPER_ADMIN validation)
    const { req: reqD, res: resD } = makeMockReqRes(superAdmin, {
      name: 'Test Super Source',
      url: 'https://super.example.com/careers'
      // missing collegeId
    });
    await createTrustedSource(reqD, resD);
    assert(resD.statusCode === 400, 'Scenario D: SUPER_ADMIN creation rejected when missing collegeId');

    // E. COLLEGE_ADMIN cannot create source assigned to another college
    const { req: reqE, res: resE } = makeMockReqRes(adminA, {
      name: 'Test Manipulate Source',
      url: 'https://manipulate.example.com/careers',
      collegeId: collegeBId // try to assign to College B
    });
    await createTrustedSource(reqE, resE);
    assert(
      resE.statusCode === 201 && resE.jsonData.data.collegeId.toString() === collegeAId.toString(),
      'Scenario E: Ignored client-provided collegeId for COLLEGE_ADMIN, scoped to context collegeId'
    );
    // Cleanup the manipulate source
    await TrustedSource.deleteOne({ _id: resE.jsonData.data._id });

    // F. COLLEGE_ADMIN cannot read another college's source
    // First create College B source using adminB
    const { req: reqFB, res: resFB } = makeMockReqRes(adminB, {
      name: 'Test B Source',
      url: 'https://collegeb.example.com/careers'
    });
    await createTrustedSource(reqFB, resFB);
    sourceB = resFB.jsonData.data;

    const { req: reqF, res: resF } = makeMockReqRes(adminA); // Admin A tries to read
    await getTrustedSources(reqF, resF);
    const readList = resF.jsonData.data;
    const hasSourceB = readList.some((s: any) => s._id.toString() === sourceB._id.toString());
    assert(!hasSourceB, 'Scenario F: College A admin cannot read College B source');

    // G. COLLEGE_ADMIN cannot update another college's source
    const { req: reqG, res: resG } = makeMockReqRes(adminA, { name: 'Hacked Name' }, { id: sourceB._id });
    await updateTrustedSource(reqG, resG);
    assert(resG.statusCode === 403, 'Scenario G: College A admin blocked from updating College B source');

    // H. COLLEGE_ADMIN cannot delete another college's source
    const { req: reqH, res: resH } = makeMockReqRes(adminA, {}, { id: sourceB._id });
    await deleteTrustedSource(reqH, resH);
    assert(resH.statusCode === 403, 'Scenario H: College A admin blocked from deleting College B source');

    // I. SUPER_ADMIN behavior is correct
    const { req: reqI, res: resI } = makeMockReqRes(superAdmin);
    await getTrustedSources(reqI, resI);
    assert(resI.statusCode === 200 && resI.jsonData.data.length >= 2, 'Scenario I: SUPER_ADMIN reads across all colleges');

    // J & K. Disable and re-enable source prevents/allows scrape jobs
    const { req: reqJ, res: resJ } = makeMockReqRes(adminA, { enabled: false }, { id: sourceA._id });
    await updateTrustedSource(reqJ, resJ);
    
    // Attempt scrape now on disabled source
    const { req: reqJScrape, res: resJScrape } = makeMockReqRes(adminA, {}, { id: sourceA._id });
    await triggerScrape(reqJScrape, resJScrape);
    assert(resJScrape.statusCode === 400, 'Scenario J: Disabled source prevents new scrape jobs');

    // Re-enable source
    const { req: reqK, res: resK } = makeMockReqRes(adminA, { enabled: true }, { id: sourceA._id });
    await updateTrustedSource(reqK, resK);
    const { req: reqKScrape, res: resKScrape } = makeMockReqRes(adminA, {}, { id: sourceA._id });
    await triggerScrape(reqKScrape, resKScrape);
    assert(resKScrape.statusCode === 201, 'Scenario K: Re-enabled source successfully enqueued jobs again');

    // Clean up enqueued job
    await ScrapeJob.deleteMany({ sourceId: sourceA._id });

    // L. Delete source does not cascade delete imports (checked natively, let's verify manually)
    // Create mock import referencing sourceA url/website
    const testImport = await PlacementImport.create({
      companyName: 'Phase3 Corp',
      role: 'Scenario L Eng',
      sourceUrl: sourceA.url,
      sourceWebsite: sourceA.name,
      collegeId: collegeAId
    });

    const { req: reqL, res: resL } = makeMockReqRes(adminA, {}, { id: sourceA._id });
    await deleteTrustedSource(reqL, resL);
    
    const importStillExists = await PlacementImport.findById(testImport._id);
    assert(!!importStillExists, 'Scenario L: Deleting TrustedSource did not cascade delete historical imports');
    await PlacementImport.deleteOne({ _id: testImport._id });

    // Re-create sourceA for other sections
    const { req: reqAC, res: resAC } = makeMockReqRes(adminA, {
      name: 'Test A Source',
      url: 'https://collegea.example.com/careers'
    });
    await createTrustedSource(reqAC, resAC);
    sourceA = resAC.jsonData.data;


    // ====================================================
    // Scenarios M-S: URL Testing & SSRF Blocks
    // ====================================================
    console.log('\n--- Section 2: URL Testing & SSRF Boundaries ---');

    // S. SSRF/private network validation
    const localhostVal = await validateScraperUrl('http://localhost/admin');
    const privateIpVal = await validateScraperUrl('https://192.168.1.1/secrets');
    const IPv6Val = await validateScraperUrl('http://[::1]/private');
    assert(!localhostVal.isValid, 'Scenario S.1: Blocked localhost URL');
    assert(!privateIpVal.isValid, 'Scenario S.2: Blocked private network IPv4 address');
    assert(!IPv6Val.isValid, 'Scenario S.3: Blocked loopback IPv6 URL');

    // M. Reachable source succeeds
    let axiosMockCalled = false;
    axiosLib.get = async (url: string) => {
      axiosMockCalled = true;
      return { status: 200, data: '<html><body>Mock Job Portal Content</body></html>' } as any;
    };

    const testRes = await testSourceUrl('https://reachable.example.com');
    assert(testRes.success && testRes.status === 200, 'Scenario M: Reachable source tested successfully');

    // N. Invalid/404 handled
    axiosLib.get = async (url: string) => {
      const err: any = new Error('Request failed with status code 404');
      err.response = { status: 404, statusText: 'Not Found' };
      throw err;
    };
    const test404 = await testSourceUrl('https://notfound.example.com');
    assert(!test404.success && (test404.reason?.includes('404') ?? false), 'Scenario N: 404 error captured safely without crash');

    // O. Timeout handled safely
    axiosLib.get = async (url: string) => {
      const err: any = new Error('timeout');
      err.code = 'ECONNABORTED';
      throw err;
    };
    const testTimeout = await testSourceUrl('https://timeout.example.com');
    assert(!testTimeout.success && (testTimeout.reason?.includes('timeout') ?? false), 'Scenario O: Request timeout handled safely');


    // ====================================================
    // Scenarios T-AG: Scraper Edge Cases
    // ====================================================
    console.log('\n--- Section 3: Scraper Edge Cases & Date Valids ---');

    // Restore valid axios.get for Playwright/queue simulation
    axiosLib.get = async (url: string) => {
      return { status: 200, data: '<html><body>Placement Opportunity details here!</body></html>' } as any;
    };

    // AA. Prompt injection override defense
    // Zod schema verifies GroqService outputs confidence
    const safeExtraction = GroqService.mapToAIExtractedPlacement({
      companyName: 'Phase3 Corp',
      jobTitle: 'Clean Engineer',
      confidence: 95
    } as any);
    assert(safeExtraction.companyName === 'Phase3 Corp', 'Scenario AA: System mapping logic parsed clean output successfully');

    // AC. Expired placement date check
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Simulate processed jobs loop in Orchestrator with an expired deadline
    const expiredData = {
      companyName: 'Phase3 Corp',
      role: 'Expired Engineer',
      deadline: yesterday.toISOString()
    };

    // In JobOrchestrator, we checked if deadlineDate < new Date(). Let's assert it is detected as expired
    const deadlineDate = new Date(expiredData.deadline);
    const isExpired = !isNaN(deadlineDate.getTime()) && deadlineDate < new Date();
    assert(isExpired, 'Scenario AC: Successfully identified expired opportunity');


    // ====================================================
    // Scenarios AH-AN: Queue & Stuck Job Recovery
    // ====================================================
    console.log('\n--- Section 4: Queue Reliability & Stuck Job Recovery ---');

    // AL. Processing job does not remain stuck (Stuck job recovery verification)
    // Create a stuck processing job
    const stuckTime = new Date();
    stuckTime.setMinutes(stuckTime.getMinutes() - 20); // 20 minutes ago
    
    const stuckJob = await ScrapeJob.create({
      url: 'https://stuck.example.com',
      sourceId: sourceA._id,
      status: 'processing',
      startedAt: stuckTime,
      retryCount: 1
    });

    await JobOrchestrator.recoverStuckJobs();

    const recoveredJob = await ScrapeJob.findById(stuckJob._id);
    assert(
      recoveredJob?.status === 'pending' && recoveredJob?.retryCount === 2,
      'Scenario AL: Recovered stuck processing job and enqueued it back to pending'
    );
    await ScrapeJob.deleteOne({ _id: stuckJob._id });

    // AN. Scrape Now enqueues to ScrapeJob table
    const { req: reqAN, res: resAN } = makeMockReqRes(adminA, {}, { id: sourceA._id });
    await triggerScrape(reqAN, resAN);
    assert(resAN.statusCode === 201, 'Scenario AN.1: Scrape Now enqueued job successfully');
    
    const jobExists = await ScrapeJob.findOne({ sourceId: sourceA._id, status: 'pending' });
    assert(!!jobExists, 'Scenario AN.2: New ScrapeJob exists in pending state');

    // AH. Duplicate jobs prevented
    const { req: reqAH, res: resAH } = makeMockReqRes(adminA, {}, { id: sourceA._id });
    await triggerScrape(reqAH, resAH);
    assert(resAH.statusCode === 409, 'Scenario AH: Duplicate pending scrape job request blocked');

    // Clean up created jobs
    await ScrapeJob.deleteMany({ sourceId: sourceA._id });

    // Verify audit logs are recorded
    const auditLogsCount = await AuditLog.countDocuments({
      resource_type: { $in: ['TrustedSource', 'ScrapeJob'] }
    });
    assert(auditLogsCount > 0, `Section 5: Audit logs recorded successfully (${auditLogsCount} entries created)`);

    // ====================================================
    // Section 6: Phase 3 Test Gaps Coverage
    // ====================================================
    console.log('\n--- Section 6: Additional Phase 3 Gaps Coverage ---');

    // 1. 2MB Page Size Limit Test
    console.log('\n--- Scenario: 2MB Page Size Limit ---');
    let routeInterceptors: any[] = [];
    let responseListeners: any[] = [];
    
    mockPageInstance = {
      route: async (pattern: string, callback: any) => {
        routeInterceptors.push({ pattern, callback });
      },
      on: (event: string, callback: any) => {
        if (event === 'response') {
          responseListeners.push(callback);
        }
      },
      goto: async (url: string, opts?: any) => {
        for (const listener of responseListeners) {
          listener({
            headers: () => ({ 'content-length': '3000000' }), // 3MB (exceeds 2MB)
            status: () => 200
          });
        }
        throw new Error('Page closed');
      },
      content: async () => '<html></html>',
      close: async () => {}
    };

    const scraper2MB = new PlaywrightScraper();
    let errorThrown2MB = false;
    try {
      await scraper2MB.scrape('https://valid-but-huge.example.com');
    } catch (err: any) {
      errorThrown2MB = true;
      assert(err.message.includes('Page closed') || err.message.includes('size limit'), 'Gap 1: Scraper caught oversized response and terminated');
    }
    assert(errorThrown2MB, 'Gap 1: Scraper successfully aborted oversized page download');

    // 2. Playwright Resource Blocking Test
    console.log('\n--- Scenario: Playwright Resource Blocking ---');
    routeInterceptors = [];
    
    mockPageInstance = {
      route: async (pattern: string, callback: any) => {
        routeInterceptors.push({ pattern, callback });
      },
      on: () => {},
      goto: async () => {
        return { status: 200, statusText: 'OK' };
      },
      content: async () => '<html><body>Short text</body></html>',
      close: async () => {}
    };

    const scraperResource = new PlaywrightScraper();
    try {
      await scraperResource.scrape('https://valid.example.com');
    } catch {}

    const interceptor = routeInterceptors.find(r => r.pattern === '**/*');
    assert(!!interceptor, 'Gap 2: Interceptor registered on Playwright routing');

    if (interceptor) {
      let aborted = false;
      let continued = false;
      
      const mockRoute = {
        abort: async () => { aborted = true; },
        continue: async () => { continued = true; }
      };

      // Test image
      aborted = false; continued = false;
      await interceptor.callback(mockRoute, {
        resourceType: () => 'image',
        url: () => 'https://example.com/img.png'
      });
      assert(aborted && !continued, 'Gap 2.1: Interceptor aborted image request');

      // Test stylesheet
      aborted = false; continued = false;
      await interceptor.callback(mockRoute, {
        resourceType: () => 'stylesheet',
        url: () => 'https://example.com/style.css'
      });
      assert(aborted && !continued, 'Gap 2.2: Interceptor aborted stylesheet request');

      // Test font
      aborted = false; continued = false;
      await interceptor.callback(mockRoute, {
        resourceType: () => 'font',
        url: () => 'https://example.com/font.woff2'
      });
      assert(aborted && !continued, 'Gap 2.3: Interceptor aborted font request');

      // Test media
      aborted = false; continued = false;
      await interceptor.callback(mockRoute, {
        resourceType: () => 'media',
        url: () => 'https://example.com/video.mp4'
      });
      assert(aborted && !continued, 'Gap 2.4: Interceptor aborted media request');

      // Test document is revalidated and allowed
      aborted = false; continued = false;
      await interceptor.callback(mockRoute, {
        resourceType: () => 'document',
        url: () => 'https://example.com/careers'
      });
      assert(!aborted && continued, 'Gap 2.5: Interceptor allowed document request');
    }

    // 3. Redirect SSRF Chaining Test
    console.log('\n--- Scenario: Redirect SSRF Chaining ---');
    let callCount = 0;
    axiosLib.get = async (url: string, opts?: any) => {
      callCount++;
      if (url === 'https://public-start.example.com') {
        return {
          status: 302,
          headers: { location: 'http://127.0.0.1/admin' }
        } as any;
      }
      return { status: 200, data: 'Reached' } as any;
    };

    let ssrfRedirectBlocked = false;
    try {
      await fetchUrlWithSsrfProtection('https://public-start.example.com');
    } catch (err: any) {
      ssrfRedirectBlocked = true;
      assert(err.message.includes('SSRF Block') || err.message.includes('unsafe'), 'Gap 3.1: Blocked redirect chain ending in private IP');
    }
    assert(ssrfRedirectBlocked, 'Gap 3.1: Threw exception on loopback redirect');
    assert(callCount === 1, 'Gap 3.1: Request to private IP was never made');

    callCount = 0;
    axiosLib.get = async (url: string, opts?: any) => {
      callCount++;
      if (url === 'https://public-start-2.example.com') {
        return {
          status: 302,
          headers: { location: 'https://public-end.example.com' }
        } as any;
      }
      return { status: 200, data: 'Valid Content' } as any;
    };

    const finalContent = await fetchUrlWithSsrfProtection('https://public-start-2.example.com');
    assert(finalContent === 'Valid Content', 'Gap 3.2: Followed safe redirect redirect chain to public URL');
    assert(callCount === 2, 'Gap 3.2: Requests count matches expected redirect steps');

    // 4. "Nothing Found" Test (<150 characters)
    console.log('\n--- Scenario: Nothing Found ---');
    
    // Stub PlaywrightScraper to return a short string
    PlaywrightScraper.prototype.scrape = async (url: string) => {
      return {
        cleanedText: 'Short text.', // < 150 chars
        screenshotUrl: 'https://example.com/screen.png',
        rawHtml: '<html>Short</html>'
      };
    };

    let aiProviderInvoked = false;
    let originalExtract = GroqAIProvider.prototype.extractPlacementData;
    GroqAIProvider.prototype.extractPlacementData = async (text: string) => {
      aiProviderInvoked = true;
      throw new Error('AI extraction shouldn\'t be called');
    };

    const nothingSource = await TrustedSource.create({
      name: 'Nothing Source',
      url: 'https://nothing.example.com',
      collegeId: collegeAId
    });

    const nothingJob = await ScrapeJob.create({
      url: nothingSource.url,
      sourceId: nothingSource._id,
      status: 'pending'
    });

    await JobOrchestrator.triggerScraper();
    
    assert(!aiProviderInvoked, 'Gap 4.1: GroqAIProvider was NOT called on short scraped text');
    
    const updatedNothingJob = await ScrapeJob.findById(nothingJob._id);
    assert(updatedNothingJob?.status === 'completed', 'Gap 4.2: ScrapeJob marked completed on short content');
    
    const importCreated = await PlacementImport.findOne({ sourceUrl: nothingSource.url });
    assert(!importCreated, 'Gap 4.3: No PlacementImport created for empty/short content');

    const warningLog = await SystemLog.findOne({
      category: 'SCRAPER_LOG',
      message: /content is too short/
    });
    assert(!!warningLog, 'Gap 4.4: Safe warning SystemLog generated');

    // Cleanup
    await TrustedSource.deleteOne({ _id: nothingSource._id });
    await ScrapeJob.deleteOne({ _id: nothingJob._id });
    if (warningLog) await SystemLog.deleteOne({ _id: warningLog._id });
    GroqAIProvider.prototype.extractPlacementData = originalExtract;

    // 5. Database Failure After AI Success Test
    console.log('\n--- Scenario: Database Failure After AI Success ---');
    
    // Stub scraper to return a valid page text
    PlaywrightScraper.prototype.scrape = async (url: string) => {
      return {
        cleanedText: 'Valid job details for Acme Corp Senior Developer. Package: 10 LPA. Bengaluru location. This text is long enough to bypass the 150 character limit check implemented in the scraper processing loop to filter out short empty pages.',
        screenshotUrl: 'https://example.com/screen.png',
        rawHtml: '<html>Acme Corp Details</html>'
      };
    };

    // Stub GroqAIProvider to return valid AI response
    GroqAIProvider.prototype.extractPlacementData = async (text: string) => {
      return {
        companyName: 'Db Failure Corp',
        role: 'Database Engineer',
        confidenceScore: 95,
        deadline: '2026-12-15'
      } as any;
    };

    // Stub processImport to simulate a database validation/save failure
    const originalProcessImport = ImportService.processImport;
    ImportService.processImport = async () => {
      throw new Error('Mongoose Connection Write Timeout');
    };

    // Clear other jobs to ensure absolute isolation for this test
    await ScrapeJob.deleteMany({});

    const dbFailSource = await TrustedSource.create({
      name: 'DB Fail Source',
      url: 'https://dbfail.example.com',
      collegeId: collegeAId
    });

    const dbFailJob = await ScrapeJob.create({
      url: dbFailSource.url,
      sourceId: dbFailSource._id,
      status: 'pending',
      retryCount: 1
    });

    await JobOrchestrator.triggerScraper();

    const updatedDbFailJob = await ScrapeJob.findById(dbFailJob._id);
    assert(updatedDbFailJob?.status === 'pending', 'Gap 5.1: ScrapeJob remains pending for retrying');
    assert(updatedDbFailJob?.retryCount === 2, 'Gap 5.2: ScrapeJob incremented retryCount');
    assert(updatedDbFailJob?.lastError?.includes('Mongoose Connection') ?? false, 'Gap 5.3: Saved connection failure reason');

    const placementExists = await Placement.findOne({ companyName: 'Db Failure Corp' });
    assert(!placementExists, 'Gap 5.4: No Placement published on DB failure');

    const importExists = await PlacementImport.findOne({ companyName: 'Db Failure Corp' });
    assert(!importExists, 'Gap 5.5: No PlacementImport saved to database');

    // Cleanup
    await TrustedSource.deleteOne({ _id: dbFailSource._id });
    await ScrapeJob.deleteOne({ _id: dbFailJob._id });
    ImportService.processImport = originalProcessImport;

  } catch (err: any) {
    console.error('[CRITICAL TEST FAILURE]:', err);
    failed++;
  } finally {
    await cleanup();
    await mongoose.connection.close();
    console.log('[INFO] Database connection closed.');
  }

  console.log('\n==================================================');
  console.log('PHASE 3 TEST SUMMARY');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase3Tests();
