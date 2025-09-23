import chalk from "chalk";
import Table from "cli-table3";
import readline from "readline";

import { TechnicalSEOAnalyzer } from "./crawler";
import { BrokenLinkChecker } from "./link-checker";
import { SpeedAuditor } from "./speed-audit";
import { MobileScanner } from "./mobile-scanner";
import { RobotsSitemapValidator } from "./validator";
import { SchemaGenerator } from "./schema-generator";
import { SiteArchitectureVisualizer } from "./visualizer";

interface CrawlResults extends Map<string, any> { }

interface BrokenLinksResult {
    broken: { url: string; status: number }[];
    redirects: { url: string; to: string }[];
}

interface SpeedResult {
    performanceScore: number;
    firstContentfulPaint: string;
    largestContentfulPaint: string;
    cumulativeLayoutShift: string;
}

interface MobileResult {
    isMobileFriendly: boolean;
    viewport?: boolean;
    touchIcons?: boolean;
    appropriateFontSize?: boolean;
}

interface ValidationResult {
    robotsTxtExists: boolean;
    missingInSitemap: string[];
}

interface SchemaResult {
    hasSchema: boolean;
    schemas: string[];
}

interface ArchitectureResult {
    [depth: string]: string[];
}

interface AnalysisResults {
    crawl: CrawlResults | null;
    brokenLinks: BrokenLinksResult | null;
    speed: SpeedResult | null;
    mobile: MobileResult | null;
    validation: ValidationResult | null;
    schema: SchemaResult | null;
    architecture: ArchitectureResult | null;
}

type AnalysisStatus = "complete" | "failed" | "skipped" | "timed_out";

export class SEOAnalysisOrchestrator {
    private baseURL: string;
    private results: AnalysisResults;
    private analysisStatus: { [k in keyof AnalysisResults]?: AnalysisStatus };
    private fastMode: boolean;

    constructor(baseURL: string, options?: { fastMode?: boolean }) {
        this.baseURL = baseURL;
        this.fastMode = options?.fastMode || false;
        this.results = {
            crawl: null,
            brokenLinks: null,
            speed: null,
            mobile: null,
            validation: null,
            schema: null,
            architecture: null,
        };

        this.analysisStatus = {
            crawl: "failed",
            brokenLinks: "failed",
            speed: "failed",
            mobile: "failed",
            validation: "failed",
            schema: "failed",
            architecture: "failed",
        };
    }

