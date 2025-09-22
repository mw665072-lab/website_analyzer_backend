import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface EnhancedScreenshotOptions {
    fullPage?: boolean;
    quality?: number;
    type?: 'png' | 'jpeg' | 'webp';
    omitBackground?: boolean;
    waitForImages?: boolean;
    blockAds?: boolean;
    optimizeForSpeed?: boolean;
}

export interface ScreenshotResult {
    desktop: {
        base64: string;
        width: number;
        height: number;
        fileSize: number;
        loadTime: number;
    };
    mobile: {
        base64: string;
        width: number;
        height: number;
        fileSize: number;
        loadTime: number;
    };
    errors: string[];
}

export async function captureEnhancedScreenshots(
    url: string, 
    options: EnhancedScreenshotOptions = {}
): Promise<ScreenshotResult> {
    const {
        fullPage = false,
        quality = 80,
        type = 'png',
        omitBackground = false,
        waitForImages = true,
        blockAds = true,
        optimizeForSpeed = true
    } = options;

    let browser: Browser | null = null;
    const errors: string[] = [];
    
    try {
        // Enhanced browser launch options
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                ...(optimizeForSpeed ? ['--single-process'] : []),
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-background-timer-throttling'
            ]
        };

        browser = await puppeteer.launch(launchOptions);
        
        // Validate and normalize URL
        let pageUrl = url;
        try {
            new URL(pageUrl);
        } catch (e) {
            pageUrl = `https://${url}`;
            try {
                new URL(pageUrl);
            } catch (err) {
                errors.push(`Invalid URL: ${url}`);
                return createEmptyResult(errors);
            }
        }

        // Capture desktop screenshot
        const desktopResult = await captureScreenshot(browser, pageUrl, {
            width: 1920,
            height: 1080,
            isMobile: false,
            fullPage,
            quality,
            type,
            omitBackground,
            waitForImages,
            blockAds
        });

        // Capture mobile screenshot
        const mobileResult = await captureScreenshot(browser, pageUrl, {
            width: 375,
            height: 812,
            isMobile: true,
            fullPage,
            quality,
            type,
            omitBackground,
            waitForImages,
            blockAds
        });

        return {
            desktop: desktopResult,
            mobile: mobileResult,
            errors
        };

    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        errors.push(`Screenshot capture failed: ${errorMessage}`);
        return createEmptyResult(errors);
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeErr) {
                console.warn('Failed to close browser:', closeErr);
            }
        }
    }
}

