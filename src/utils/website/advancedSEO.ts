import { CheerioAPI } from 'cheerio';
import { URL } from 'url';

export interface AdvancedSEOMetrics {
    titleTag: {
        text: string;
        length: number;
        hasKeywords: boolean;
        isTruncated: boolean;
        score: number;
        recommendations: string[];
    };
    metaDescription: {
        text: string;
        length: number;
        hasKeywords: boolean;
        isTruncated: boolean;
        score: number;
        recommendations: string[];
    };
    headingStructure: {
        h1Count: number;
        hasH1: boolean;
        properHierarchy: boolean;
        missingLevels: number[];
        totalHeadings: number;
        score: number;
        recommendations: string[];
    };
    contentAnalysis: {
        wordCount: number;
        readabilityScore: number;
        keywordDensity: { [keyword: string]: number };
        topKeywords: Array<{ word: string; count: number; density: number }>;
        contentScore: number;
        recommendations: string[];
    };
    linkAnalysis: {
        totalLinks: number;
        internalLinks: number;
        externalLinks: number;
        noFollowLinks: number;
        linkScore: number;
        recommendations: string[];
    };
    imageOptimization: {
        totalImages: number;
        imagesWithAlt: number;
        imagesWithoutAlt: number;
        largeImages: number;
        imageScore: number;
        recommendations: string[];
    };
    technicalSEO: {
        hasCanonical: boolean;
        hasRobotsMeta: boolean;
        hasViewport: boolean;
        hasStructuredData: boolean;
        technicalScore: number;
        recommendations: string[];
    };
    performanceMetrics: {
        loadTime: number;
        domElements: number;
        cssFiles: number;
        jsFiles: number;
        performanceScore: number;
        recommendations: string[];
    };
    mobileOptimization: {
        hasViewportMeta: boolean;
        isResponsive: boolean;
        touchFriendly: boolean;
        mobileScore: number;
        recommendations: string[];
    };
    socialMediaOptimization: {
        hasOpenGraph: boolean;
        hasTwitterCards: boolean;
        socialScore: number;
        recommendations: string[];
    };
    overallSEOScore: number;
    criticalIssues: string[];
    recommendations: string[];
}

export interface KeywordAnalysis {
    primaryKeywords: string[];
    keywordDensities: { [keyword: string]: number };
    keywordPositions: { [keyword: string]: string[] };
    overOptimization: boolean;
    underOptimization: boolean;
    recommendations: string[];
}

export function analyzeAdvancedSEO($: CheerioAPI, url: string, pageContent: string): AdvancedSEOMetrics {
    const titleTag = analyzeTitleTag($);
    const metaDescription = analyzeMetaDescription($);
    const headingStructure = analyzeHeadingStructure($);
    const contentAnalysis = analyzeContent($, pageContent);
    const linkAnalysis = analyzeLinkStructure($, url);
    const imageOptimization = analyzeImages($);
    const technicalSEO = analyzeTechnicalSEO($);
    const performanceMetrics = analyzePerformance($);
    const mobileOptimization = analyzeMobileOptimization($);
    const socialMediaOptimization = analyzeSocialMedia($);

    // Calculate overall SEO score
    const scores = [
        titleTag.score,
        metaDescription.score,
        headingStructure.score,
        contentAnalysis.contentScore,
        linkAnalysis.linkScore,
        imageOptimization.imageScore,
        technicalSEO.technicalScore,
        performanceMetrics.performanceScore,
        mobileOptimization.mobileScore,
        socialMediaOptimization.socialScore
    ];

    const overallSEOScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

    // Collect critical issues
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    if (!titleTag.text) criticalIssues.push('Missing title tag');
    if (!metaDescription.text) criticalIssues.push('Missing meta description');
    if (!headingStructure.hasH1) criticalIssues.push('Missing H1 tag');
    if (imageOptimization.imagesWithoutAlt > 0) criticalIssues.push(`${imageOptimization.imagesWithoutAlt} images missing alt attributes`);
    if (!technicalSEO.hasCanonical) criticalIssues.push('Missing canonical tag');

    // Collect top recommendations
    [titleTag, metaDescription, headingStructure, contentAnalysis, linkAnalysis, 
     imageOptimization, technicalSEO, performanceMetrics, mobileOptimization, socialMediaOptimization]
        .forEach(analysis => {
            if ('recommendations' in analysis) {
                recommendations.push(...analysis.recommendations.slice(0, 2));
            }
        });

    return {
        titleTag,
        metaDescription,
        headingStructure,
        contentAnalysis,
        linkAnalysis,
        imageOptimization,
        technicalSEO,
        performanceMetrics,
        mobileOptimization,
        socialMediaOptimization,
        overallSEOScore,
        criticalIssues,
        recommendations: [...new Set(recommendations)].slice(0, 10) // Remove duplicates and limit
    };
}

