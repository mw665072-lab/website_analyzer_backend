import { Request, Response } from 'express';
import crypto from 'crypto';
import { aiAnalysisService, AIAnalysisRequest } from '../services/aiAnalysisService';

function makeErrorResponse(code: string, message: string, details?: unknown) {
  const payload: any = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  };
  if (process.env.NODE_ENV === 'development' && details) payload.details = details;
  return payload;
}

export const aiAnalyzerController = {
  async handleAnalyze(req: Request, res: Response) {
    const body = req.body || {};

    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return res.status(400).json(makeErrorResponse('INVALID_PAYLOAD', 'Request body must include a string `url` field'));
    }

    const request: AIAnalysisRequest = {
      url,
      analysisType: body.analysisType ?? 'full',
      priority: body.priority ?? 'medium',
      includeCompetitorAnalysis: Boolean(body.includeCompetitorAnalysis),
      includeSuggestions: body.includeSuggestions !== false
    };

    const reportId = crypto.randomUUID();
    res.setHeader('X-Report-Id', reportId);
    res.setHeader('Cache-Control', 'no-store');

    try {
      const result = await aiAnalysisService.analyzeWebsite(request);

      // If the AI service generated its own reportId, keep it; otherwise attach ours
      if (!result?.reportId) result.reportId = reportId;

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('aiAnalyze:error', { reportId, url, message: err?.message, stack: err?.stack });

      if (err?.message?.toLowerCase?.().includes('timeout')) {
        return res.status(408).json(makeErrorResponse('TIMEOUT_ERROR', 'AI analysis request timed out', err?.message));
      }

      return res.status(500).json(makeErrorResponse('AI_ANALYSIS_ERROR', 'AI analysis failed', err?.message));
    }
  }
};

export default aiAnalyzerController;
