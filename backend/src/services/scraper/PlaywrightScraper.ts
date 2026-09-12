import { chromium, Browser, Page } from 'playwright';
import { HtmlCleaner } from './HtmlCleaner.js';
import SystemLog from '../../models/SystemLog.js';
import { validateScraperUrl } from '../../utils/urlValidator.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

export class PlaywrightScraper {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrape(url: string): Promise<{ cleanedText: string, screenshotUrl?: string, rawHtml: string }> {
    await this.init();
    let page: Page | null = null;
    try {
      page = await this.browser!.newPage();
      
      // 1. SSRF check on initial URL before navigating
      const initialUrlVal = await validateScraperUrl(url);
      if (!initialUrlVal.isValid) {
        throw new Error(`SSRF Block: URL resolves to an unsafe destination (${initialUrlVal.reason})`);
      }

      // 2. Setup Playwright network request routing
      await page.route('**/*', async (route, request) => {
        const resourceType = request.resourceType();
        
        // Block heavy, unnecessary assets
        if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
          await route.abort().catch(() => {});
          return;
        }

        // Revalidate destination URL of dynamic fetches/redirects to prevent SSRF
        const reqUrl = request.url();
        try {
          const val = await validateScraperUrl(reqUrl);
          if (!val.isValid) {
            await route.abort('blockedbyclient').catch(() => {});
          } else {
            await route.continue().catch(() => {});
          }
        } catch {
          await route.abort('failed').catch(() => {});
        }
      });

      // 3. Monitor Content-Length headers to abort early if > 2MB
      page.on('response', (response) => {
        const headers = response.headers();
        const contentLength = headers['content-length'];
        if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
          // Immediately close to interrupt navigation download
          page!.close().catch(() => {});
        }
      });

      // Navigate with timeout and handle redirects/network idle
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      if (!response) {
        throw new Error('Failed to load page: No response');
      }
      
      const status = response.status();
      if (status >= 400) {
        throw new Error(`HTTP Error ${status}: ${response.statusText() || 'Scrape failed'}`);
      }

      // Check if page is essentially empty (body < 100 chars)
      const content = await page.content();
      if (content.length < 100) {
        throw new Error('Page content too short (Empty page)');
      }

      // Enforce early 2MB limit on fully loaded content
      if (content.length > 2 * 1024 * 1024) {
        throw new Error('Page size limit exceeded (Too large page content)');
      }

      // Allow SPA/Dynamic content a moment to render
      await page.waitForTimeout(2000); 

      const html = await page.content();
      const cleanedText = HtmlCleaner.extractCleanText(html, url);

      // Take screenshot
      const screenshotsDir = path.join(process.cwd(), 'uploads', 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      const hash = crypto.createHash('md5').update(url + Date.now()).digest('hex');
      const filename = `screenshot-${hash}.png`;
      const screenshotPath = path.join(screenshotsDir, filename);
      
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const screenshotUrl = `/uploads/screenshots/${filename}`;

      return { cleanedText, screenshotUrl, rawHtml: html };
    } catch (error: any) {
      await SystemLog.create({
        category: 'SCRAPER_LOG',
        level: 'error',
        message: `Scraper failed for ${url}`,
        metadata: { error: error.message }
      });
      throw error;
    } finally {
      if (page) {
        await page.close().catch(console.error);
      }
    }
  }
}
