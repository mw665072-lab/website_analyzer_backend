import { analyzeUrl } from '../utils/analyzeUrl';

export const analyzeService = {
  async runJob(reportId: string, url: string, options: any) {
    const result = await analyzeUrl(url);
    return {
      reportId,
      options,
      status: 'completed',
      ...result
    };
  },
};

export type AnalyzeService = typeof analyzeService;
