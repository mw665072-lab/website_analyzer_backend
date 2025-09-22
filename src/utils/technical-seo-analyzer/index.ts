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

interface CrawlResults extends Map<string, any> {}

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

    constructor(baseURL: string) {
        this.baseURL = baseURL;
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
            // console.log(chalk.blue("🌐 Crawling website structure..."));
            const crawlStart = Date.now();
            const crawler = new TechnicalSEOAnalyzer(this.baseURL);
            this.results.crawl = await crawler.crawl();
            this.analysisStatus.crawl = "complete";
            // console.log(`✅ Crawling completed in ${Date.now() - crawlStart}ms`);

            // console.log(chalk.blue("🔗 Checking for broken links and redirects..."));
            const linkStart = Date.now();

            try {
                const linkChecker = new BrokenLinkChecker(this.baseURL);
                const rawBrokenLinks = await linkChecker.checkLinks(this.results.crawl);
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
                // console.log(`✅ Link checking completed in ${Date.now() - linkStart}ms - Found ${this.results.brokenLinks.broken.length} broken links and ${this.results.brokenLinks.redirects.length} redirects.`);
            } catch (linkError) {
                // console.warn(`⚠️ Link checking failed or timed out: ${linkError}`);
                this.results.brokenLinks = { broken: [], redirects: [] };
                const msg = (linkError && (linkError as any).message) || String(linkError);
                this.analysisStatus.brokenLinks = /timeout|timed out/i.test(msg) ? "timed_out" : "failed";
            }

            // console.log(chalk.blue('⏱️  Analyzing page speed...'));
            const speedStart = Date.now();
            try {
                const speedAuditor = new SpeedAuditor();
                const speedResult = await speedAuditor.audit(this.baseURL);
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
                    // console.log(`✅ Page speed audit completed in ${Date.now() - speedStart}ms`);
                } else {
                    console.warn(`⚠️ Page speed audit returned an error or incomplete result: ${speedResult?.error || "Unknown error"}`);
                    this.results.speed = null;
                    this.analysisStatus.speed = "failed";
                }
            } catch (speedError) {
                console.warn(`⚠️ Page speed audit failed: ${speedError}`);
                const msg = (speedError && (speedError as any).message) || String(speedError);
                this.analysisStatus.speed = /timeout|timed out/i.test(msg) ? "timed_out" : "failed";
                this.results.speed = null;
            }

            // console.log(chalk.blue("⏱️  Skipping additional analyses to stay within timeout limits..."));

            ["mobile", "validation", "schema", "architecture"].forEach((k) => {
                (this.analysisStatus as any)[k] = "skipped";
            });

            // console.log(chalk.blue('📱 Checking mobile optimization...'));
            const mobileScanner = new MobileScanner();
            this.results.mobile = await mobileScanner.scan(this.baseURL);

            // console.log(chalk.blue('📋 Validating robots.txt and sitemap...'));
            try {
                const validator = new RobotsSitemapValidator(this.baseURL);
                const validationResult = await validator.validate();
                this.results.validation = {
                    robotsTxtExists: !!validationResult.robotsTxtExists,
                    missingInSitemap: Array.isArray(validationResult.missingInSitemap) ? validationResult.missingInSitemap : [],
                };
                this.analysisStatus.validation = 'complete';
            } catch (validationError) {
                console.warn(`⚠️ Validation step failed: ${validationError}`);
                this.results.validation = { robotsTxtExists: false, missingInSitemap: [] };
                const msg = (validationError && (validationError as any).message) || String(validationError);
                this.analysisStatus.validation = /timeout|timed out/i.test(msg) ? 'timed_out' : 'failed';
            }

            console.log(chalk.blue('🏷️  Checking schema markup...'));
            const schemaGenerator = new SchemaGenerator();
            const schemaCheckResult = await schemaGenerator.checkSchema(this.baseURL);
            this.results.schema = {
                hasSchema: schemaCheckResult.hasSchema,
                schemas: schemaCheckResult.schemas.map((schema: any) => typeof schema === "string" ? schema : schema.type || schema.name || JSON.stringify(schema)),
            };

            // console.log(chalk.blue('🏗️  Analyzing site architecture...'));
            const visualizer = new SiteArchitectureVisualizer();
            this.results.architecture = visualizer.visualize(this.results.crawl) as unknown as ArchitectureResult;

            console.log(`✅ Analysis completed in ${Date.now() - startTime}ms`);

            this.generateReport();
            // Return the raw results and status so callers (e.g. HTTP handlers) can send structured data to frontends
            return { results: this.results, status: this.analysisStatus };
        } catch (error: any) {
            console.error(chalk.red("Error during SEO analysis:"), error.message);
            // Re-throw so callers can handle errors (and we don't swallow them here)
            throw error;
        }
    }

    private generateReport(): void {
        console.log(chalk.cyan("\n📊 Technical SEO Analysis Report"));
        console.log(chalk.cyan("================================\n"));

        const summaryTable = new Table({
            head: [chalk.white("Category"), chalk.white("Status"), chalk.white("Details")],
            colWidths: [20, 15, 45],
        });

        summaryTable.push(
            [
                "Crawl",
                this.results.crawl ? chalk.green("Complete") : chalk.red("Failed"),
                `${this.results.crawl?.size || 0} pages found`,
            ],
            [
                "Broken Links",
                this.results.brokenLinks ? chalk.green("Complete") : chalk.red("Failed"),
                `${this.results.brokenLinks?.broken?.length || 0} broken, ${this.results.brokenLinks?.redirects?.length || 0
                } redirects`,
            ],
            [
                "Page Speed",
                this.results.speed ? chalk.green("Complete") : chalk.red("Failed"),
                this.results.speed
                    ? `${Math.round(this.results.speed.performanceScore * 100)}/100`
                    : "N/A",
            ],
            [
                "Mobile",
                this.results.mobile ? chalk.green("Complete") : chalk.red("Failed"),
                this.results.mobile?.isMobileFriendly
                    ? chalk.green("Mobile-friendly")
                    : chalk.red("Not optimized"),
            ],
            [
                "Validation",
                this.results.validation ? chalk.green("Complete") : chalk.red("Failed"),
                this.results.validation?.robotsTxtExists
                    ? "Robots.txt ✓"
                    : "Robots.txt ✗",
            ],
            [
                "Schema",
                this.results.schema ? chalk.green("Complete") : chalk.red("Failed"),
                this.results.schema?.hasSchema
                    ? `${this.results.schema.schemas.length} schema types`
                    : "No schema found",
            ],
            [
                "Architecture",
                this.results.architecture ? chalk.green("Complete") : chalk.red("Failed"),
                `${Object.keys(this.results.architecture || {}).length} depth levels`,
            ]
        );

        // console.log(summaryTable.toString());

        this.showDetailedFindings();
    }

    private showDetailedFindings(): void {
        if (this.results.brokenLinks?.broken.length) {
            console.log(chalk.red("\n❌ Broken Links:"));
            this.results.brokenLinks.broken.slice(0, 5).forEach((link) => {
                console.log(`  ${link.url} (${link.status})`);
            });
            if (this.results.brokenLinks.broken.length > 5) {
                console.log(
                    `  ... and ${this.results.brokenLinks.broken.length - 5} more`
                );
            }
        }

        // if (this.results.speed) {
        //     console.log(chalk.blue("\n⏱️  Page Speed Insights:"));
        //     console.log(
        //         `  Performance Score: ${Math.round(
        //             this.results.speed.performanceScore * 100
        //         )}/100`
        //     );
        //     console.log(`  First Contentful Paint: ${this.results.speed.firstContentfulPaint}`);
        //     console.log(`  Largest Contentful Paint: ${this.results.speed.largestContentfulPaint}`);
        //     console.log(`  Cumulative Layout Shift: ${this.results.speed.cumulativeLayoutShift}`);
        // }

        if (this.results.mobile && !this.results.mobile.isMobileFriendly) {
            // console.log(chalk.yellow("\n📱 Mobile Optimization Issues:"));
            if (!this.results.mobile.viewport) console.log("  ❌ Viewport meta tag missing");
            if (!this.results.mobile.touchIcons) console.log("  ❌ Touch icons missing");
            if (!this.results.mobile.appropriateFontSize) console.log("  ❌ Font size too small");
        }

        if (this.results.validation) {
            if (!this.results.validation.robotsTxtExists) {
                // console.log(chalk.yellow("\n📋 Missing robots.txt file"));
            }
            if (this.results.validation.missingInSitemap.length > 0) {
                // console.log(chalk.yellow("\n📋 Pages missing from sitemap:"));
                this.results.validation.missingInSitemap.slice(0, 3).forEach((page) => {
                    console.log(`  ${page}`);
                });
            }
        }
    }
}

// CLI Runner
if (require.main === module) {
    const url = process.argv[2];

    if (!url) {
        console.log(chalk.red("Please provide a URL to analyze"));
        console.log(chalk.yellow("Usage: ts-node index.ts <url>"));
        process.exit(1);
    }

    console.log(chalk.cyan(`Starting Technical SEO Analysis for: ${url}`));

    const analyzer = new SEOAnalysisOrchestrator(url);
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
