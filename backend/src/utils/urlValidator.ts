import dns from 'dns';
import { URL } from 'url';
import axios from 'axios';

/**
 * Validates a URL to prevent SSRF and protocol manipulation.
 */
export async function validateScraperUrl(urlStr: string): Promise<{ isValid: boolean; reason?: string; ip?: string }> {
  try {
    const parsed = new URL(urlStr);

    // 1. Validate protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, reason: 'Unsupported protocol. Only HTTP and HTTPS are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Reject loopbacks, unspecified and obvious local patterns directly
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { isValid: false, reason: 'Access to loopback or private hostnames is prohibited.' };
    }

    // 3. Resolve DNS to inspect destination IP
    try {
      const lookup = await dns.promises.lookup(parsed.hostname, { all: false });
      const ip = lookup.address;

      if (isPrivateIp(ip)) {
        return { isValid: false, reason: `Destination IP (${ip}) belongs to a private or reserved network.`, ip };
      }

      return { isValid: true, ip };
    } catch (dnsErr: any) {
      return { isValid: false, reason: `DNS resolution failed: ${dnsErr.message}` };
    }
  } catch (err) {
    return { isValid: false, reason: 'Malformed or invalid URL syntax.' };
  }
}

/**
 * Checks if an IP is private (RFC 1918, loopback, link-local, multicast, etc.)
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4 validation
  const ipv4Parts = ip.split('.');
  if (ipv4Parts.length === 4) {
    const first = parseInt(ipv4Parts[0], 10);
    const second = parseInt(ipv4Parts[1], 10);

    if (isNaN(first) || isNaN(second)) return true;

    // Loopback: 127.0.0.0/8
    if (first === 127) return true;

    // Unspecified: 0.0.0.0
    if (first === 0) return true;

    // Private network ranges:
    // 10.0.0.0/8
    if (first === 10) return true;

    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) return true;

    // 192.168.0.0/16
    if (first === 192 && second === 168) return true;

    // Link-local: 169.254.0.0/16
    if (first === 169 && second === 254) return true;

    // Multicast: 224.0.0.0/4
    if (first >= 224 && first <= 239) return true;

    // Reserved / Broadcast: 240.0.0.0/4 to 255.255.255.255
    if (first >= 240) return true;

    return false;
  }

  // IPv6 validation
  const cleanIp = ip.toLowerCase().trim();
  if (
    cleanIp === '::1' ||
    cleanIp === '::' ||
    cleanIp === '0:0:0:0:0:0:0:1' ||
    cleanIp === '0:0:0:0:0:0:0:0' ||
    cleanIp.startsWith('fe80:') || // link-local
    cleanIp.startsWith('fc00:') || // unique local
    cleanIp.startsWith('fd00:') || // unique local
    cleanIp.startsWith('ff00:')    // multicast
  ) {
    return true;
  }

  return false;
}

/**
 * Safely fetches a URL content enforcing SSRF re-checks for redirect URLs.
 */
export async function fetchUrlWithSsrfProtection(urlStr: string, maxRedirects: number = 5): Promise<string> {
  let currentUrl = urlStr;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const valResult = await validateScraperUrl(currentUrl);
    if (!valResult.isValid) {
      throw new Error(`SSRF Block: Target resolves to an unsafe destination (${valResult.reason})`);
    }

    const response = await axios.get(currentUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      timeout: 10000,
      headers: {
        'User-Agent': 'CMS-Placement-Scraper/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers['location'];
      if (!location) {
        throw new Error(`Redirect status ${response.status} returned without Location header.`);
      }

      currentUrl = new URL(location, currentUrl).toString();
      redirectsCount++;
      continue;
    }

    if (!response.data || typeof response.data !== 'string') {
      throw new Error('Response content is empty or non-textual.');
    }

    return response.data;
  }

  throw new Error('Maximum redirect limit exceeded.');
}

/**
 * Tests reachability of a URL and checks that it's safe to scrap.
 */
export async function testSourceUrl(urlStr: string): Promise<{ success: boolean; status?: number; size?: number; reason?: string }> {
  try {
    const html = await fetchUrlWithSsrfProtection(urlStr);
    if (html.trim().length === 0) {
      return { success: false, reason: 'Empty page content received.' };
    }
    return {
      success: true,
      size: html.length,
      status: 200
    };
  } catch (err: any) {
    return {
      success: false,
      reason: err.message
    };
  }
}
