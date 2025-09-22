import { analyzeWebsite, WebsiteAnalysis } from './websiteanalyzeutils';
import { captureEnhancedScreenshots, EnhancedScreenshotOptions, ScreenshotResult } from './enhancedScreenshots';
import { analyzeAdvancedSEO, AdvancedSEOMetrics, generateSEOReport, getTopSEOIssues } from './advancedSEO';
import { analyzeAccessibility, AccessibilityReport, generateAccessibilityReport } from './accessibilityAnalyzer';
import { CheerioAPI } from 'cheerio';
import axios from 'axios';
import cheerio from 'cheerio';

export interface ComprehensiveWebsiteAnalysis {
    basicAnalysis: WebsiteAnalysis;
    advancedSEO: AdvancedSEOMetrics;
    accessibility: AccessibilityReport;
    enhancedScreenshots: ScreenshotResult;
    performanceInsights: PerformanceInsights;
    competitorAnalysis?: CompetitorAnalysis;
    overallScore: number;
    criticalIssues: CriticalIssue[];
    actionableTasks: ActionableTask[];
    executiveSummary: ExecutiveSummary;
}

export interface PerformanceInsights {
    pageSize: {
        html: number;
        css: number;
        javascript: number;
        images: number;
        total: number;
        recommendations: string[];
    };
    loadingMetrics: {
        domReady: number;
        fullyLoaded: number;
        recommendations: string[];
    };
    resourceOptimization: {
        unoptimizedImages: number;
        unusedCSS: number;
        blockinResources: number;
        recommendations: string[];
    };
    cacheability: {
        staticResources: number;
        dynamicResources: number;
        recommendations: string[];
    };
}

export interface CompetitorAnalysis {
    competitors: Array<{
        url: string;
        title: string;
        metaDescription: string;
        keywordOverlap: number;
        seoScore: number;
    }>;
    opportunities: string[];
    threats: string[];
}

export interface CriticalIssue {
    category: 'SEO' | 'Accessibility' | 'Performance' | 'Security' | 'UX';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    solution: string;
    estimatedEffort: 'low' | 'medium' | 'high';
    priority: number;
}

export interface ActionableTask {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: number;
    estimatedTime: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    tools: string[];
    steps: string[];
}

export interface ExecutiveSummary {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    keyStrengths: string[];
    keyWeaknesses: string[];
    quickWins: string[];
    longTermGoals: string[];
    budgetEstimate: {
        immediate: string;
        ongoing: string;
    };
}

export async function performComprehensiveAnalysis(
    url: string,
    options: {
        includeScreenshots?: boolean;
        includeAccessibility?: boolean;
        includeAdvancedSEO?: boolean;
        includePerformance?: boolean;
        includeCompetitorAnalysis?: boolean;
        screenshotOptions?: EnhancedScreenshotOptions;
    } = {}
): Promise<ComprehensiveWebsiteAnalysis> {
    
    const {
        includeScreenshots = true,
        includeAccessibility = true,
        includeAdvancedSEO = true,
        includePerformance = true,
        includeCompetitorAnalysis = false,
        screenshotOptions = {}
    } = options;

    try {
        // Run basic analysis
        console.log('🔍 Starting comprehensive website analysis...');
        const basicAnalysis = await analyzeWebsite(url);

        // Prepare cheerio instance for additional analysis
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000,
            validateStatus: (status) => status < 500
        });
        const $ = cheerio.load(response.data);

        // Run parallel analysis
        const analysisPromises = [];

        // Advanced SEO Analysis
        let advancedSEOPromise = Promise.resolve({} as AdvancedSEOMetrics);
        if (includeAdvancedSEO) {
            console.log('📊 Running advanced SEO analysis...');
            advancedSEOPromise = Promise.resolve(analyzeAdvancedSEO($, url, response.data));
        }

        // Accessibility Analysis
        let accessibilityPromise = Promise.resolve({} as AccessibilityReport);
        if (includeAccessibility) {
            console.log('♿ Running accessibility analysis...');
            accessibilityPromise = Promise.resolve(analyzeAccessibility($));
        }

        // Enhanced Screenshots
        let screenshotsPromise = Promise.resolve({} as ScreenshotResult);
        if (includeScreenshots) {
            console.log('📸 Capturing enhanced screenshots...');
            screenshotsPromise = captureEnhancedScreenshots(url, screenshotOptions);
        }

        // Performance Analysis
        let performancePromise = Promise.resolve({} as PerformanceInsights);
        if (includePerformance) {
            console.log('⚡ Analyzing performance metrics...');
            performancePromise = Promise.resolve(analyzePerformanceInsights($, response));
        }

        // Wait for all analysis to complete
        const [advancedSEO, accessibility, enhancedScreenshots, performanceInsights] = await Promise.all([
            advancedSEOPromise,
            accessibilityPromise,
            screenshotsPromise,
            performancePromise
        ]);

        // Calculate overall score
        const scores = [];
        if (includeAdvancedSEO && advancedSEO.overallSEOScore) scores.push(advancedSEO.overallSEOScore);
        if (includeAccessibility && accessibility.overallScore) scores.push(accessibility.overallScore);
        if (basicAnalysis.seoAnalysis) scores.push(85); // Placeholder for basic SEO score

        const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        // Generate critical issues
        const criticalIssues = generateCriticalIssues(basicAnalysis, advancedSEO, accessibility);

        // Generate actionable tasks
        const actionableTasks = generateActionableTasks(criticalIssues, advancedSEO, accessibility);

        // Generate executive summary
        const executiveSummary = generateExecutiveSummary(overallScore, criticalIssues, advancedSEO, accessibility);

        console.log('✅ Comprehensive analysis completed!');

        return {
            basicAnalysis,
            advancedSEO,
            accessibility,
            enhancedScreenshots,
            performanceInsights,
            overallScore,
            criticalIssues,
            actionableTasks,
            executiveSummary
        };

    } catch (error) {
        console.error('❌ Comprehensive analysis failed:', error);
        throw new Error(`Comprehensive analysis failed: ${error}`);
    }
}