async function captureScreenshot(
    browser: Browser,
    url: string,
    config: {
        width: number;
        height: number;
        isMobile: boolean;
        fullPage: boolean;
        quality: number;
        type: 'png' | 'jpeg' | 'webp';
        omitBackground: boolean;
        waitForImages: boolean;
        blockAds: boolean;
    }
): Promise<{
    base64: string;
    width: number;
    height: number;
    fileSize: number;
    loadTime: number;
}> {
    const startTime = Date.now();
    const page = await browser.newPage();

    try {
        // Set viewport
        await page.setViewport({
            width: config.width,
            height: config.height,
            isMobile: config.isMobile,
            hasTouch: config.isMobile,
            deviceScaleFactor: config.isMobile ? 2 : 1
        });

        // Set user agent for mobile
        if (config.isMobile) {
            await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
        }

        // Block ads and tracking if requested
        if (config.blockAds) {
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const resourceType = request.resourceType();
                const url = request.url();
                
                // Block known ad domains and tracking
                if (
                    resourceType === 'image' && (
                        url.includes('googletagmanager') ||
                        url.includes('googlesyndication') ||
                        url.includes('doubleclick') ||
                        url.includes('adsystem')
                    )
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
        }

        // Navigate to page with timeout
        const navigationTimeout = process.env.VERCEL === '1' ? 20000 : 30000;
        await page.goto(url, {
            waitUntil: config.waitForImages ? 'networkidle0' : 'domcontentloaded',
            timeout: navigationTimeout
        });

        // Wait for any lazy-loaded images
        if (config.waitForImages) {
            await page.evaluate(() => {
                return new Promise<void>((resolve) => {
                    let imageCount = 0;
                    let loadedCount = 0;

                    const images = document.querySelectorAll('img');
                    imageCount = images.length;

                    if (imageCount === 0) {
                        resolve();
                        return;
                    }

                    const checkComplete = () => {
                        if (loadedCount >= imageCount) {
                            resolve();
                        }
                    };

                    images.forEach(img => {
                        if (img.complete) {
                            loadedCount++;
                        } else {
                            img.onload = img.onerror = () => {
                                loadedCount++;
                                checkComplete();
                            };
                        }
                    });

                    checkComplete();

                    // Timeout after 5 seconds
                    setTimeout(() => resolve(), 5000);
                });
            });
        }

        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Take screenshot
        const screenshotOptions: any = {
            encoding: 'base64',
            type: config.type,
            fullPage: config.fullPage,
            omitBackground: config.omitBackground
        };

        if (config.type === 'jpeg' || config.type === 'webp') {
            screenshotOptions.quality = config.quality;
        }

        const base64 = await page.screenshot(screenshotOptions) as string;
        const loadTime = Date.now() - startTime;

        // Calculate approximate file size (base64 is ~33% larger than binary)
        const fileSize = Math.round((base64.length * 3) / 4);

        return {
            base64,
            width: config.width,
            height: config.height,
            fileSize,
            loadTime
        };

    } catch (error) {
        throw new Error(`Screenshot failed for ${config.isMobile ? 'mobile' : 'desktop'}: ${error}`);
    } finally {
        await page.close();
    }
}

function createEmptyResult(errors: string[]): ScreenshotResult {
    return {
        desktop: {
            base64: '',
            width: 0,
            height: 0,
            fileSize: 0,
            loadTime: 0
        },
        mobile: {
            base64: '',
            width: 0,
            height: 0,
            fileSize: 0,
            loadTime: 0
        },
        errors
    };
}

// Utility function to save screenshots to disk (for debugging)
export async function saveScreenshotsToDisk(
    result: ScreenshotResult,
    outputDir: string = 'screenshots',
    filename: string = `screenshot_${Date.now()}`
): Promise<{ desktopPath?: string; mobilePath?: string }> {
    const paths: { desktopPath?: string; mobilePath?: string } = {};
    
    try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save desktop screenshot
        if (result.desktop.base64) {
            const desktopPath = path.join(outputDir, `${filename}_desktop.png`);
            fs.writeFileSync(desktopPath, result.desktop.base64, 'base64');
            paths.desktopPath = desktopPath;
        }

        // Save mobile screenshot
        if (result.mobile.base64) {
            const mobilePath = path.join(outputDir, `${filename}_mobile.png`);
            fs.writeFileSync(mobilePath, result.mobile.base64, 'base64');
            paths.mobilePath = mobilePath;
        }

        return paths;
    } catch (error) {
        console.error('Failed to save screenshots to disk:', error);
        return {};
    }
}

// Utility function to optimize screenshot for different use cases
export function optimizeScreenshotForUsage(
    base64: string,
    usage: 'thumbnail' | 'preview' | 'full'
): string {
    // In a real implementation, you would resize/compress the image
    // For now, just return the original
    return base64;
}

// Utility function to generate screenshot metadata
export function generateScreenshotMetadata(result: ScreenshotResult) {
    return {
        captureTime: new Date().toISOString(),
        totalLoadTime: result.desktop.loadTime + result.mobile.loadTime,
        totalFileSize: result.desktop.fileSize + result.mobile.fileSize,
        success: result.errors.length === 0,
        devicesCaptured: [
            result.desktop.base64 ? 'desktop' : null,
            result.mobile.base64 ? 'mobile' : null
        ].filter(Boolean),
        errors: result.errors
    };
}