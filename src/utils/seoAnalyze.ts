import { SEOAnalysisOrchestrator } from './technical-seo-analyzer/index';

export async function seoanalyzeUrl(url: string): Promise<any> {

    const seoAnalyzer = new SEOAnalysisOrchestrator(url);
    const seoPromise = seoAnalyzer.runFullAnalysis();
    const seoSettledResult: any = await Promise.allSettled([seoPromise]);
    const seoSettled = seoSettledResult[0];
    // Log a concise start/finish message
    console.log(`SEO analysis settled for url=${url} status=${seoSettled.status}`);

    const result: any = {};

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

    console.log('Analysis completed, returning results', result);
    return result;
}


