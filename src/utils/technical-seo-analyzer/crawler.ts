import Crawler from "simplecrawler";
import * as cheerio from "cheerio";
import { URL } from "url";

interface CrawledPage {
    status: number;
    title?: string;
    description?: string;
    isIndexable?: boolean;
    links?: string[];
    error?: boolean;
}

export class TechnicalSEOAnalyzer {
    private baseURL: string;
    private crawledPages: Map<string, CrawledPage>;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.crawledPages = new Map<string, CrawledPage>();
    }

    async crawl(): Promise<Map<string, CrawledPage>> {
        return new Promise((resolve, reject) => {
            try {
                const crawler = new Crawler(this.baseURL);

                crawler.interval = 10000;
                crawler.maxConcurrency = 3;
                crawler.respectRobotsTxt = true;
                crawler.maxDepth = 2;
                crawler.timeout = 5000;
                crawler.userAgent = "SEO-Analyzer/1.0";

                let pagesFound = 0;
                const maxPages = 10;

                const crawlTimeout = setTimeout(() => {
                    crawler.stop();
                    resolve(this.crawledPages);
                }, 15000);

                const toText = (b: string | Buffer) =>
                    typeof b === "string" ? b : b.toString();

                crawler.on(
                    "fetchcomplete",
                    (queueItem: any, responseBody: string | Buffer, response: any) => {
                        pagesFound++;
                        const url = queueItem.url;
                        const $ = cheerio.load(toText(responseBody));

                        const robotsMeta = $('meta[name="robots"]').attr("content") || "";
                        const isIndexable = !robotsMeta.includes("noindex");

                        const title = $("title").text() || undefined;
                        const description = $('meta[name="description"]').attr("content") || undefined;

                        const page: CrawledPage = {
                            status: response?.statusCode || 200,
                            title,
                            description,
                            isIndexable,
                            links: [],
                        };

                        this.crawledPages.set(url, page);

                        $("a[href]").each((_, el) => {
                            const href = $(el).attr("href");
                            if (!href) return;
                            try {
                                const absoluteURL = new URL(href, url).href;
                                if (absoluteURL.startsWith(this.baseURL)) {
                                    page.links!.push(absoluteURL);
                                }
                            } catch (e) {
                                void e;
                            }
                        });

                        if (pagesFound >= maxPages) {
                            crawler.stop();
                        }
                    }
                );

                crawler.on("complete", () => {
                    clearTimeout(crawlTimeout);
                    resolve(this.crawledPages);
                });

                crawler.on("fetchtimeout", (queueItem: any) => {
                    this.crawledPages.set(queueItem.url, {
                        status: 408,
                        error: true,
                    });
                });

                crawler.on("fetcherror", (queueItem: any, response: any) => {
                    this.crawledPages.set(queueItem.url, {
                        status: response?.statusCode || 500,
                        error: true,
                    });
                });

                crawler.start();
            } catch (error) {
                reject(error);
            }
        });
    }
}
