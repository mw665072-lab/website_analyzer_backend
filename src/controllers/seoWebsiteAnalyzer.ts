
import { ssrfCheck } from '../utils/ssrf';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { seoanalyzeUrl } from '../utils/seoAnalyze';

// Enhanced type definitions
interface AnalyzeRequestBody {
  url: string;
  options?: AnalysisOptions;
}

interface AnalysisOptions {
  timeout?: number;
  skipSSRF?: boolean;
  includePerformanceMetrics?: boolean;
  [key: string]: unknown;
}

interface ErrorResponse {
  error: string;
  code: ErrorCode;
  timestamp: string;
  details?: unknown;
  reportId?: string;
}

interface SuccessResponse {
  reportId: string;
  options: AnalysisOptions;
  status: 'completed';
  analyzedUrl: string;
  analysisTimestamp: string;
  performanceMetrics?: PerformanceMetrics;
  seoResults: any;
}

interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsed?: number;
}

// Error codes enum for better error handling
enum ErrorCode {
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  INVALID_URL = 'INVALID_URL',
  SSRF_BLOCKED = 'SSRF_BLOCKED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  WEBSITE_UNREACHABLE = 'WEBSITE_UNREACHABLE',
  FETCH_ERROR = 'FETCH_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// Configuration constants
const DEFAULT_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS) || 280_000; // 4.67 minutes for Vercel Pro (5 min max)
const MAX_TIMEOUT_MS = 300_000; // 5 minutes absolute maximum
const MIN_TIMEOUT_MS = 30_000; // 30 seconds minimum

// Optimized error response factory
function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  reportId?: string
): ErrorResponse {
  const response: ErrorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (reportId) response.reportId = reportId;
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }

  return response;
}

// Enhanced URL validation with SSRF protection
async function validateAndSanitizeUrl(url: string, skipSSRF = false): Promise<{
  isValid: boolean;
  normalizedUrl?: string;
  error?: { code: ErrorCode; message: string };
}> {
  if (typeof url !== 'string') {
    return {
      isValid: false,
      error: {
        code: ErrorCode.INVALID_PAYLOAD,
        message: 'URL must be a string'
      }
    };
  }

  const normalized = url.trim();
  if (!normalized) {
    return {
      isValid: false,
      error: {
        code: ErrorCode.INVALID_URL,
        message: 'URL cannot be empty'
      }
    };
  }

  if (!ssrfCheck.isValidHttpUrl(normalized)) {
    return {
      isValid: false,
      error: {
        code: ErrorCode.INVALID_URL,
        message: 'Please provide a valid HTTP or HTTPS URL'
      }
    };
  }

  // Enhanced SSRF protection
  if (!skipSSRF) {
    try {
      const isSafe = await ssrfCheck.isSafeHost(normalized);
      if (!isSafe) {
        return {
          isValid: false,
          error: {
            code: ErrorCode.SSRF_BLOCKED,
            message: 'URL blocked for security reasons (SSRF protection)'
          }
        };
      }
    } catch (ssrfError) {
      console.warn('SSRF check failed:', ssrfError);
      // Continue with analysis but log the warning
    }
  }

  return {
    isValid: true,
    normalizedUrl: normalized
  };
}

// Enhanced timeout handler with AbortController support
function createTimeoutHandler(timeoutMs: number): {
  promise: Promise<never>;
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout;

  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, timeoutMs);
  });

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return { promise, controller, cleanup };
}

// Performance monitoring utilities
function createPerformanceTracker(): {
  startTime: number;
  start: () => void;
  end: () => PerformanceMetrics;
} {
  let startTime: number;
  let startMemory: number;

  return {
    startTime: 0,
    start: () => {
      startTime = Date.now();
      if (process.memoryUsage) {
        startMemory = process.memoryUsage().heapUsed;
      }
    },
    end: () => {
      const endTime = Date.now();
      const metrics: PerformanceMetrics = {
        startTime,
        endTime,
        duration: endTime - startTime
      };

      if (process.memoryUsage && startMemory) {
        metrics.memoryUsed = process.memoryUsage().heapUsed - startMemory;
      }

      return metrics;
    }
  };
}

