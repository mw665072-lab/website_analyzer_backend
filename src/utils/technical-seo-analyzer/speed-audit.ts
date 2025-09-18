export class SpeedAuditor {
    async audit(url: string) {
        const runtimeImport = (specifier: string) => (Function('s', 'return import(s)') as any)(specifier);

        console.log(`Starting Lighthouse audit for ${url}`);

        const [{ default: lighthouse }, chromeLauncher]: any = await Promise.all([
            runtimeImport('lighthouse'),
            runtimeImport('chrome-launcher'),
        ]);

        const isVercel = process.env.VERCEL === '1';
        
        const chrome = await chromeLauncher.launch({
            chromeFlags: [
                '--headless=new',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-zygote',
                ...(isVercel ? ['--single-process'] : []) // Single process only on Vercel
            ],
        });

        // Adjust timeouts based on environment
        const maxWaitForLoad = isVercel ? 30000 : 45000;
        const maxWaitForFcp = isVercel ? 30000 : 45000;

        const options = {
            logLevel: 'info',
            output: 'json',
            onlyCategories: ['performance'],
            port: chrome.port,
            maxWaitForLoad,
            maxWaitForFcp,
            // Use mobile emulation for faster audit
            formFactor: 'mobile',
            throttling: {
                rttMs: 150,
                throughputKbps: 1638.4,
                cpuSlowdownMultiplier: 4
            }
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

        const auditStart = Date.now();
        try {
            console.log('Running Lighthouse audit...');
            const runnerResult = await lighthouse(url, options);
            
            if (!runnerResult || !runnerResult.lhr) {
                throw new Error('Lighthouse audit failed - no results returned');
            }

            const auditDuration = Date.now() - auditStart;
            console.log(`Lighthouse audit completed in ${auditDuration}ms`);

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
                performanceScore: categories.performance?.score || 0,
                firstContentfulPaint: audits['first-contentful-paint']?.displayValue || 'N/A',
                largestContentfulPaint: audits['largest-contentful-paint']?.displayValue || 'N/A',
                cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue || 'N/A',
                totalBlockingTime: audits['total-blocking-time']?.displayValue || 'N/A',
                auditDuration: `${auditDuration}ms`,
                // Include essential LH data but remove large artifacts to keep payload reasonable
                lhr: {
                    ...runnerResult.lhr,
                    artifacts: undefined // Remove to reduce payload size
                },
                // small artifact summary (lengths/counts) to keep payload reasonable
                artifactsSummary,
                // captured LH log output (includes LH:status lines) - truncate if too long
                logs: (capturedOut + capturedErr).slice(-5000), // Keep last 5KB of logs
            };
        } catch (error) {
            const auditDuration = Date.now() - auditStart;
            console.error(`Lighthouse error after ${auditDuration}ms:`, error);
            return {
                error: String(error),
                auditDuration: `${auditDuration}ms`,
                logs: (capturedOut + capturedErr).slice(-5000),
            };
        } finally {
            try {
                console.log('Closing Chrome instance...');
                if (chrome) {
                    if (typeof (chrome as any).kill === 'function') {
                        await (chrome as any).kill();
                    } else if ((chrome as any).process && typeof (chrome as any).process.kill === 'function') {
                        (chrome as any).process.kill();
                    }
                }
                console.log('Chrome instance closed');
            } catch (e) {
                console.warn('Error closing Chrome:', e);
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