function analyzePerformanceInsights($: CheerioAPI, response: any): PerformanceInsights {
    const htmlSize = response.data.length;
    const cssFiles = $('link[rel="stylesheet"]').length;
    const jsFiles = $('script[src]').length;
    const images = $('img').length;

    // Estimate sizes (would need actual measurement in real implementation)
    const estimatedCSSSize = cssFiles * 50000; // 50KB per CSS file estimate
    const estimatedJSSize = jsFiles * 100000; // 100KB per JS file estimate
    const estimatedImageSize = images * 200000; // 200KB per image estimate

    const totalSize = htmlSize + estimatedCSSSize + estimatedJSSize + estimatedImageSize;

    const pageSize = {
        html: htmlSize,
        css: estimatedCSSSize,
        javascript: estimatedJSSize,
        images: estimatedImageSize,
        total: totalSize,
        recommendations: [] as string[]
    };

    if (totalSize > 3000000) { // 3MB
        pageSize.recommendations.push('Page size is too large - optimize images and minimize code');
    }
    if (cssFiles > 3) {
        pageSize.recommendations.push('Reduce number of CSS files');
    }
    if (jsFiles > 5) {
        pageSize.recommendations.push('Reduce number of JavaScript files');
    }

    return {
        pageSize,
        loadingMetrics: {
            domReady: 0, // Would need actual measurement
            fullyLoaded: 0,
            recommendations: ['Enable browser caching', 'Use CDN for static resources']
        },
        resourceOptimization: {
            unoptimizedImages: Math.floor(images * 0.3), // Estimate 30% unoptimized
            unusedCSS: Math.floor(cssFiles * 0.2), // Estimate 20% unused
            blockinResources: jsFiles, // Assume all JS is blocking
            recommendations: ['Optimize images', 'Remove unused CSS', 'Load JS asynchronously']
        },
        cacheability: {
            staticResources: cssFiles + jsFiles,
            dynamicResources: 1, // The HTML page itself
            recommendations: ['Set appropriate cache headers', 'Use fingerprinting for static assets']
        }
    };
}

