// utils/rateLimiter.ts
export class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private windowMs: number;
    private maxRequests: number;

    constructor(windowMs: number, maxRequests: number) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;

        // Cleanup old entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    async checkLimit(identifier: string): Promise<{
        allowed: boolean;
        remaining?: number;
        resetTime?: Date;
        limit?: number;
    }> {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }

        const userRequests = this.requests.get(identifier)!;

        // Remove old requests outside the window
        const recentRequests = userRequests.filter(time => time > windowStart);
        this.requests.set(identifier, recentRequests);

        if (recentRequests.length >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: new Date(Math.min(...recentRequests) + this.windowMs),
                limit: this.maxRequests
            };
        }

        // Add current request
        recentRequests.push(now);

        return {
            allowed: true,
            remaining: this.maxRequests - recentRequests.length,
            resetTime: new Date(now + this.windowMs),
            limit: this.maxRequests
        };
    }

    private cleanup(): void {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        for (const [identifier, requests] of this.requests.entries()) {
            const recentRequests = requests.filter(time => time > windowStart);
            if (recentRequests.length === 0) {
                this.requests.delete(identifier);
            } else {
                this.requests.set(identifier, recentRequests);
            }
        }
    }
}

// utils/metrics.ts
export class MetricsCollector {
    private counters: Map<string, number> = new Map();
    private histograms: Map<string, number[]> = new Map();
    private gauges: Map<string, number> = new Map();
    private startTime: number = Date.now();

    incrementCounter(name: string, value: number = 1): void {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + value);
    }

    recordHistogram(name: string, value: number): void {
        if (!this.histograms.has(name)) {
            this.histograms.set(name, []);
        }

        const values = this.histograms.get(name)!;
        values.push(value);

        // Keep only last 1000 values to prevent memory issues
        if (values.length > 1000) {
            values.shift();
        }
    }

    setGauge(name: string, value: number): void {
        this.gauges.set(name, value);
    }

    getPercentile(values: number[], percentile: number): number {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    async getMetrics(): Promise<any> {
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: {} as any
        };

        // Process histograms
        for (const [name, values] of this.histograms.entries()) {
            if (values.length > 0) {
                metrics.histograms[name] = {
                    count: values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    p50: this.getPercentile(values, 50),
                    p90: this.getPercentile(values, 90),
                    p95: this.getPercentile(values, 95),
                    p99: this.getPercentile(values, 99)
                };
            }
        }

        return metrics;
    }

    reset(): void {
        this.counters.clear();
        this.histograms.clear();
        this.gauges.clear();
        this.startTime = Date.now();
    }
}

// utils/logger.ts
interface LogEntry {
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    service: string;
    message: string;
    data?: any;
    traceId?: string;
}

export class Logger {
    private service: string;

    constructor(service: string) {
        this.service = service;
    }

    private log(level: LogEntry['level'], message: string, data?: any, traceId?: string): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            message,
            ...(data && { data }),
            ...(traceId && { traceId })
        };

        if (process.env.NODE_ENV === 'production') {
            // In production, use structured JSON logging
            console.log(JSON.stringify(entry));
        } else {
            // In development, use more readable format
            const colorCode = {
                debug: '\x1b[36m',
                info: '\x1b[32m',
                warn: '\x1b[33m',
                error: '\x1b[31m'
            }[level];

            console.log(
                `${colorCode}[${entry.timestamp}] ${level.toUpperCase()}\x1b[0m ${this.service}: ${message}`,
                data ? data : ''
            );
        }
    }

    debug(message: string, data?: any, traceId?: string): void {
        if (process.env.LOG_LEVEL !== 'error' && process.env.LOG_LEVEL !== 'warn') {
            this.log('debug', message, data, traceId);
        }
    }

    info(message: string, data?: any, traceId?: string): void {
        if (process.env.LOG_LEVEL !== 'error' && process.env.LOG_LEVEL !== 'warn') {
            this.log('info', message, data, traceId);
        }
    }

    warn(message: string, data?: any, traceId?: string): void {
        if (process.env.LOG_LEVEL !== 'error') {
            this.log('warn', message, data, traceId);
        }
    }

    error(message: string, data?: any, traceId?: string): void {
        this.log('error', message, data, traceId);
    }
}

// utils/ssrf.ts - Enhanced SSRF protection
export class SSRFProtection {
    private readonly privateNetworks = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^127\./,
        /^169\.254\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/
    ];
}