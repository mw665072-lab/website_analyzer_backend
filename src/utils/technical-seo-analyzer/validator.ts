import axios from "axios";
import robotsParser from "robots-parser";
import * as cheerio from "cheerio";

interface ValidationResult {
    robotsTxtExists: boolean;
    sitemapExists: boolean;
    sitemapURLs: string[];
    missingInSitemap: string[];
}

class RobotsSitemapValidator {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async fetchSitemap(url: string): Promise<string | null> {
        try {
            const res = await axios.get<string>(url, {
                validateStatus: null,
                timeout: 10000, // 10 second timeout for each request
                maxRedirects: 3,
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; AnalyzerBot/1.0)"
                }
            });
            return res.status === 200 && typeof res.data === "string" ? res.data : null;
        } catch {
            return null;
        }
    }

    private parseSitemap(xml: string): string[] {
        const $ = cheerio.load(xml, { xmlMode: true });
        return $("url > loc").map((_, el) => $(el).text()).get();
    }

    async validate(): Promise<ValidationResult> {
        let robotsTxtExists = false;
        let sitemapExists = false;
        let sitemapURLs: string[] = [];
        const robotsURL = new URL("/robots.txt", this.baseURL).href;
        const robotsBody = await this.fetchSitemap(robotsURL);
        if (robotsBody !== null) {
            robotsTxtExists = true;
            const robots = robotsParser(robotsURL, robotsBody);
            const sitemapFromRobots = robots.getSitemaps()[0];
            const sitemapURL = sitemapFromRobots || new URL("/sitemap.xml", this.baseURL).href;
            const sitemapBody = await this.fetchSitemap(sitemapURL);
            if (sitemapBody !== null) {
                sitemapExists = true;
                sitemapURLs = this.parseSitemap(sitemapBody);
            }
        } else {
            const defaultSitemap = new URL("/sitemap.xml", this.baseURL).href;
            const sitemapBody = await this.fetchSitemap(defaultSitemap);
            if (sitemapBody !== null) {
                sitemapExists = true;
                sitemapURLs = this.parseSitemap(sitemapBody);
            }
        }

        return { robotsTxtExists, sitemapExists, sitemapURLs, missingInSitemap: [] };
    }
}

export { RobotsSitemapValidator, ValidationResult };
