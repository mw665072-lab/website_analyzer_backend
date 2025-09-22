import { Request, Response } from 'express';
import crypto from 'crypto';
import { RedirectChecker } from '../services/redirectCheckerService';
import { ssrfCheck } from '../utils/ssrf';
import { RedirectCheckRequest, RedirectCheckResponse, RedirectResult } from '../types/analyzeUrlTypes';
import { Logger, MetricsCollector, RateLimiter } from '../utils/rateLimiter/rateLimiter';


const DEFAULT_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS) || 280_000;
const MAX_REDIRECTS = Number(process.env.MAX_REDIRECTS) || 20;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 50;

// Initialize services
const rateLimiter = new RateLimiter(RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS);
const metrics = new MetricsCollector();
const logger = new Logger('redirect-checker');

interface ErrorResponse {
    error: string;
    code: string;
    timestamp: string;
    reportId?: string;
    details?: unknown;
    suggestion?: string;
}

interface RedirectAnalysis {
    totalRedirects: number;
    finalUrl: string;
    finalStatus: number | null;
    hasRedirects: boolean;
    redirectTypes: Array<'http' | 'meta-refresh' | 'javascript'>;
    securityIssues: Array<'mixed-content' | 'domain-change' | 'suspicious-redirect' | 'too-many-redirects'>;
    performanceMetrics: {
        totalTime: number;
        averageResponseTime: number;
        slowestStep: number;
        fastestStep: number;
    };
    seoIssues: Array<'redirect-chain-too-long' | 'temporary-redirect-in-chain' | 'multiple-redirects' | 'redirect-loop'>;
    domainChanges: Array<{ from: string; to: string; step: number }>;
    statusCodes: Array<{ step: number; status: number; url: string }>;
    // Optional suggestion to flatten the chain (from -> to)
    canonicalRedirect?: { from: string; to: string };
}

