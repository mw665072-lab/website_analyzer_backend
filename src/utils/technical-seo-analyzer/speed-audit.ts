export class SpeedAuditor {
    async audit(url: string) {
        const runtimeImport = (specifier: string) => (Function('s', 'return import(s)') as any)(specifier);

        const [{ default: lighthouse }, chromeLauncher]: any = await Promise.all([
            runtimeImport('lighthouse'),
            runtimeImport('chrome-launcher'),
        ]);

        const chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
        });

        const options = {
            logLevel: 'info',
            output: 'json',
            onlyCategories: ['performance'],
            port: chrome.port,
            maxWaitForLoad: 45000,
            maxWaitForFcp: 45000,
        } as any;

        // Capture stdout/stderr emitted by Lighthouse so we can include LH:status messages in the result
        let stdoutWrite: typeof process.stdout.write = process.stdout.write.bind(process.stdout);
        let stderrWrite: typeof process.stderr.write = process.stderr.write.bind(process.stderr);
        let capturedOut = '';
        let capturedErr = '';

        const captureStdout: typeof process.stdout.write = (chunk: any, encoding?: any, cb?: any) => {
            try {
                const text = typeof chunk === 'string' ? chunk : chunk.toString(encoding);
                capturedOut += text;
            } catch (e) {
                // ignore
            }
            return stdoutWrite(chunk, encoding, cb);
        };

        const captureStderr: typeof process.stderr.write = (chunk: any, encoding?: any, cb?: any) => {
            try {
                const text = typeof chunk === 'string' ? chunk : chunk.toString(encoding);
                capturedErr += text;
            } catch (e) {
                // ignore
            }
            return stderrWrite(chunk, encoding, cb);
        };

        process.stdout.write = captureStdout as any;
        process.stderr.write = captureStderr as any;

        try {
            const runnerResult = await lighthouse(url, options);
            const { audits, categories } = runnerResult.lhr;

            // Build a small summary of artifacts to avoid huge payloads while still providing useful data
            const artifactsSummary: any = {};
            try {
                if (runnerResult.artifacts) {
                    if (runnerResult.artifacts.Trace) {
                        artifactsSummary.traceEvents = Array.isArray((runnerResult.artifacts.Trace as any).traceEvents)
                            ? (runnerResult.artifacts.Trace as any).traceEvents.length
                            : undefined;
                    }
                    if ((runnerResult.artifacts as any).devtoolsLogs) {
                        artifactsSummary.devtoolsLogs = Object.keys((runnerResult.artifacts as any).devtoolsLogs || {}).length;
                    }
                    if ((runnerResult.artifacts as any).ConsoleMessages) {
                        artifactsSummary.consoleMessages = Array.isArray((runnerResult.artifacts as any).ConsoleMessages)
                            ? (runnerResult.artifacts as any).ConsoleMessages.length
                            : undefined;
                    }
                }
            } catch (e) {
                // ignore artifact summarization errors
            }

            return {
                performanceScore: categories.performance.score,
                firstContentfulPaint: audits['first-contentful-paint']?.displayValue,
                largestContentfulPaint: audits['largest-contentful-paint']?.displayValue,
                cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue,
                totalBlockingTime: audits['total-blocking-time']?.displayValue,
                // full Lighthouse results for callers that want to inspect everything (can be large)
                lhr: runnerResult.lhr,
                // small artifact summary (lengths/counts) to keep payload reasonable
                artifactsSummary,
                // captured LH log output (includes LH:status lines)
                logs: capturedOut + capturedErr,
            };
        } catch (error) {
            console.error('Lighthouse error:', error);
            return {
                error: String(error),
                logs: capturedOut + capturedErr,
            };
        } finally {
            try {
                if (chrome) {
                    if (typeof (chrome as any).kill === 'function') {
                        await (chrome as any).kill();
                    } else if ((chrome as any).process && typeof (chrome as any).process.kill === 'function') {
                        (chrome as any).process.kill();
                    }
                }
            } catch (e) {
            }
            // restore stdout/stderr
            try {
                process.stdout.write = stdoutWrite;
            } catch (e) { }
            try {
                process.stderr.write = stderrWrite;
            } catch (e) { }
        }
    }
}