function generateCriticalIssues(
    basic: WebsiteAnalysis, 
    seo: AdvancedSEOMetrics, 
    accessibility: AccessibilityReport
): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // SEO Critical Issues
    if (seo.titleTag && !seo.titleTag.text) {
        issues.push({
            category: 'SEO',
            severity: 'critical',
            title: 'Missing Title Tag',
            description: 'The page is missing a title tag, which is crucial for SEO and user experience',
            impact: 'Search engines cannot understand the page topic, resulting in poor rankings',
            solution: 'Add a descriptive title tag with primary keywords (30-60 characters)',
            estimatedEffort: 'low',
            priority: 10
        });
    }

    if (seo.metaDescription && !seo.metaDescription.text) {
        issues.push({
            category: 'SEO',
            severity: 'high',
            title: 'Missing Meta Description',
            description: 'The page lacks a meta description',
            impact: 'Reduced click-through rates from search results',
            solution: 'Add a compelling meta description (120-160 characters)',
            estimatedEffort: 'low',
            priority: 9
        });
    }

    // Accessibility Critical Issues
    if (accessibility.auditResults && accessibility.auditResults.images) {
        const missingAlt = accessibility.auditResults.images.totalImages - accessibility.auditResults.images.imagesWithAlt;
        if (missingAlt > 0) {
            issues.push({
                category: 'Accessibility',
                severity: 'critical',
                title: 'Images Missing Alt Text',
                description: `${missingAlt} images are missing alt attributes`,
                impact: 'Screen reader users cannot understand image content',
                solution: 'Add descriptive alt attributes to all informative images',
                estimatedEffort: 'medium',
                priority: 8
            });
        }
    }

    // Performance Issues
    if (basic.performance.httpStatus !== 200) {
        issues.push({
            category: 'Performance',
            severity: 'critical',
            title: 'HTTP Status Issue',
            description: `Page returns HTTP status ${basic.performance.httpStatus}`,
            impact: 'Search engines and users may not be able to access the page',
            solution: 'Fix server configuration to return proper HTTP status codes',
            estimatedEffort: 'high',
            priority: 10
        });
    }

    // Security Issues
    if (!basic.security?.httpsStatus) {
        issues.push({
            category: 'Security',
            severity: 'high',
            title: 'No HTTPS',
            description: 'Website is not using HTTPS encryption',
            impact: 'Data transmitted is not secure, negative SEO impact',
            solution: 'Install SSL certificate and redirect HTTP to HTTPS',
            estimatedEffort: 'medium',
            priority: 9
        });
    }

    return issues.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

function generateActionableTasks(
    issues: CriticalIssue[], 
    seo: AdvancedSEOMetrics, 
    accessibility: AccessibilityReport
): ActionableTask[] {
    const tasks: ActionableTask[] = [];

    // Convert critical issues to tasks
    issues.forEach((issue, index) => {
        tasks.push({
            id: `task-${index + 1}`,
            title: issue.title,
            description: issue.description,
            category: issue.category,
            priority: issue.priority,
            estimatedTime: issue.estimatedEffort === 'low' ? '1-2 hours' : issue.estimatedEffort === 'medium' ? '4-8 hours' : '1-2 days',
            skillLevel: issue.estimatedEffort === 'low' ? 'beginner' : issue.estimatedEffort === 'medium' ? 'intermediate' : 'advanced',
            tools: getToolsForCategory(issue.category),
            steps: getStepsForIssue(issue)
        });
    });

    return tasks.slice(0, 15); // Limit to top 15 tasks
}

function getToolsForCategory(category: string): string[] {
    const toolMap: { [key: string]: string[] } = {
        'SEO': ['Google Search Console', 'SEMrush', 'Ahrefs', 'Screaming Frog'],
        'Accessibility': ['axe DevTools', 'WAVE', 'Lighthouse', 'Screen Reader'],
        'Performance': ['Google PageSpeed Insights', 'GTmetrix', 'WebPageTest'],
        'Security': ['SSL Labs', 'Security Headers', 'OWASP ZAP'],
        'UX': ['Google Analytics', 'Hotjar', 'Crazy Egg']
    };
    return toolMap[category] || ['Browser DevTools'];
}

function getStepsForIssue(issue: CriticalIssue): string[] {
    const stepMap: { [key: string]: string[] } = {
        'Missing Title Tag': [
            '1. Identify the main topic/keyword of the page',
            '2. Write a descriptive title (30-60 characters)',
            '3. Add <title> tag in the <head> section',
            '4. Test in search results preview tool'
        ],
        'Missing Meta Description': [
            '1. Write a compelling description (120-160 characters)',
            '2. Include primary keyword naturally',
            '3. Add call-to-action phrase',
            '4. Add meta description tag to <head>'
        ],
        'Images Missing Alt Text': [
            '1. Audit all images on the page',
            '2. Write descriptive alt text for each image',
            '3. Use alt="" for decorative images',
            '4. Test with screen reader'
        ]
    };
    return stepMap[issue.title] || ['1. Research best practices', '2. Implement solution', '3. Test results'];
}