// Enhanced error classification
function classifyError(error: any): { code: ErrorCode; message: string; statusCode: number } {
  const errorMessage = error?.message?.toLowerCase() || '';

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      message: 'Request timeout - the website took too long to respond',
      statusCode: 408
    };
  }

  if (errorMessage.includes('econnrefused') || errorMessage.includes('enotfound')) {
    return {
      code: ErrorCode.WEBSITE_UNREACHABLE,
      message: 'Website not found or unreachable',
      statusCode: 404
    };
  }

  if (errorMessage.includes('failed to fetch url')) {
    return {
      code: ErrorCode.FETCH_ERROR,
      message: 'Unable to fetch website content',
      statusCode: 502
    };
  }

  if (errorMessage.includes('invalid url')) {
    return {
      code: ErrorCode.INVALID_URL,
      message: 'Invalid URL provided',
      statusCode: 400
    };
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded, please try again later',
      statusCode: 429
    };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'Internal server error',
    statusCode: 500
  };
}

export const seoWebsiteAnalyzerController = {
  async seoHandleAnalyze(req: Request<{}, {}, AnalyzeRequestBody>, res: Response) {
    const performanceTracker = createPerformanceTracker();
    performanceTracker.start();

    const reportId = crypto.randomUUID();
    const urlRaw = req.body?.url;
    const options: AnalysisOptions = req.body?.options ?? {};

    // Set response headers early
    res.setHeader('X-Report-Id', reportId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    // Enhanced request validation
    if (typeof urlRaw !== 'string') {
      return res.status(400).json(
        createErrorResponse(
          ErrorCode.INVALID_PAYLOAD,
          'Request body must include a string `url` field',
          undefined,
          reportId
        )
      );
    }

    // Validate and sanitize URL with enhanced SSRF protection
    const urlValidation = await validateAndSanitizeUrl(urlRaw, options.skipSSRF);
    if (!urlValidation.isValid || !urlValidation.normalizedUrl) {
      const error = urlValidation.error!;
      const statusCode = error.code === ErrorCode.SSRF_BLOCKED ? 403 : 400;
      return res.status(statusCode).json(
        createErrorResponse(error.code, error.message, undefined, reportId)
      );
    }

    const normalizedUrl = urlValidation.normalizedUrl;
    const logMeta = { reportId, url: normalizedUrl };

    // Configure timeout with bounds checking
    const requestTimeout = Math.min(
      Math.max(options.timeout || DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS),
      MAX_TIMEOUT_MS
    );

    const { promise: timeoutPromise, cleanup: cleanupTimeout } = createTimeoutHandler(requestTimeout);

    try {
      console.log('Starting SEO analysis:', logMeta);

      // Execute analysis with enhanced error handling and timeout management
      const seoResults = await Promise.race([
        seoanalyzeUrl(normalizedUrl),
        timeoutPromise
      ]);

      const endTime = Date.now();
      console.log('SEO analysis completed:', { ...logMeta, duration: endTime - performanceTracker.startTime });

      // Build enhanced response payload
      const performanceMetrics = options.includePerformanceMetrics ? performanceTracker.end() : undefined;

      const responsePayload: SuccessResponse = {
        reportId,
        options,
        status: 'completed',
        analyzedUrl: normalizedUrl,
        analysisTimestamp: new Date().toISOString(),
        seoResults,
        ...(performanceMetrics && { performanceMetrics })
      };

      return res.status(200).json(responsePayload);

    } catch (err: any) {
      const { code, message, statusCode } = classifyError(err);

      const endTime = Date.now();
      console.error('SEO analysis error:', {
        ...logMeta,
        error: message,
        code,
        stack: err?.stack,
        duration: endTime - performanceTracker.startTime
      });

      return res.status(statusCode).json(
        createErrorResponse(code, message, err?.message, reportId)
      );

    } finally {
      cleanupTimeout();
    }
  }
};
