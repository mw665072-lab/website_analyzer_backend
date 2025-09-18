import Report from '../models/Report';
import { analyzeUrl } from '../utils/analyzeUrl';
import { ssrfCheck } from '../utils/ssrf';
import { Request, Response } from 'express';
import crypto from 'crypto';

type AnalyzeRequestBody = {
  url: string;
  options?: Record<string, unknown>;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS) || 280_0000; // 4.67 minutes for Vercel Pro (5 min max)

function makeErrorResponse(code: string, message: string, details?: unknown) {
  const payload: any = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  };
  if (process.env.NODE_ENV === 'development' && details) payload.details = details;
  return payload;
}

export const analyzeController = {
  async handleAnalyze(req: Request<{}, {}, AnalyzeRequestBody>, res: Response) {
    const urlRaw = req.body?.url;
    const options = req.body?.options ?? {};

    if (typeof urlRaw !== 'string') {
      return res.status(400).json(makeErrorResponse('INVALID_PAYLOAD', 'Request body must include a string `url` field'));
    }

    const normalized = urlRaw.trim();
    if (!normalized || !ssrfCheck.isValidHttpUrl(normalized)) {
      return res.status(400).json(makeErrorResponse('INVALID_URL', 'Please provide a valid HTTP or HTTPS URL'));
    }

    const reportId = crypto.randomUUID();

    res.setHeader('X-Report-Id', reportId);
    res.setHeader('Cache-Control', 'no-store');

    const logMeta = { reportId, url: normalized };
    console.info('analyze:start', logMeta);

    const timeoutPromise = new Promise((_, reject) => {
      const t = setTimeout(() => {
        clearTimeout(t);
        reject(new Error('Request timeout'));
      }, DEFAULT_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([analyzeUrl(normalized), timeoutPromise]);
      const responsePayload = {
        reportId,
        options,
        status: 'completed',
        analyzedUrl: normalized,
        analysisTimestamp: new Date().toISOString(),
        result
      };

      return res.status(200).json(responsePayload);
    } catch (err: any) {
      console.error('analyze:error', { ...logMeta, message: err?.message, stack: err?.stack });

      if (err?.message?.toLowerCase?.().includes('timeout')) {
        return res.status(408).json(makeErrorResponse('TIMEOUT_ERROR', 'Request timeout - the website took too long to respond', err?.message));
      }

      if (err?.message?.includes('ECONNREFUSED') || err?.message?.includes('ENOTFOUND')) {
        return res.status(404).json(makeErrorResponse('WEBSITE_UNREACHABLE', 'Website not found or unreachable', err?.message));
      }

      if (err?.message?.includes('Failed to fetch URL')) {
        return res.status(502).json(makeErrorResponse('FETCH_ERROR', 'Unable to fetch website content', err?.message));
      }

      if (err?.message?.includes('Invalid URL')) {
        return res.status(400).json(makeErrorResponse('INVALID_URL', 'Invalid URL provided', err?.message));
      }

      return res.status(500).json(makeErrorResponse('INTERNAL_ERROR', 'Internal server error', err?.message));
    }
  },

  async getReport(req: Request, res: Response) {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json(makeErrorResponse('INVALID_ID', 'Missing report id'));

    try {
      const report = await Report.findById(id);
      if (!report) return res.status(404).json(makeErrorResponse('NOT_FOUND', 'Report not found'));
      return res.status(200).json(report);
    } catch (err: any) {
      console.error('getReport:error', { id, message: err?.message, stack: err?.stack });
      return res.status(500).json(makeErrorResponse('INTERNAL_ERROR', 'Internal server error', err?.message));
    }
  }
};