function generateExecutiveSummary(
    overallScore: number, 
    issues: CriticalIssue[], 
    seo: AdvancedSEOMetrics, 
    accessibility: AccessibilityReport
): ExecutiveSummary {
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= 90) overallHealth = 'excellent';
    else if (overallScore >= 75) overallHealth = 'good';
    else if (overallScore >= 60) overallHealth = 'fair';
    else overallHealth = 'poor';

    const keyStrengths: string[] = [];
    const keyWeaknesses: string[] = [];
    const quickWins: string[] = [];
    const longTermGoals: string[] = [];

    // Analyze strengths
    if (seo.titleTag && seo.titleTag.score > 80) {
        keyStrengths.push('Well-optimized title tags');
    }
    if (accessibility.overallScore > 85) {
        keyStrengths.push('Good accessibility compliance');
    }

    // Analyze weaknesses
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
        keyWeaknesses.push(`${criticalIssues.length} critical issues need immediate attention`);
    }

    // Identify quick wins
    const lowEffortIssues = issues.filter(i => i.estimatedEffort === 'low');
    quickWins.push(...lowEffortIssues.slice(0, 3).map(i => i.title));

    // Identify long-term goals
    const highEffortIssues = issues.filter(i => i.estimatedEffort === 'high');
    longTermGoals.push(...highEffortIssues.slice(0, 2).map(i => i.title));
    longTermGoals.push('Implement comprehensive SEO strategy');
    longTermGoals.push('Achieve full WCAG AA compliance');

    // Estimate budget
    const immediateTasksCount = issues.filter(i => i.estimatedEffort === 'low').length;
    const ongoingTasksCount = issues.filter(i => i.estimatedEffort !== 'low').length;

    return {
        overallHealth,
        keyStrengths,
        keyWeaknesses,
        quickWins,
        longTermGoals,
        budgetEstimate: {
            immediate: `$${immediateTasksCount * 200} - $${immediateTasksCount * 500}`,
            ongoing: `$${ongoingTasksCount * 1000} - $${ongoingTasksCount * 2000}`
        }
    };
}

// Export utility functions for generating reports
export function generateComprehensiveReport(analysis: ComprehensiveWebsiteAnalysis): string {
    return `
COMPREHENSIVE WEBSITE ANALYSIS REPORT
=====================================

Overall Score: ${analysis.overallScore}/100
Website Health: ${analysis.executiveSummary.overallHealth.toUpperCase()}

EXECUTIVE SUMMARY:
==================
${analysis.executiveSummary.keyStrengths.length > 0 ? 
  `Strengths:\n${analysis.executiveSummary.keyStrengths.map(s => `• ${s}`).join('\n')}` : 
  'No major strengths identified'}

${analysis.executiveSummary.keyWeaknesses.length > 0 ? 
  `\nWeaknesses:\n${analysis.executiveSummary.keyWeaknesses.map(w => `• ${w}`).join('\n')}` : 
  'No major weaknesses identified'}

CRITICAL ISSUES (${analysis.criticalIssues.length}):
${'='.repeat(50)}
${analysis.criticalIssues.slice(0, 5).map((issue, i) => `
${i + 1}. ${issue.title} (${issue.severity.toUpperCase()})
   ${issue.description}
   Impact: ${issue.impact}
   Solution: ${issue.solution}
`).join('\n')}

QUICK WINS (${analysis.executiveSummary.quickWins.length}):
${'='.repeat(40)}
${analysis.executiveSummary.quickWins.map(win => `• ${win}`).join('\n')}

BUDGET ESTIMATE:
================
Immediate fixes: ${analysis.executiveSummary.budgetEstimate.immediate}
Long-term improvements: ${analysis.executiveSummary.budgetEstimate.ongoing}

${analysis.advancedSEO.overallSEOScore ? `
SEO ANALYSIS:
=============
${generateSEOReport(analysis.advancedSEO)}
` : ''}

${analysis.accessibility.overallScore ? `
ACCESSIBILITY ANALYSIS:
=======================
${generateAccessibilityReport(analysis.accessibility)}
` : ''}
`;
}

export * from './websiteanalyzeutils';
export * from './enhancedScreenshots';
export * from './advancedSEO';
export * from './accessibilityAnalyzer';