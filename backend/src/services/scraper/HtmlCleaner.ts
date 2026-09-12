import * as cheerio from 'cheerio';

export class HtmlCleaner {
  static extractCleanText(html: string, baseUrl?: string): string {
    const $ = cheerio.load(html);

    // Remove noise elements completely
    const noiseSelectors = [
      'nav', 'footer', 'header', 'script', 'style', 'noscript', 'iframe', 'svg',
      '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
      '#cookie-banner', '.cookie-consent', '#gdpr', '.modal', '.popup',
      '#newsletter', '.newsletter-signup', '.ads', '.advertisement',
      '.social-share', '.comments', '#comments'
    ];

    noiseSelectors.forEach(selector => {
      $(selector).remove();
    });

    // Process links to expose URLs to the AI
    $('a').each((i, el) => {
      let href = $(el).attr('href');
      const linkText = $(el).text().trim();
      
      if (href && linkText && !href.startsWith('javascript:')) {
        // Resolve relative URLs
        if (baseUrl && href.startsWith('/')) {
          try {
            const urlObj = new URL(baseUrl);
            href = `${urlObj.origin}${href}`;
          } catch(e) {}
        }
        
        // Append URL so AI can extract it
        $(el).text(` ${linkText} [URL: ${href}] `);
      }
    });

    // Extract text and clean it up
    let text = $('body').text();
    
    // Normalize whitespace (remove multiple spaces, tabs, newlines)
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }
}