function analyzeTitleTag($: CheerioAPI) {
    const titleElement = $('title');
    const text = titleElement.text().trim();
    const length = text.length;
    
    let score = 0;
    const recommendations: string[] = [];

    if (!text) {
        recommendations.push('Add a title tag to your page');
    } else {
        if (length >= 30 && length <= 60) {
            score += 25;
        } else if (length < 30) {
            score += 15;
            recommendations.push('Title is too short - aim for 30-60 characters');
        } else {
            score += 10;
            recommendations.push('Title is too long - may be truncated in search results');
        }

        // Check for keywords (simplified)
        const hasCommonWords = /\b(how|what|where|when|why|best|guide|tips)\b/i.test(text);
        if (hasCommonWords) {
            score += 10;
        } else {
            recommendations.push('Consider including relevant keywords in your title');
        }

        // Check for brand name
        const hasBrandIndicators = text.includes('|') || text.includes(' - ');
        if (hasBrandIndicators) {
            score += 5;
        }
    }

    const isTruncated = length > 60;
    const hasKeywords = text.length > 0; // Simplified

    return {
        text,
        length,
        hasKeywords,
        isTruncated,
        score: Math.min(score, 100),
        recommendations
    };
}

function analyzeMetaDescription($: CheerioAPI) {
    const metaElement = $('meta[name="description"]');
    const text = metaElement.attr('content') || '';
    const length = text.length;
    
    let score = 0;
    const recommendations: string[] = [];

    if (!text) {
        recommendations.push('Add a meta description to improve click-through rates');
    } else {
        if (length >= 120 && length <= 160) {
            score += 25;
        } else if (length < 120) {
            score += 15;
            recommendations.push('Meta description is too short - aim for 120-160 characters');
        } else {
            score += 10;
            recommendations.push('Meta description is too long - may be truncated');
        }

        // Check for call-to-action
        const hasCTA = /\b(learn|discover|get|find|explore|read|download|buy)\b/i.test(text);
        if (hasCTA) {
            score += 10;
        } else {
            recommendations.push('Include a call-to-action in your meta description');
        }
    }

    const isTruncated = length > 160;
    const hasKeywords = text.length > 0; // Simplified

    return {
        text,
        length,
        hasKeywords,
        isTruncated,
        score: Math.min(score, 100),
        recommendations
    };
}

function analyzeHeadingStructure($: CheerioAPI) {
    const h1Elements = $('h1');
    const h2Elements = $('h2');
    const h3Elements = $('h3');
    const h4Elements = $('h4');
    const h5Elements = $('h5');
    const h6Elements = $('h6');

    const h1Count = h1Elements.length;
    const hasH1 = h1Count > 0;
    const totalHeadings = $('h1, h2, h3, h4, h5, h6').length;

    let score = 0;
    const recommendations: string[] = [];
    const missingLevels: number[] = [];

    // Check H1
    if (hasH1) {
        if (h1Count === 1) {
            score += 25;
        } else {
            score += 10;
            recommendations.push('Use only one H1 tag per page');
        }
    } else {
        recommendations.push('Add an H1 tag to your page');
    }

    // Check hierarchy
    let properHierarchy = true;
    const levels = [h1Elements.length, h2Elements.length, h3Elements.length, h4Elements.length, h5Elements.length, h6Elements.length];
    
    for (let i = 0; i < levels.length - 1; i++) {
        if (levels[i] === 0 && levels[i + 1] > 0) {
            properHierarchy = false;
            missingLevels.push(i + 1);
        }
    }

    if (properHierarchy) {
        score += 15;
    } else {
        recommendations.push('Fix heading hierarchy - avoid skipping heading levels');
    }

    // Check for H2s
    if (h2Elements.length > 0) {
        score += 10;
    } else if (totalHeadings > 1) {
        recommendations.push('Add H2 subheadings to improve content structure');
    }

    return {
        h1Count,
        hasH1,
        properHierarchy,
        missingLevels,
        totalHeadings,
        score: Math.min(score, 100),
        recommendations
    };
}

