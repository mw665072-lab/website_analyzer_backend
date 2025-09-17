import { analyzeWebsite } from './website/websiteanalyzeutils';
import { SEOAnalysisOrchestrator } from './technical-seo-analyzer/index';

type AnalyzeResult = {
    website: any;
    seo?: { success: boolean; message: string; data?: any; error?: string; timestamp: string };
};

/**
 * Run website analysis and technical SEO analysis in parallel.
 * - Website analysis runs to completion.
 * - SEO analysis is awaited with a timeout; if it times out we continue and return partial result.
 */
export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
    const websitePromise = analyzeWebsite(url);

    const seoAnalyzer = new SEOAnalysisOrchestrator(url);
    const seoPromise = seoAnalyzer.runFullAnalysis();

    const SEO_ANALYSIS_TIMEOUT_MS = Number(process.env.SEO_ANALYSIS_TIMEOUT_MS) || 1000_000;

    // Helper to wrap a promise with timeout and produce a structured result
    const withTimeout = async <T>(p: Promise<T>, timeoutMs: number) => {
        let timer: NodeJS.Timeout | undefined;
        try {
            const result = await Promise.race([
                p,
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error('SEO analysis timeout')), timeoutMs);
                })
            ]);
            return { success: true, data: result } as const;
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) } as const;
        } finally {
            if (timer) clearTimeout(timer as any);
        }
    };

    // Await website analysis (no timeout) and SEO analysis with timeout concurrently
    const [website, seo] = await Promise.all([
        websitePromise,
        withTimeout(seoPromise, SEO_ANALYSIS_TIMEOUT_MS)
    ]);

    const result: AnalyzeResult = { website };

    if (seo.success) {
        // seo.data should contain { results, status } from the orchestrator
        result.seo = {
            success: true,
            message: 'Technical SEO analysis completed',
            data: seo.data,
            timestamp: new Date().toISOString()
        };
    } else {
        // If timed out or failed, attempt to surface any partial data if available on the orchestrator
        // The orchestrator may have thrown; seo.error contains the error message. We include that and mark success=false
        result.seo = {
            success: false,
            message: 'Technical SEO analysis failed or timed out',
            error: seo.error,
            data: undefined,
            timestamp: new Date().toISOString()
        };
    }

    return result;
}