    async runFullAnalysis(): Promise<{ results: AnalysisResults; status: { [k in keyof AnalysisResults]?: AnalysisStatus } }> {
        console.log(chalk.cyan("\n🚀 Starting Comprehensive Technical SEO Analysis"));
        console.log(chalk.cyan("===============================================\n"));
        const startTime = Date.now();

        try {
            // Step 1: Crawling (required for broken links check)
            const crawlStart = Date.now();
            const crawler = new TechnicalSEOAnalyzer(this.baseURL);
            this.results.crawl = await this.withTimeout(
                crawler.crawl(),
                15000, // 15 second timeout for crawling to ensure completion
                "crawl"
            );
            this.analysisStatus.crawl = "complete";

            // Step 2: Run analyses in parallel
            let parallelAnalyses;

            if (this.fastMode) {
                // Fast mode: skip expensive operations
                parallelAnalyses = await Promise.allSettled([
                    this.runBrokenLinksCheck(),
                    this.runMobileAnalysis(),
                    this.runValidation()
                ]);

                // Mark expensive operations as skipped
                this.analysisStatus.speed = "skipped";
                this.analysisStatus.schema = "skipped";
            } else {
                // Full mode: run all analyses for complete results
                parallelAnalyses = await Promise.allSettled([
                    this.runBrokenLinksCheck(),
                    this.runSpeedAudit(),
                    this.runMobileAnalysis(),
                    this.runValidation(),
                    this.runSchemaAnalysis()
                ]);
            }

            // Step 3: Architecture analysis (depends on crawl results)
            try {
                const visualizer = new SiteArchitectureVisualizer();
                this.results.architecture = visualizer.visualize(this.results.crawl) as unknown as ArchitectureResult;
                this.analysisStatus.architecture = "complete";
            } catch (archError) {
                console.warn(`⚠️ Architecture analysis failed: ${archError}`);
                this.analysisStatus.architecture = "failed";
            }

            console.log(`✅ Analysis completed in ${Date.now() - startTime}ms`);

            this.generateReport();
            return { results: this.results, status: this.analysisStatus };
        } catch (error: any) {
            console.error(chalk.red("Error during SEO analysis:"), error.message);
            throw error;
        }
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]);
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = 2,
        timeoutMs: number = 10000
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                return await this.withTimeout(operation(), timeoutMs, operationName);
            } catch (error) {
                lastError = error as Error;
                if (attempt <= maxRetries && !/timed out/i.test(lastError.message)) {
                    console.log(`${operationName} attempt ${attempt} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                } else {
                    break;
                }
            }
        }

        throw lastError || new Error(`${operationName} failed after ${maxRetries + 1} attempts`);
    }

    private async runBrokenLinksCheck(): Promise<void> {
        try {
            if (!this.results.crawl) {
                this.results.brokenLinks = { broken: [], redirects: [] };
                this.analysisStatus.brokenLinks = "failed";
                return;
            }

            const linkChecker = new BrokenLinkChecker(this.baseURL);
            const rawBrokenLinks = await this.withTimeout(
                linkChecker.checkLinks(this.results.crawl),
                20000, // 20 second timeout for thorough link checking
                "broken links check"
            );
            this.results.brokenLinks = {
                broken: rawBrokenLinks.broken.map((link: any) => ({
                    url: link.url,
                    status: typeof link.status === "string" ? Number(link.status) : link.status,
                })),
                redirects: rawBrokenLinks.redirects.map((redirect: any) => ({
                    url: redirect.url,
                    to: redirect.to,
                })),
            };
            this.analysisStatus.brokenLinks = "complete";
        } catch (linkError) {
            this.results.brokenLinks = { broken: [], redirects: [] };
            const msg = (linkError && (linkError as any).message) || String(linkError);
            this.analysisStatus.brokenLinks = /timeout|timed out/i.test(msg) ? "timed_out" : "failed";
        }
    }

    private async runSpeedAudit(): Promise<void> {
        try {
            const speedAuditor = new SpeedAuditor();
            const speedResult = await this.withRetry(
                () => speedAuditor.audit(this.baseURL),
                "speed audit",
                0, // No retries for speed audit (too expensive)
                60000 // 60 second timeout
            );

            if (speedResult && typeof speedResult.performanceScore === 'number' && speedResult.performanceScore > 1) {
                speedResult.performanceScore = speedResult.performanceScore / 100;
            }

            if (
                speedResult &&
                typeof speedResult.performanceScore === "number" &&
                typeof speedResult.firstContentfulPaint === "string" &&
                typeof speedResult.largestContentfulPaint === "string" &&
                typeof speedResult.cumulativeLayoutShift === "string"
            ) {
                this.results.speed = speedResult;
                this.analysisStatus.speed = "complete";
            } else {
                this.results.speed = null;
                this.analysisStatus.speed = "failed";
            }
        } catch (speedError) {
            const msg = (speedError && (speedError as any).message) || String(speedError);
            this.analysisStatus.speed = /timeout|timed out/i.test(msg) ? "timed_out" : "failed";
            this.results.speed = null;
        }
    }

    private async runMobileAnalysis(): Promise<void> {
        try {
            const mobileScanner = new MobileScanner();
            this.results.mobile = await this.withRetry(
                () => mobileScanner.scan(this.baseURL),
                "mobile analysis",
                1, // 1 retry
                15000 // 15 second timeout
            );
            this.analysisStatus.mobile = "complete";
        } catch (mobileError) {
            const msg = (mobileError && (mobileError as any).message) || String(mobileError);
            this.analysisStatus.mobile = /timeout|timed out/i.test(msg) ? "timed_out" : "failed";
            this.results.mobile = null;
        }
    }

    private async runValidation(): Promise<void> {
        try {
            const validator = new RobotsSitemapValidator(this.baseURL);
            const validationResult = await this.withRetry(
                () => validator.validate(),
                "validation",
                1, // 1 retry
                15000 // 15 second timeout
            );
            this.results.validation = {
                robotsTxtExists: !!validationResult.robotsTxtExists,
                missingInSitemap: Array.isArray(validationResult.missingInSitemap) ? validationResult.missingInSitemap : [],
            };
            this.analysisStatus.validation = 'complete';
        } catch (validationError) {
            this.results.validation = { robotsTxtExists: false, missingInSitemap: [] };
            const msg = (validationError && (validationError as any).message) || String(validationError);
            this.analysisStatus.validation = /timeout|timed out/i.test(msg) ? 'timed_out' : 'failed';
        }
    }

    private async runSchemaAnalysis(): Promise<void> {
        try {
            const schemaGenerator = new SchemaGenerator();
            const schemaCheckResult = await this.withTimeout(
                schemaGenerator.checkSchema(this.baseURL),
                12000, // Increased from 8 seconds to 12 seconds
                "schema analysis"
            );
            this.results.schema = {
                hasSchema: schemaCheckResult.hasSchema,
                schemas: schemaCheckResult.schemas.map((schema: any) =>
                    typeof schema === "string" ? schema : schema.type || schema.name || JSON.stringify(schema)
                ),
            };
            this.analysisStatus.schema = "complete";
        } catch (schemaError) {
            const msg = (schemaError && (schemaError as any).message) || String(schemaError);
            this.analysisStatus.schema = /timeout|timed out/i.test(msg) ? "timed_out" : "failed";
            this.results.schema = null;
        }
    }

    private generateReport(): void {
        // Simplified reporting - only show critical info to reduce overhead
        const pagesCrawled = this.results.crawl?.size || 0;
        const brokenLinks = this.results.brokenLinks?.broken?.length || 0;
        const speedScore = this.results.speed ? Math.round(this.results.speed.performanceScore * 100) : null;
        const isMobileFriendly = this.results.mobile?.isMobileFriendly || false;

        console.log(chalk.cyan("\n📊 SEO Analysis Summary"));
        console.log(`Pages: ${pagesCrawled} | Broken: ${brokenLinks} | Speed: ${speedScore || 'N/A'} | Mobile: ${isMobileFriendly ? '✓' : '✗'}`);
    }

    private showDetailedFindings(): void {
        // Only show critical issues to reduce console overhead
        if (this.results.brokenLinks?.broken.length) {
            console.log(chalk.red(`\n❌ ${this.results.brokenLinks.broken.length} broken links found`));
            // Show only first 2 broken links
            this.results.brokenLinks.broken.slice(0, 2).forEach((link) => {
                console.log(`  ${link.url} (${link.status})`);
            });
        }

        if (this.results.mobile && !this.results.mobile.isMobileFriendly) {
            console.log(chalk.yellow("\n📱 Mobile optimization issues detected"));
        }
    }
}

// CLI Runner
if (require.main === module) {
    const url = process.argv[2];
    const fastMode = process.argv.includes('--fast') || process.argv.includes('-f');

    if (!url) {
        console.log(chalk.red("Please provide a URL to analyze"));
        console.log(chalk.yellow("Usage: ts-node index.ts <url> [--fast]"));
        console.log(chalk.yellow("  --fast: Skip expensive operations like Lighthouse speed audit"));
        process.exit(1);
    }

    console.log(chalk.cyan(`Starting Technical SEO Analysis for: ${url}`));
    if (fastMode) {
        console.log(chalk.yellow("🚀 Fast mode enabled - skipping expensive operations (speed audit & schema)"));
    }

    const analyzer = new SEOAnalysisOrchestrator(url, { fastMode });
    analyzer
        .runFullAnalysis()
        .then((res) => {
            // Print a compact JSON summary for CLI consumers
            try {
                // Avoid flooding the console: print keys and status summary
                const summary = {
                    pagesCrawled: res.results.crawl ? res.results.crawl.size : 0,
                    brokenLinks: res.results.brokenLinks ? res.results.brokenLinks.broken.length : 0,
                    speedScore: res.results.speed ? Math.round(res.results.speed.performanceScore * 100) : null,
                    mobileFriendly: res.results.mobile ? res.results.mobile.isMobileFriendly : null,
                };
                console.log(chalk.green('\nAnalysis result summary:'), JSON.stringify(summary, null, 2));
            } catch (e) {
                console.log(chalk.yellow('Analysis completed (could not serialize summary)'));
            }
            readline.createInterface({ input: process.stdin, output: process.stdout }).close();
            process.exit(0);
        })
        .catch((error) => {
            console.error(chalk.red("Analysis failed:"), error);
            process.exit(1);
        });
}


module.exports = { TechnicalSEOAnalyzer, SEOAnalysisOrchestrator };