function analyzeContent($: CheerioAPI, pageContent: string) {
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(word => word.length > 0).length;
    
    // Calculate readability (simplified Flesch score)
    const sentences = bodyText.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / Math.max(sentences, 1);
    const avgSyllablesPerWord = 1.5; // Simplified estimate
    const readabilityScore = Math.max(0, Math.min(100, 
        206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));

    // Keyword analysis
    const words = bodyText.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    const wordFreq: { [word: string]: number } = {};
    
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const keywordDensity: { [keyword: string]: number } = {};
    const topKeywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => {
            const density = (count / wordCount) * 100;
            keywordDensity[word] = density;
            return { word, count, density };
        });

    let contentScore = 0;
    const recommendations: string[] = [];

    // Score based on word count
    if (wordCount >= 300) {
        if (wordCount >= 1000) {
            contentScore += 25;
        } else {
            contentScore += 20;
        }
    } else {
        contentScore += 10;
        recommendations.push('Increase content length - aim for at least 300 words');
    }

    // Score based on readability
    if (readabilityScore >= 60) {
        contentScore += 15;
    } else {
        contentScore += 5;
        recommendations.push('Improve content readability - use shorter sentences');
    }

    // Check for keyword stuffing
    const highDensityKeywords = topKeywords.filter(kw => kw.density > 3);
    if (highDensityKeywords.length > 0) {
        contentScore -= 10;
        recommendations.push('Reduce keyword density to avoid over-optimization');
    } else {
        contentScore += 10;
    }

    return {
        wordCount,
        readabilityScore,
        keywordDensity,
        topKeywords,
        contentScore: Math.max(0, Math.min(contentScore, 100)),
        recommendations
    };
}

function analyzeLinkStructure($: CheerioAPI, baseUrl: string) {
    const links = $('a[href]');
    const totalLinks = links.length;
    
    let internalLinks = 0;
    let externalLinks = 0;
    let noFollowLinks = 0;

    const domain = new URL(baseUrl).hostname;

    links.each((_, element) => {
        const href = $(element).attr('href') || '';
        const rel = $(element).attr('rel') || '';

        if (rel.includes('nofollow')) {
            noFollowLinks++;
        }

        try {
            if (href.startsWith('/') || href.includes(domain)) {
                internalLinks++;
            } else if (href.startsWith('http')) {
                externalLinks++;
            }
        } catch (e) {
            // Invalid URL
        }
    });

    let linkScore = 0;
    const recommendations: string[] = [];

    // Score based on internal linking
    if (internalLinks >= 3) {
        linkScore += 20;
    } else {
        recommendations.push('Add more internal links to improve navigation');
    }

    // Score based on external linking
    if (externalLinks > 0 && externalLinks < totalLinks * 0.3) {
        linkScore += 15;
    } else if (externalLinks === 0) {
        recommendations.push('Consider adding relevant external links');
    } else {
        recommendations.push('Balance internal and external links');
    }

    // Check for descriptive link text
    let descriptiveLinks = 0;
    links.each((_, element) => {
        const text = $(element).text().trim().toLowerCase();
        if (text && !['click here', 'read more', 'more', 'here'].includes(text)) {
            descriptiveLinks++;
        }
    });

    if (descriptiveLinks / totalLinks > 0.8) {
        linkScore += 15;
    } else {
        recommendations.push('Use more descriptive link text');
    }

    return {
        totalLinks,
        internalLinks,
        externalLinks,
        noFollowLinks,
        linkScore: Math.min(linkScore, 100),
        recommendations
    };
}

function analyzeImages($: CheerioAPI) {
    const images = $('img');
    const totalImages = images.length;
    let imagesWithAlt = 0;
    let largeImages = 0;

    images.each((_, element) => {
        const alt = $(element).attr('alt');
        const src = $(element).attr('src');
        
        if (alt && alt.trim()) {
            imagesWithAlt++;
        }

        // Simple check for potentially large images
        if (src && (src.includes('4k') || src.includes('high-res'))) {
            largeImages++;
        }
    });

    const imagesWithoutAlt = totalImages - imagesWithAlt;

    let imageScore = 0;
    const recommendations: string[] = [];

    if (totalImages === 0) {
        imageScore = 50; // Neutral score for pages without images
    } else {
        // Score based on alt attributes
        const altRatio = imagesWithAlt / totalImages;
        if (altRatio === 1) {
            imageScore += 30;
        } else if (altRatio >= 0.8) {
            imageScore += 20;
        } else {
            imageScore += 10;
            recommendations.push('Add alt attributes to all images');
        }

        // Check for image optimization
        if (largeImages === 0) {
            imageScore += 20;
        } else {
            recommendations.push('Optimize large images for better performance');
        }
    }

    if (imagesWithoutAlt > 5) {
        recommendations.push('Many images are missing alt attributes - this affects accessibility');
    }

    return {
        totalImages,
        imagesWithAlt,
        imagesWithoutAlt,
        largeImages,
        imageScore: Math.min(imageScore, 100),
        recommendations
    };
}

