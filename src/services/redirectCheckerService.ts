import axios, { AxiosResponse } from 'axios';
import { URL } from 'url';
import * as cheerio from 'cheerio';

export interface RedirectCheckOptions {
  maxRedirects?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RedirectResult {
  url: string;
  status?: number;
  headers?: Record<string, string>;
  html?: string;
  error?: string;
}

export class RedirectChecker {
  private maxRedirects: number;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(options: RedirectCheckOptions = {}) {
    this.maxRedirects = options.maxRedirects || 10;
    this.timeout = options.timeout || 10000;
    this.headers = options.headers || {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
  }

  async check(url: string): Promise<RedirectResult[]> {
    const results: RedirectResult[] = [];
    let currentUrl = url;
    let redirectCount = 0;

    while (redirectCount <= this.maxRedirects) {
      try {
        const response = await this.makeRequest(currentUrl);
        const result: RedirectResult = {
          url: currentUrl,
          status: response.status,
          headers: response.headers as Record<string, string>,
          html: response.data
        };

        results.push(result);

        // Check for redirect headers
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.location;
          if (location) {
            currentUrl = this.resolveUrl(location, currentUrl);
            redirectCount++;
            continue;
          }
        }

        // Check for meta refresh redirects if HTML content
        if (response.status === 200 && response.headers['content-type']?.includes('text/html')) {
          const metaRedirect = this.parseMetaRefresh(response.data, currentUrl);
          if (metaRedirect) {
            currentUrl = metaRedirect;
            redirectCount++;
            continue;
          }
        }

        break; // No more redirects
      } catch (error: any) {
        results.push({
          url: currentUrl,
          error: error.message || 'Unknown error occurred'
        });
        break;
      }
    }

    return results;
  }

  private async makeRequest(url: string): Promise<AxiosResponse> {
    return await axios({
      method: 'GET',
      url: url,
      maxRedirects: 0, // Handle redirects manually
      timeout: this.timeout,
      headers: this.headers,
      validateStatus: () => true // Allow all status codes
    });
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch (error) {
      throw new Error(`Invalid URL: ${relativeUrl} with base ${baseUrl}`);
    }
  }

  private parseMetaRefresh(html: string, baseUrl: string): string | null {
    const $ = cheerio.load(html);
    const metaRefresh = $('meta[http-equiv="refresh"], meta[http-equiv="Refresh"]');

    if (metaRefresh.length) {
      const content = metaRefresh.attr('content');
      if (content) {
        const match = content.match(/url=(.*)/i);
        if (match) {
          return this.resolveUrl(match[1].trim(), baseUrl);
        }
      }
    }
    return null;
  }
}