function makeErrorResponse(
    code: string,
    message: string,
    reportId?: string,
    details?: unknown,
    suggestion?: string
): ErrorResponse {
    const payload: ErrorResponse = {
        error: message,
        code,
        timestamp: new Date().toISOString(),
        ...(reportId && { reportId }),
        ...(suggestion && { suggestion })
    };

    if (process.env.NODE_ENV === 'development' && details) {
        payload.details = details;
    }

    return payload;
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function stripWww(hostname: string): string {
    return hostname.replace(/^www\./i, '').toLowerCase();
}

function hasMetaRefresh(html: string): boolean {
    return /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?/i.test(html);
}

function hasJavaScriptRedirect(html: string): boolean {
    const jsRedirectPatterns = [
        /window\.location\s*=\s*["']/i,
        /location\.href\s*=\s*["']/i,
        /location\.replace\s*\(/i,
        /document\.location\s*=\s*["']/i
    ];
    return jsRedirectPatterns.some(pattern => pattern.test(html));
}

function analyzeRedirectChain(redirectChain: RedirectResult[]): RedirectAnalysis {
    const startTime = Date.now();
    const totalRedirects = Math.max(0, redirectChain.length - 1);
    const finalResult = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1] : null;
    // If finalResult indicates error, prefer last successful or original
    let finalUrl = '';
    let finalStatus: number | null = null;
    if (finalResult) {
        finalUrl = finalResult.error ? (redirectChain.find(r => !r.error)?.url || redirectChain[0].url) : finalResult.url;
        finalStatus = finalResult.status || null;
    }
    const hasRedirects = totalRedirects > 0;

    // Analyze redirect types
    const redirectTypes: Array<'http' | 'meta-refresh' | 'javascript'> = [];
    const securityIssues: Array<'mixed-content' | 'domain-change' | 'suspicious-redirect' | 'too-many-redirects'> = [];
    const seoIssues: Array<'redirect-chain-too-long' | 'temporary-redirect-in-chain' | 'multiple-redirects' | 'redirect-loop'> = [];
    const domainChanges: Array<{ from: string; to: string; step: number }> = [];
    const statusCodes: Array<{ step: number; status: number; url: string }> = [];
    const responseTimes: number[] = [];

    let previousDomain = '';

    // Detect loops by tracking seen normalized URLs
    const seen = new Map<string, number>();

    redirectChain.forEach((result, index) => {
        const currentDomain = extractDomain(result.url);

        // Track status codes
        if (result.status) {
            statusCodes.push({ step: index + 1, status: result.status, url: result.url });
        }

        // Track response times
        if (result.responseTime) {
            responseTimes.push(result.responseTime);
        }

        // Analyze redirect types (for non-final steps)
        if (index < redirectChain.length - 1) {
            if (result.status && result.status >= 300 && result.status < 400) {
                if (!redirectTypes.includes('http')) redirectTypes.push('http');

                // Check for temporary redirects in chain
                if ([302, 307].includes(result.status)) {
                    if (!seoIssues.includes('temporary-redirect-in-chain')) {
                        seoIssues.push('temporary-redirect-in-chain');
                    }
                }
            }

            if (result.html) {
                if (hasMetaRefresh(result.html) && !redirectTypes.includes('meta-refresh')) {
                    redirectTypes.push('meta-refresh');
                }
                if (hasJavaScriptRedirect(result.html) && !redirectTypes.includes('javascript')) {
                    redirectTypes.push('javascript');
                }
            }
        }

        // Track domain changes
        if (previousDomain && stripWww(currentDomain) !== stripWww(previousDomain)) {
            domainChanges.push({
                from: previousDomain,
                to: currentDomain,
                step: index + 1
            });

            if (!securityIssues.includes('domain-change')) {
                securityIssues.push('domain-change');
            }

            // Check for mixed content (HTTPS to HTTP)
            if (redirectChain[index - 1]?.url.startsWith('https://') && result.url.startsWith('http://')) {
                if (!securityIssues.includes('mixed-content')) {
                    securityIssues.push('mixed-content');
                }
            }
        }

        previousDomain = currentDomain;
    });

    // Loop detection: simple check for repeated URLs in chain
    const normalizedChainUrls = redirectChain.map(r => r.url.split('#')[0]);
    const hasLoop = normalizedChainUrls.some((u, i) => normalizedChainUrls.indexOf(u) !== i);
    if (hasLoop && !seoIssues.includes('redirect-loop')) {
        seoIssues.push('redirect-loop');
    }

    // Additional security and SEO checks
    if (totalRedirects > MAX_REDIRECTS) {
        securityIssues.push('too-many-redirects');
    }

    if (totalRedirects > 3) {
        seoIssues.push('redirect-chain-too-long');
    }

    if (totalRedirects > 1) {
        seoIssues.push('multiple-redirects');
    }

    // Check for suspicious redirects (domain changes to potentially malicious domains)
    const suspiciousDomains = process.env.SUSPICIOUS_DOMAINS?.split(',') || [];
    if (suspiciousDomains.some(domain => domain && finalUrl.includes(domain.trim()))) {
        securityIssues.push('suspicious-redirect');
    }

    // Suggest a canonical redirect if chain can be flattened (simple heuristic)
    let canonicalRedirect: { from: string; to: string } | undefined = undefined;
    try {
        if (redirectChain.length > 1) {
            const first = redirectChain[0]?.url;
            const last = finalUrl;
            if (first && last && stripWww(extractDomain(first)) === stripWww(extractDomain(last))) {
                canonicalRedirect = { from: first, to: last };
            }
        }
    } catch {
        // ignore
    }

    // Performance metrics
    const totalTime = responseTimes.reduce((sum, time) => sum + time, 0);
    const averageResponseTime = responseTimes.length > 0 ? totalTime / responseTimes.length : 0;
    const slowestStep = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const fastestStep = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

    return {
        totalRedirects,
        finalUrl,
        finalStatus,
        hasRedirects,
        redirectTypes,
        securityIssues,
        seoIssues,
        domainChanges,
        statusCodes,
        performanceMetrics: {
            totalTime,
            averageResponseTime,
            slowestStep,
            fastestStep
        }
        ,
        // @ts-ignore allow optional extra hint
        canonicalRedirect
    };
}

export const redirectCheckerController = {
    async handleRedirectCheck(req: Request<{}, {}, RedirectCheckRequest>, res: Response) {
        const startTime = Date.now();
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        // Rate limiting
        const rateLimitResult = await rateLimiter.checkLimit(clientIP);
        if (!rateLimitResult.allowed) {
            metrics.incrementCounter('requests_rate_limited');
            return res.status(429).json(
                makeErrorResponse(
                    'RATE_LIMIT_EXCEEDED',
                    'Too many requests. Please try again later.',
                    undefined,
                    undefined,
                    `Limit: ${RATE_LIMIT_MAX_REQUESTS} requests per minute`
                )
            );
        }

        const urlRaw = req.body?.url;
        const options = req.body?.options ?? {};

        // Basic options validation and defaults
        const validatedOptions: any = {
            maxRedirects: Math.min(Number(options.maxRedirects) || MAX_REDIRECTS, MAX_REDIRECTS),
            timeout: Math.min(Number(options.timeout) || 30000, 60000),
            followMetaRefresh: options.followMetaRefresh === undefined ? true : Boolean(options.followMetaRefresh),
            // align with RedirectChecker option names; extra options will be ignored by the service
            followJavaScriptRedirects: options.followJavaScriptRedirects === undefined ? false : Boolean(options.followJavaScriptRedirects),
            validateSSL: options.validateSSL === undefined ? true : Boolean(options.validateSSL),
            headers: typeof options.headers === 'object' ? options.headers : undefined,
            userAgent: typeof options.userAgent === 'string' ? options.userAgent : undefined
        };

        // Enhanced validation
        if (typeof urlRaw !== 'string') {
            metrics.incrementCounter('requests_invalid_payload');
            return res.status(400).json(
                makeErrorResponse(
                    'INVALID_PAYLOAD',
                    'Request body must include a string `url` field',
                    undefined,
                    undefined,
                    'Ensure your request includes a valid URL string in the body'
                )
            );
        }

        const normalized = (typeof urlRaw === 'string' ? urlRaw.trim() : '');
        if (!normalized) {
            metrics.incrementCounter('requests_invalid_url');
            return res.status(400).json(
                makeErrorResponse(
                    'INVALID_URL',
                    'Please provide a valid HTTP or HTTPS URL',
                    undefined,
                    undefined,
                    'URL must start with http:// or https:// and be properly formatted'
                )
            );
        }

        if (!ssrfCheck.isValidHttpUrl(normalized)) {
            metrics.incrementCounter('requests_invalid_url');
            return res.status(400).json(
                makeErrorResponse(
                    'INVALID_URL',
                    'Please provide a valid HTTP or HTTPS URL',
                    undefined,
                    undefined,
                    'URL must start with http:// or https:// and be properly formatted'
                )
            );
        }

        // Additional security checks
        let isPrivate = false;
        try {
            const urlObj = new URL(normalized);
            const hostname = urlObj.hostname;
            // Check if hostname is an IP address and if it's private
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
                isPrivate = ssrfCheck.isPrivateIP(hostname);
            }
        } catch {
            // Ignore parsing errors, already validated above
        }
        if (isPrivate) {
            metrics.incrementCounter('requests_blocked_private');
            return res.status(400).json(
                makeErrorResponse(
                    'PRIVATE_NETWORK_BLOCKED',
                    'Requests to private networks are not allowed',
                    undefined,
                    undefined,
                    'Only public URLs can be analyzed'
                )
            );
        }

        const reportId = crypto.randomUUID();

        // Enhanced headers
        res.setHeader('X-Report-Id', reportId);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Rate-Limit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
        res.setHeader('X-Rate-Limit-Remaining', (rateLimitResult.remaining || 0).toString());

        const logMeta = {
            reportId,
            url: normalized,
            clientIP,
            userAgent: userAgent.substring(0, 100) // Truncate for logging
        };

        logger.info('redirect-check:start', logMeta);
        metrics.incrementCounter('requests_started');

        const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                reject(new Error('Request timeout'));
            }, DEFAULT_TIMEOUT_MS);
        });

        try {
            // Try variants for robustness: as-provided, scheme swap, www/non-www, and trailing slash permutations
            const variants = new Set<string>();
            variants.add(normalized);
            try {
                const u = new URL(normalized);
                const basePath = u.pathname || '/';
                const search = u.search || '';
                const hash = u.hash || '';

                // Build host permutations including www and non-www, preserve port if present
                const hostNoWww = stripWww(u.hostname);
                const portSuffix = u.port ? `:${u.port}` : '';
                const rawHosts = [u.hostname, 'www.' + hostNoWww, hostNoWww];
                const hosts = new Set<string>(rawHosts.map(h => h + portSuffix));

                // Try both protocols (http and https) for each host to ensure we check from www and both schemes
                const protocols = new Set<string>([u.protocol, u.protocol === 'https:' ? 'http:' : 'https:']);

                // Path permutations (trailing slash)
                const paths = new Set<string>([basePath]);
                if (basePath.endsWith('/')) {
                    paths.add(basePath.replace(/\/+$/, ''));
                } else {
                    paths.add(basePath + '/');
                }

                for (const proto of protocols) {
                    for (const host of hosts) {
                        // base path with search/hash
                        variants.add(proto + '//' + host + basePath + search + hash);
                        for (const path of paths) {
                            variants.add(proto + '//' + host + path + search + hash);
                        }
                    }
                }
            } catch (e) {
                // ignore
            }

            let lastError: any = null;
            let redirectChain: any = [];
            const variantReports: Array<{
                candidate: string;
                success: boolean;
                error?: string;
                chainLength?: number;
                finalUrl?: string;
                finalStatus?: number | null;
                responseTimeMs?: number;
            }> = [];

            // Try all variants but prefer the first successful one for main analysis.
            for (const candidate of variants) {
                const checker = new RedirectChecker({
                    ...validatedOptions
                });
                const variantStart = Date.now();
                try {
                    const resultChain = await Promise.race([checker.check(candidate), timeoutPromise]);
                    const variantTime = Date.now() - variantStart;

                    // record success report for this variant
                    variantReports.push({
                        candidate,
                        success: true,
                        chainLength: Array.isArray(resultChain) ? Math.max(0, resultChain.length - 1) : 0,
                        finalUrl: resultChain && resultChain.length ? resultChain[resultChain.length - 1].url : candidate,
                        finalStatus: resultChain && resultChain.length ? resultChain[resultChain.length - 1].status || null : null,
                        responseTimeMs: variantTime
                    });

                    // pick this as the main redirectChain if we don't already have one
                    if (!redirectChain || redirectChain.length === 0) {
                        redirectChain = resultChain;
                        // don't break: continue trying other variants to collect their reports
                    }
                } catch (e: any) {
                    lastError = e;
                    const variantTime = Date.now() - variantStart;
                    variantReports.push({
                        candidate,
                        success: false,
                        error: e?.message || String(e),
                        responseTimeMs: variantTime
                    });
                    logger.info('redirect-check:variant-failed', { reportId, candidate, message: e?.message });
                }
            }

            if (!redirectChain || redirectChain.length === 0) {
                // no successful variant
                throw lastError || new Error('Failed to fetch URL');
            }

            // Enhanced analysis
            const analysis = analyzeRedirectChain(redirectChain);
            const processingTime = Date.now() - startTime;

            // Prepare enhanced response
            const responsePayload: RedirectCheckResponse & { variantReports?: unknown } = {
                reportId,
                status: 'completed',
                analyzedUrl: normalized,
                analysisTimestamp: new Date().toISOString(),
                redirectChain,
                summary: {
                    ...analysis,
                    processingTime,
                    checksPerformed: [
                        'redirect-chain',
                        'status-codes',
                        'domain-changes',
                        'security-issues',
                        'seo-issues',
                        'performance-metrics'
                    ]
                }
            };

            // attach per-variant reports for transparency
            (responsePayload as any).variantReports = variantReports;

            // Log metrics
            metrics.recordHistogram('request_processing_time', processingTime);
            metrics.recordHistogram('redirect_chain_length', analysis.totalRedirects);
            metrics.incrementCounter('requests_completed');

            logger.info('redirect-check:completed', {
                ...logMeta,
                processingTime,
                totalRedirects: analysis.totalRedirects,
                securityIssues: analysis.securityIssues.length,
                seoIssues: analysis.seoIssues.length
            });

            return res.status(200).json(responsePayload);

        } catch (err: any) {
            const processingTime = Date.now() - startTime;
            const errorMessage = err?.message || 'Unknown error';

            logger.error('redirect-check:error', {
                ...logMeta,
                processingTime,
                message: errorMessage,
                stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
            });

            metrics.incrementCounter('requests_failed');
            metrics.recordHistogram('failed_request_processing_time', processingTime);

            // Enhanced error handling with specific suggestions
            if (errorMessage.toLowerCase().includes('timeout')) {
                return res.status(408).json(
                    makeErrorResponse(
                        'TIMEOUT_ERROR',
                        'Request timeout - the website took too long to respond',
                        reportId,
                        errorMessage,
                        'Try checking a different URL or contact the website administrator'
                    )
                );
            }

            if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
                return res.status(404).json(
                    makeErrorResponse(
                        'WEBSITE_UNREACHABLE',
                        'Website not found or unreachable',
                        reportId,
                        errorMessage,
                        'Verify the URL is correct and the website is online'
                    )
                );
            }

            if (errorMessage.includes('CERT_') || errorMessage.includes('certificate')) {
                return res.status(502).json(
                    makeErrorResponse(
                        'SSL_ERROR',
                        'SSL certificate error',
                        reportId,
                        errorMessage,
                        'The website has SSL certificate issues. Contact the website administrator.'
                    )
                );
            }

            if (errorMessage.includes('Failed to fetch URL')) {
                return res.status(502).json(
                    makeErrorResponse(
                        'FETCH_ERROR',
                        'Unable to fetch website content',
                        reportId,
                        errorMessage,
                        'The website may be blocking automated requests or experiencing issues'
                    )
                );
            }

            if (errorMessage.includes('Invalid URL')) {
                return res.status(400).json(
                    makeErrorResponse(
                        'INVALID_URL',
                        'Invalid URL provided',
                        reportId,
                        errorMessage,
                        'Ensure the URL is properly formatted with http:// or https://'
                    )
                );
            }

            if (errorMessage.includes('Too many redirects')) {
                return res.status(400).json(
                    makeErrorResponse(
                        'TOO_MANY_REDIRECTS',
                        'Redirect loop detected or too many redirects',
                        reportId,
                        errorMessage,
                        `Maximum ${MAX_REDIRECTS} redirects allowed to prevent loops`
                    )
                );
            }

            // Generic server error
            return res.status(500).json(
                makeErrorResponse(
                    'INTERNAL_ERROR',
                    'Internal server error',
                    reportId,
                    errorMessage,
                    'Please try again later or contact support if the issue persists'
                )
            );
        }
    },

    // Health check endpoint
    async healthCheck(req: Request, res: Response) {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            limits: {
                maxRedirects: MAX_REDIRECTS,
                timeoutMs: DEFAULT_TIMEOUT_MS,
                rateLimitPerMinute: RATE_LIMIT_MAX_REQUESTS
            }
        };

        res.status(200).json(health);
    },

    // Get metrics endpoint (for monitoring)
    async getMetrics(req: Request, res: Response) {
        try {
            const metricsData = await metrics.getMetrics();
            res.status(200).json(metricsData);
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve metrics' });
        }
    }
};