function analyzeTechnicalSEO($: CheerioAPI) {
    const hasCanonical = $('link[rel="canonical"]').length > 0;
    const hasRobotsMeta = $('meta[name="robots"]').length > 0;
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const hasStructuredData = $('script[type="application/ld+json"]').length > 0 || $('[itemscope]').length > 0;

    let technicalScore = 0;
    const recommendations: string[] = [];

    if (hasCanonical) {
        technicalScore += 25;
    } else {
        recommendations.push('Add a canonical tag to prevent duplicate content issues');
    }

    if (hasViewport) {
        technicalScore += 25;
    } else {
        recommendations.push('Add a viewport meta tag for mobile optimization');
    }

    if (hasStructuredData) {
        technicalScore += 25;
    } else {
        recommendations.push('Add structured data markup to improve search visibility');
    }

    if (hasRobotsMeta) {
        const robotsContent = $('meta[name="robots"]').attr('content') || '';
        if (!robotsContent.includes('noindex')) {
            technicalScore += 25;
        } else {
            recommendations.push('Page is set to noindex - remove if you want it indexed');
        }
    } else {
        technicalScore += 15; // Default behavior is usually fine
    }

    return {
        hasCanonical,
        hasRobotsMeta,
        hasViewport,
        hasStructuredData,
        technicalScore: Math.min(technicalScore, 100),
        recommendations
    };
}

function analyzePerformance($: CheerioAPI) {
    const cssFiles = $('link[rel="stylesheet"]').length;
    const jsFiles = $('script[src]').length;
    const domElements = $('*').length;

    let performanceScore = 100;
    const recommendations: string[] = [];

    // Penalty for too many DOM elements
    if (domElements > 1500) {
        performanceScore -= 20;
        recommendations.push('Reduce DOM complexity - too many elements');
    } else if (domElements > 1000) {
        performanceScore -= 10;
    }

    // Penalty for too many CSS files
    if (cssFiles > 5) {
        performanceScore -= 15;
        recommendations.push('Reduce number of CSS files or combine them');
    }

    // Penalty for too many JS files
    if (jsFiles > 10) {
        performanceScore -= 15;
        recommendations.push('Reduce number of JavaScript files');
    }

    // Check for inline styles (can be performance issue)
    const inlineStyles = $('[style]').length;
    if (inlineStyles > 20) {
        performanceScore -= 10;
        recommendations.push('Reduce inline styles - move to CSS files');
    }

    return {
        loadTime: 0, // Would need actual measurement
        domElements,
        cssFiles,
        jsFiles,
        performanceScore: Math.max(0, performanceScore),
        recommendations
    };
}

function analyzeMobileOptimization($: CheerioAPI) {
    const hasViewportMeta = $('meta[name="viewport"]').length > 0;
    const viewportContent = $('meta[name="viewport"]').attr('content') || '';
    
    let mobileScore = 0;
    const recommendations: string[] = [];

    if (hasViewportMeta) {
        mobileScore += 30;
        if (viewportContent.includes('width=device-width')) {
            mobileScore += 20;
        }
    } else {
        recommendations.push('Add viewport meta tag for mobile compatibility');
    }

    // Check for touch-friendly elements
    const touchElements = $('button, input[type="button"], input[type="submit"], a').length;
    if (touchElements > 0) {
        mobileScore += 25;
    }

    // Check for responsive design indicators
    const hasMediaQueries = $('style').text().includes('@media') || 
                            $('link[rel="stylesheet"]').length > 0; // Assume external CSS might have media queries
    
    const isResponsive = hasMediaQueries;
    const touchFriendly = touchElements > 0;

    if (isResponsive) {
        mobileScore += 25;
    } else {
        recommendations.push('Implement responsive design with media queries');
    }

    return {
        hasViewportMeta,
        isResponsive,
        touchFriendly,
        mobileScore: Math.min(mobileScore, 100),
        recommendations
    };
}

