import { analyzeWebsite } from './website/websiteanalyzeutils';
import { SEOAnalysisOrchestrator } from './technical-seo-analyzer/index';

type AnalyzeResult = {
    website?: any;
    seo?: { success: boolean; message: string; data?: any; error?: string; timestamp: string };
};

/**
 * Run website analysis and technical SEO analysis in parallel.
 * - Website analysis runs to completion with timeout protection.
 * - SEO analysis is awaited with a timeout; if it times out we continue and return partial result.
 */
export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
    // Use environment-specific timeouts
    const WEBSITE_ANALYSIS_TIMEOUT_MS = Number(process.env.WEBSITE_ANALYSIS_TIMEOUT_MS) || 240_000; // 4 minutes default
    const SEO_ANALYSIS_TIMEOUT_MS = Number(process.env.SEO_ANALYSIS_TIMEOUT_MS) || 180_000; // 3 minutes default
    
    console.log(`Starting analysis for ${url} with timeouts: website=${WEBSITE_ANALYSIS_TIMEOUT_MS}ms, seo=${SEO_ANALYSIS_TIMEOUT_MS}ms`);

    // Helper to wrap a promise with timeout and produce a structured result
    const withTimeout = async <T>(p: Promise<T>, timeoutMs: number, name: string) => {
        let timer: NodeJS.Timeout | undefined;
        const timeoutStart = Date.now();
        try {
            const result = await Promise.race([
                p,
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs);
                })
            ]);
            const duration = Date.now() - timeoutStart;
            console.log(`${name} completed successfully in ${duration}ms`);
            return { success: true, data: result } as const;
        } catch (err: any) {
            const duration = Date.now() - timeoutStart;
            console.error(`${name} failed after ${duration}ms:`, err?.message);
            return { success: false, error: err?.message ?? String(err) } as const;
        } finally {
            if (timer) clearTimeout(timer);
        }
    };

    const websitePromise = analyzeWebsite(url);
    const seoAnalyzer = new SEOAnalysisOrchestrator(url);
    const seoPromise = seoAnalyzer.runFullAnalysis();

    // Await both analyses with their respective timeouts
    const [website, seo] = await Promise.all([
        withTimeout(websitePromise, WEBSITE_ANALYSIS_TIMEOUT_MS, 'Website analysis'),
        withTimeout(seoPromise, SEO_ANALYSIS_TIMEOUT_MS, 'SEO analysis')
    ]);

    const result: AnalyzeResult = {};

    // Handle website analysis result
    if (website.success) {
        result.website = website.data;
        console.log('Website analysis data included in response');
    } else {
        console.error('Website analysis failed:', website.error);
        // Return partial result with empty screenshots if website analysis failed
        result.website = {
            url,
            screenshots: { desktop: '', mobile: '' },
            error: website.error,
            timestamp: new Date().toISOString()
        };
    }

    // Handle SEO analysis result
    if (seo.success) {
        result.seo = {
            success: true,
            message: 'Technical SEO analysis completed',
            data: seo.data,
            timestamp: new Date().toISOString()
        };
    } else {
        result.seo = {
            success: false,
            message: 'Technical SEO analysis failed or timed out',
            error: seo.error,
            data: undefined,
            timestamp: new Date().toISOString()
        };
    }

    console.log('Analysis completed, returning results');
    return result;
}


