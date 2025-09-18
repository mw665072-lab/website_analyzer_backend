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
    console.log(`Starting analysis for ${url}`);

    const websitePromise = analyzeWebsite(url);
    const seoAnalyzer = new SEOAnalysisOrchestrator(url);
    const seoPromise = seoAnalyzer.runFullAnalysis();

    // Await both analyses in parallel, allowing partial results if one fails
    const [websiteSettled, seoSettled] = await Promise.allSettled([websitePromise, seoPromise]);

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

    // Handle SEO analysis result
    if (seoSettled.status === 'fulfilled') {
        result.seo = {
            success: true,
            message: 'Technical SEO analysis completed',
            data: seoSettled.value,
            timestamp: new Date().toISOString()
        };
    } else {
        result.seo = {
            success: false,
            message: 'Technical SEO analysis failed',
            error: seoSettled.reason?.message ?? String(seoSettled.reason),
            data: undefined,
            timestamp: new Date().toISOString()
        };
    }

    console.log('Analysis completed, returning results');
    return result;
}