function analyzeSocialMedia($: CheerioAPI) {
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

    const ogCount = ogTags.filter(tag => $(`meta[property="${tag}"]`).length > 0).length;
    const twitterCount = twitterTags.filter(tag => $(`meta[name="${tag}"]`).length > 0).length;

    const hasOpenGraph = ogCount >= 3;
    const hasTwitterCards = twitterCount >= 2;

    let socialScore = 0;
    const recommendations: string[] = [];

    if (hasOpenGraph) {
        socialScore += 50;
    } else {
        recommendations.push('Add Open Graph tags for better social media sharing');
    }

    if (hasTwitterCards) {
        socialScore += 50;
    } else {
        recommendations.push('Add Twitter Card meta tags');
    }

    return {
        hasOpenGraph,
        hasTwitterCards,
        socialScore,
        recommendations
    };
}

export function generateSEOReport(metrics: AdvancedSEOMetrics): string {
    let report = `SEO ANALYSIS REPORT
====================

Overall SEO Score: ${metrics.overallSEOScore}/100

CRITICAL ISSUES:
${metrics.criticalIssues.length > 0 ? metrics.criticalIssues.map(issue => `• ${issue}`).join('\n') : '• No critical issues found'}

TOP RECOMMENDATIONS:
${metrics.recommendations.map(rec => `• ${rec}`).join('\n')}

DETAILED ANALYSIS:
==================

Title Tag (Score: ${metrics.titleTag.score}/100):
• Length: ${metrics.titleTag.length} characters
• Status: ${metrics.titleTag.isTruncated ? 'May be truncated' : 'Good length'}

Meta Description (Score: ${metrics.metaDescription.score}/100):
• Length: ${metrics.metaDescription.length} characters
• Status: ${metrics.metaDescription.isTruncated ? 'May be truncated' : 'Good length'}

Content Analysis (Score: ${metrics.contentAnalysis.contentScore}/100):
• Word Count: ${metrics.contentAnalysis.wordCount}
• Readability Score: ${Math.round(metrics.contentAnalysis.readabilityScore)}

Technical SEO (Score: ${metrics.technicalSEO.technicalScore}/100):
• Canonical Tag: ${metrics.technicalSEO.hasCanonical ? '✓' : '✗'}
• Structured Data: ${metrics.technicalSEO.hasStructuredData ? '✓' : '✗'}
• Viewport Meta: ${metrics.technicalSEO.hasViewport ? '✓' : '✗'}

Performance (Score: ${metrics.performanceMetrics.performanceScore}/100):
• DOM Elements: ${metrics.performanceMetrics.domElements}
• CSS Files: ${metrics.performanceMetrics.cssFiles}
• JS Files: ${metrics.performanceMetrics.jsFiles}
`;

    return report;
}

export function getTopSEOIssues(metrics: AdvancedSEOMetrics): Array<{
    issue: string;
    priority: 'high' | 'medium' | 'low';
    solution: string;
}> {
    const issues: Array<{issue: string; priority: 'high' | 'medium' | 'low'; solution: string}> = [];

    if (!metrics.titleTag.text) {
        issues.push({
            issue: 'Missing title tag',
            priority: 'high',
            solution: 'Add a descriptive title tag that includes your primary keyword'
        });
    }

    if (!metrics.metaDescription.text) {
        issues.push({
            issue: 'Missing meta description',
            priority: 'high',
            solution: 'Add a compelling meta description to improve click-through rates'
        });
    }

    if (!metrics.headingStructure.hasH1) {
        issues.push({
            issue: 'Missing H1 tag',
            priority: 'high',
            solution: 'Add an H1 tag that describes the main topic of your page'
        });
    }

    if (metrics.imageOptimization.imagesWithoutAlt > 0) {
        issues.push({
            issue: `${metrics.imageOptimization.imagesWithoutAlt} images missing alt attributes`,
            priority: 'medium',
            solution: 'Add descriptive alt attributes to all images for accessibility and SEO'
        });
    }

    if (!metrics.technicalSEO.hasCanonical) {
        issues.push({
            issue: 'Missing canonical tag',
            priority: 'medium',
            solution: 'Add a canonical tag to prevent duplicate content issues'
        });
    }

    return issues.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}