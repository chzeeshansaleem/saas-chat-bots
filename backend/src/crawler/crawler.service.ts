import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { chromium, type Page } from 'playwright';

type CrawledPage = { url: string; title: string; description: string; text: string; links: string[] };
type CrawlFailure = { url: string; message: string; statusCode?: number };

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(private readonly config: ConfigService) {}

  async crawl(rootUrl: string, depth: number, pageLimit: number) {
    const normalizedRootUrl = normalizeUrl(rootUrl);
    await assertCrawlableUrl(normalizedRootUrl);
    const root = new URL(normalizedRootUrl);
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: normalizedRootUrl, depth: 0 }];
    const pages: CrawledPage[] = [];
    const failures: CrawlFailure[] = [];
    this.logger.log(
      `Crawler browser launch requested ${JSON.stringify({
        rootUrl,
        depth,
        pageLimit,
        waitUntil: this.config.get<string>('CRAWLER_WAIT_UNTIL', 'domcontentloaded'),
        timeoutMs: this.config.get<number>('CRAWLER_TIMEOUT_MS', 30000),
        rateLimitMs: this.config.get<number>('CRAWLER_RATE_LIMIT_MS', 350),
      })}`,
    );
    const browser = await this.launchBrowser();

    try {
      while (queue.length && pages.length < pageLimit) {
        const next = queue.shift()!;
        if (visited.has(next.url) || next.depth > depth) continue;
        visited.add(next.url);
        this.logger.log(
          `Crawler visiting page ${JSON.stringify({
            url: next.url,
            depth: next.depth,
            visitedCount: visited.size,
            indexedCount: pages.length,
            queuedCount: queue.length,
          })}`,
        );

        let page: Page | undefined;
        try {
          page = await browser.newPage({
            userAgent: this.config.get<string>('CRAWLER_USER_AGENT'),
            ignoreHTTPSErrors: this.config.get<boolean>('CRAWLER_IGNORE_HTTPS_ERRORS', false),
          });
          const response = await page.goto(next.url, {
            waitUntil: this.config.get<'load' | 'domcontentloaded' | 'networkidle'>('CRAWLER_WAIT_UNTIL', 'domcontentloaded'),
            timeout: this.config.get<number>('CRAWLER_TIMEOUT_MS', 30000),
          });
          const extracted = await this.extractPage(page);
          const links = extracted.links.map((link) => safeNormalizeUrl(link)).filter((link): link is string => Boolean(link));

          pages.push({ url: next.url, title: extracted.title, description: extracted.description, text: extracted.text, links });
          this.logger.log(
            `Crawler extracted page ${JSON.stringify({
              url: next.url,
              statusCode: response?.status(),
              title: extracted.title,
              textLength: extracted.text.length,
              discoveredLinks: links.length,
            })}`,
          );
          for (const link of links) {
            const parsed = new URL(link);
            if (parsed.hostname === root.hostname && !visited.has(parsed.href) && (await isCrawlableUrl(parsed.href))) {
              queue.push({ url: parsed.href, depth: next.depth + 1 });
            }
          }
        } catch (error) {
          const message = formatCrawlerError(error);
          failures.push({ url: next.url, message });
          this.logger.warn(
            `Crawler page extraction failed ${JSON.stringify({
              url: next.url,
              message: message.slice(0, 500),
            })}`,
          );
        } finally {
          await page?.close().catch(() => undefined);
        }

        await new Promise((resolve) => setTimeout(resolve, this.config.get<number>('CRAWLER_RATE_LIMIT_MS', 350)));
      }
      this.logger.log(
        `Crawler browser work completed ${JSON.stringify({
          rootUrl,
          indexedPages: pages.length,
          failedPages: failures.length,
          visitedPages: visited.size,
        })}`,
      );
      return { pages, failures };
    } finally {
      await browser.close();
      this.logger.log(`Crawler browser closed ${JSON.stringify({ rootUrl })}`);
    }
  }

  private async launchBrowser() {
    try {
      return await chromium.launch({
        headless: true,
        executablePath: this.config.get<string>('PLAYWRIGHT_EXECUTABLE_PATH'),
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (error) {
      const message = formatCrawlerError(error);
      if (message.includes("Executable doesn't exist") || message.includes('browserType.launch')) {
        throw new Error(`${message}\nInstall the browser with: npx playwright install chromium`);
      }
      throw error;
    }
  }

  private async extractPage(page: Page) {
    const extracted = await page.evaluate(() => {
      const removableSelectors = [
        'script',
        'style',
        'noscript',
        'svg',
        'canvas',
        'iframe',
        'nav',
        'header',
        'footer',
        '[role="navigation"]',
        '[aria-hidden="true"]',
        '.navbar',
        '.nav',
        '.menu',
        '.footer',
        '.header',
        '.cookie',
        '.breadcrumb',
      ];
      for (const selector of removableSelectors) {
        document.querySelectorAll(selector).forEach((node) => node.remove());
      }

      return {
        title: document.title || '',
        description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || '',
        text: document.body?.innerText || '',
        links: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((anchor) => anchor.href),
      };
    });

    return {
      ...extracted,
      text: cleanReadableText(extracted.text),
    };
  }
}

function formatCrawlerError(error: unknown) {
  return error instanceof Error ? error.stack || error.message : String(error);
}

function safeNormalizeUrl(value: string) {
  try {
    return normalizeUrl(value);
  } catch {
    return undefined;
  }
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs can be crawled.');
  }
  url.hash = '';
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.toLowerCase().startsWith('utm_') || ['fbclid', 'gclid', 'msclkid'].includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }
  return url.toString();
}

async function assertCrawlableUrl(value: string) {
  if (!(await isCrawlableUrl(value))) {
    throw new Error('URL is not allowed for crawling.');
  }
}

async function isCrawlableUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (isBlockedHostname(url.hostname)) return false;

  const records = await lookup(url.hostname, { all: true }).catch(() => []);
  if (!records.length) return false;
  return records.every((record) => !isPrivateAddress(record.address));
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === 'metadata.google.internal' ||
    normalized === '169.254.169.254' ||
    normalized === '0.0.0.0'
  );
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 0) return true;
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address) ||
    address.startsWith('169.254.') ||
    address.startsWith('fc') ||
    address.startsWith('fd') ||
    address.startsWith('fe80:')
  );
}

function cleanReadableText(value: string) {
  const seen = new Set<string>();
  return value
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
