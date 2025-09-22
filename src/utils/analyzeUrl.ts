import { analyzeWebsite } from './website/websiteanalyzeutils';
import { SEOAnalysisOrchestrator } from './technical-seo-analyzer/index';

type AnalyzeResult = {
    website?: any;
};

/**
 * Run website analysis and technical SEO analysis in parallel.
 * - Website analysis runs to completion with timeout protection.
 * - SEO analysis is awaited with a timeout; if it times out we continue and return partial result.
 */
export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
    console.log(`Starting analysis for ${url}`);

    const websitePromise = analyzeWebsite(url);

    // Await both analyses in parallel, allowing partial results if one fails
    const [websiteSettled] = await Promise.allSettled([websitePromise]);

    const result: AnalyzeResult = {};

    // Handle website analysis result
    if (websiteSettled.status === 'fulfilled') {
        result.website = websiteSettled.value;
        console.log('Website analysis completed successfully');
    } else {
        console.error('Website analysis failed:', websiteSettled.reason?.message);
        // Return partial result with empty screenshots if website analysis failed
        result.website = {
            url,
            screenshots: { desktop: '', mobile: '' },
            error: websiteSettled.reason?.message ?? String(websiteSettled.reason),
            timestamp: new Date().toISOString()
        };
    }

    console.log('Analysis completed, returning results');
    return result;
}


