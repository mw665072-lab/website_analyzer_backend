import { seoanalyzeUrl } from '../utils/seoAnalyze';

export const seoAnalyzerService = {
  async runJob(reportId: string, url: string, options: any) {
    const result = await seoanalyzeUrl(url);
    return {
      reportId,
      options,
      status: 'completed',
      ...result
    };
  },
};

export type SeoAnalyzerService = typeof seoAnalyzerService;
