import axios from 'axios';

/**
 * Broken Links Detection
 */
export async function checkLinkStatus(url: string, baseUrl: string): Promise<{ status: number; broken: boolean }> {
    try {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).href;

        if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
            return { status: 200, broken: false };
        }

        const response = await axios.head(fullUrl, {
            timeout: 5000,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const broken = response.status >= 400;
        return { status: response.status, broken };
    } catch (error) {
        try {
            const response = await axios.get(url.startsWith('http') ? url : new URL(url, baseUrl).href, {
                timeout: 5000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const broken = response.status >= 400;
            return { status: response.status, broken };
        } catch (getError) {
            return { status: 0, broken: true };
        }
    }
}

/**
 * Internal Linking Structure Analysis
 */
export function analyzeInternalLinkingStructure(links: Array<{ href: string; text: string; external: boolean; broken?: boolean }>, baseUrl: string) {
    const internalLinks = links.filter(link => !link.external);
    const anchorTextAnalysis: Record<string, { count: number; targets: Set<string> }> = {};
    const linkTargets: Record<string, { inboundLinks: number; anchorTexts: Set<string> }> = {};

    internalLinks.forEach(link => {
        const anchorText = link.text.trim().toLowerCase();
        const target = link.href;

        if (anchorText && anchorText !== '') {
            if (!anchorTextAnalysis[anchorText]) {
                anchorTextAnalysis[anchorText] = { count: 0, targets: new Set() };
            }
            anchorTextAnalysis[anchorText].count++;
            anchorTextAnalysis[anchorText].targets.add(target);
        }

        if (!linkTargets[target]) {
            linkTargets[target] = { inboundLinks: 0, anchorTexts: new Set() };
        }
        linkTargets[target].inboundLinks++;
        if (anchorText) {
            linkTargets[target].anchorTexts.add(anchorText);
        }
    });

    const anchorTextArray = Object.entries(anchorTextAnalysis).map(([text, data]) => ({
        text,
        count: data.count,
        targets: Array.from(data.targets)
    })).sort((a, b) => b.count - a.count);

    const topLinkedPages = Object.entries(linkTargets)
        .map(([url, data]) => ({
            url,
            inboundLinks: data.inboundLinks,
            anchorTexts: Array.from(data.anchorTexts)
        }))
        .sort((a, b) => b.inboundLinks - a.inboundLinks)
        .slice(0, 10);

    const uniqueTargets = Object.keys(linkTargets).length;
    const totalInternalLinks = internalLinks.length;
    const linkEquity = uniqueTargets > 0 ? totalInternalLinks / uniqueTargets : 0;

    const linkingIssues: string[] = [];
    const recommendations: string[] = [];

    if (totalInternalLinks < 10) {
        linkingIssues.push('Few internal links found - may impact site navigation and SEO');
        recommendations.push('Add more internal links to improve site structure and user navigation');
    }

    if (linkEquity < 2) {
        linkingIssues.push('Poor link equity distribution across internal pages');
        recommendations.push('Distribute internal links more evenly across your site');
    }

    const genericAnchorTexts = anchorTextArray.filter(anchor =>
        ['click here', 'read more', 'learn more', 'here', 'link'].includes(anchor.text)
    );

    if (genericAnchorTexts.length > 0) {
        linkingIssues.push(`${genericAnchorTexts.length} generic anchor texts found (e.g., "click here", "read more")`);
        recommendations.push('Use descriptive anchor texts that indicate the destination page content');
    }

    const overOptimizedAnchors = anchorTextArray.filter(anchor => anchor.count > 10);
    if (overOptimizedAnchors.length > 0) {
        linkingIssues.push(`${overOptimizedAnchors.length} anchor texts used excessively (${overOptimizedAnchors[0].text}: ${overOptimizedAnchors[0].count} times)`);
        recommendations.push('Vary anchor text to avoid over-optimization penalties');
    }

    return {
        depth: Math.ceil(Math.log2(uniqueTargets + 1)),
        orphanPages: 0,
        linkEquity: Math.round(linkEquity * 100) / 100,
        anchorTextAnalysis: anchorTextArray.slice(0, 20),
        topLinkedPages,
        linkingIssues,
        recommendations
    };
}

/**
 * Viewport meta analysis
 */
export function analyzeViewportMeta(viewportContent: string | undefined) {
    const analysis = {
        content: viewportContent || '',
        hasWidth: false,
        hasInitialScale: false,
        hasUserScalable: false,
        width: '',
        initialScale: '',
        userScalable: '',
        isOptimal: false,
        issues: [] as string[],
        recommendations: [] as string[]
    };

    if (!viewportContent) {
        analysis.issues.push('Missing viewport meta tag');
        analysis.recommendations.push('Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">');
        return analysis;
    }

    const parts = viewportContent.split(',').map(part => part.trim());

    for (const part of parts) {
        const [key, value] = part.split('=');
        if (key && value) {
            const trimmedKey = key.trim();
            const trimmedValue = value.trim();

            switch (trimmedKey) {
                case 'width':
                    analysis.hasWidth = true;
                    analysis.width = trimmedValue;
                    break;
                case 'initial-scale':
                    analysis.hasInitialScale = true;
                    analysis.initialScale = trimmedValue;
                    break;
                case 'user-scalable':
                    analysis.hasUserScalable = true;
                    analysis.userScalable = trimmedValue;
                    break;
            }
        }
    }

    if (!analysis.hasWidth) {
        analysis.issues.push('Missing width directive in viewport');
        analysis.recommendations.push('Add width=device-width to viewport meta tag');
    } else if (analysis.width !== 'device-width') {
        analysis.issues.push(`Viewport width is "${analysis.width}" instead of "device-width"`);
        analysis.recommendations.push('Set viewport width to "device-width" for proper mobile rendering');
    }

    if (!analysis.hasInitialScale) {
        analysis.issues.push('Missing initial-scale directive in viewport');
        analysis.recommendations.push('Add initial-scale=1.0 to viewport meta tag');
    } else if (analysis.initialScale !== '1.0' && analysis.initialScale !== '1') {
        analysis.issues.push(`Initial scale is "${analysis.initialScale}" instead of "1.0"`);
        analysis.recommendations.push('Set initial-scale to 1.0 for optimal mobile experience');
    }

    if (analysis.hasUserScalable && analysis.userScalable === 'no') {
        analysis.issues.push('User scaling is disabled (user-scalable=no)');
        analysis.recommendations.push('Allow user scaling for better accessibility - remove user-scalable=no');
    }

    analysis.isOptimal = analysis.hasWidth &&
        analysis.width === 'device-width' &&
        analysis.hasInitialScale &&
        (analysis.initialScale === '1.0' || analysis.initialScale === '1') &&
        (!analysis.hasUserScalable || analysis.userScalable !== 'no');

    return analysis;
}

/**
 * Touch target analysis executed inside page context
 */
export async function checkTouchTargets(page: any) {
    return await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]'));
        const issues: Array<any> = [];
        let tooSmall = 0;
        let tooClose = 0;
        let adequateSize = 0;

        const MIN_TOUCH_TARGET_SIZE = 44;
        const MIN_SPACING = 8;

        const elementData = elements.map(element => {
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);

            return {
                element,
                rect,
                style: computedStyle,
                isVisible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden' && computedStyle.display !== 'none'
            };
        }).filter(data => data.isVisible);

        elementData.forEach((data, index) => {
            const { element, rect } = data;
            const elementInfo = {
                element: element.tagName.toLowerCase() + (element.className ? '.' + element.className.split(' ').join('.') : ''),
                position: { x: Math.round(rect.left), y: Math.round(rect.top) },
                size: { width: Math.round(rect.width), height: Math.round(rect.height) }
            };

            if (rect.width < MIN_TOUCH_TARGET_SIZE || rect.height < MIN_TOUCH_TARGET_SIZE) {
                tooSmall++;
                issues.push({
                    ...elementInfo,
                    issue: `Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum: ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}px)`
                });
            } else {
                adequateSize++;
            }

            elementData.forEach((otherData, otherIndex) => {
                if (index !== otherIndex) {
                    const otherRect = otherData.rect;
                    const horizontalOverlap = Math.max(0, Math.min(rect.right, otherRect.right) - Math.max(rect.left, otherRect.left));
                    const verticalOverlap = Math.max(0, Math.min(rect.bottom, otherRect.bottom) - Math.max(rect.top, otherRect.top));

                    if (horizontalOverlap > 0 && verticalOverlap > 0) {
                        const horizontalSpacing = Math.min(
                            Math.abs(rect.right - otherRect.left),
                            Math.abs(otherRect.right - rect.left)
                        );
                        const verticalSpacing = Math.min(
                            Math.abs(rect.bottom - otherRect.top),
                            Math.abs(otherRect.bottom - rect.top)
                        );

                        if (horizontalSpacing < MIN_SPACING || verticalSpacing < MIN_SPACING) {
                            tooClose++;
                            issues.push({
                                ...elementInfo,
                                issue: `Touch target too close to adjacent elements (spacing: ${Math.min(horizontalSpacing, verticalSpacing)}px, minimum: ${MIN_SPACING}px)`
                            });
                        }
                    }
                }
            });
        });

        const totalElements = elementData.length;
        const score = totalElements > 0 ? Math.round(((adequateSize / totalElements) * 100)) : 100;

        return {
            totalElements,
            tooSmall,
            tooClose,
            adequateSize,
            score,
            issues: issues.slice(0, 20)
        };
    });
}

/**
 * Responsive design analysis across breakpoints
 */
export async function analyzeResponsiveDesign(page: any, url: string) {
    const breakpoints = [
        { width: 320, height: 568, name: 'Small Mobile' },
        { width: 375, height: 667, name: 'Medium Mobile' },
        { width: 414, height: 896, name: 'Large Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1024, height: 768, name: 'Tablet Landscape' },
        { width: 1200, height: 800, name: 'Desktop' },
        { width: 1920, height: 1080, name: 'Large Desktop' }
    ];

    const results = [];
    let totalScore = 0;

    for (const breakpoint of breakpoints) {
        await page.setViewport({ width: breakpoint.width, height: breakpoint.height });
        await new Promise(resolve => setTimeout(resolve, 500));

        const breakpointAnalysis = await page.evaluate((bp: any) => {
            const issues: string[] = [];

            const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
            if (hasHorizontalScroll) {
                issues.push(`Horizontal scroll detected (content width: ${document.body.scrollWidth}px, viewport: ${window.innerWidth}px)`);
            }

            const contentOverflow = document.documentElement.scrollWidth > window.innerWidth;
            if (contentOverflow) {
                issues.push('Content overflows viewport width');
            }

            const textElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th'));
            let readableTextCount = 0;
            let totalTextElements = 0;

            textElements.forEach(element => {
                const style = window.getComputedStyle(element);
                const fontSize = parseFloat(style.fontSize);
                const text = (element as HTMLElement).innerText?.trim();

                if (text && text.length > 10) {
                    totalTextElements++;
                    if (fontSize >= 16) {
                        readableTextCount++;
                    }
                }
            });

            const textReadable = totalTextElements === 0 || (readableTextCount / totalTextElements) >= 0.8;
            if (!textReadable) {
                issues.push(`Small text detected: ${readableTextCount}/${totalTextElements} elements have readable font size (16px+)`);
            }

            return {
                width: bp.width,
                height: bp.height,
                issues,
                hasHorizontalScroll,
                contentOverflow,
                textReadable,
                bodyWidth: document.body.scrollWidth,
                viewportWidth: window.innerWidth
            };
        }, breakpoint);

        let breakpointScore = 100;
        if (breakpointAnalysis.hasHorizontalScroll) breakpointScore -= 30;
        if (breakpointAnalysis.contentOverflow) breakpointScore -= 20;
        if (!breakpointAnalysis.textReadable) breakpointScore -= 25;

        breakpointAnalysis.score = Math.max(0, breakpointScore);
        totalScore += breakpointAnalysis.score;
        results.push(breakpointAnalysis);
    }

    const cssAnalysis = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        let mediaQueries = 0;
        let flexboxUsage = false;
        let gridUsage = false;

        try {
            styleSheets.forEach(sheet => {
                try {
                    if (sheet.cssRules) {
                        Array.from(sheet.cssRules).forEach(rule => {
                            if (rule.type === CSSRule.MEDIA_RULE) {
                                mediaQueries++;
                            }
                            if (rule.type === CSSRule.STYLE_RULE) {
                                const styleRule = rule as CSSStyleRule;
                                const cssText = styleRule.style.cssText.toLowerCase();
                                if (cssText.includes('flex') || cssText.includes('flexbox')) {
                                    flexboxUsage = true;
                                }
                                if (cssText.includes('grid') || cssText.includes('display: grid')) {
                                    gridUsage = true;
                                }
                            }
                        });
                    }
                } catch (e) {
                    // Skip sheets we can't access (CORS)
                }
            });
        } catch (e) {
            console.warn('CSS analysis failed:', e);
        }

        const images = Array.from(document.querySelectorAll('img'));
        const responsiveImages = images.filter(img => {
            return img.hasAttribute('srcset') ||
                img.style.maxWidth === '100%' ||
                window.getComputedStyle(img).maxWidth === '100%';
        });

        const imageResponsiveness = images.length > 0 ? (responsiveImages.length / images.length) * 100 : 100;

        return {
            mediaQueries,
            flexboxUsage,
            gridUsage,
            imageResponsiveness: Math.round(imageResponsiveness)
        };
    });

    const averageScore = totalScore / breakpoints.length;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (cssAnalysis.mediaQueries < 3) {
        issues.push(`Limited responsive CSS: only ${cssAnalysis.mediaQueries} media queries found`);
        recommendations.push('Add more CSS media queries for different screen sizes');
    }

    if (!cssAnalysis.flexboxUsage && !cssAnalysis.gridUsage) {
        issues.push('No modern CSS layout methods detected (flexbox/grid)');
        recommendations.push('Use CSS flexbox or grid for better responsive layouts');
    }

    if (cssAnalysis.imageResponsiveness < 80) {
        issues.push(`${100 - cssAnalysis.imageResponsiveness}% of images are not responsive`);
        recommendations.push('Make images responsive with max-width: 100% or srcset attributes');
    }

    const fontSizeResponsive = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.some(el => {
            const style = window.getComputedStyle(el);
            return style.fontSize.includes('vw') ||
                style.fontSize.includes('vh') ||
                style.fontSize.includes('em') ||
                style.fontSize.includes('rem');
        });
    });

    if (!fontSizeResponsive) {
        issues.push('Typography not responsive (no relative units detected)');
        recommendations.push('Use relative units (em, rem, vw) for responsive typography');
    }

    return {
        score: Math.round(averageScore),
        breakpoints: results,
        mediaQueries: cssAnalysis.mediaQueries,
        flexboxUsage: cssAnalysis.flexboxUsage,
        gridUsage: cssAnalysis.gridUsage,
        imageResponsiveness: cssAnalysis.imageResponsiveness,
        fontSizeResponsive,
        issues,
        recommendations
    };
}

/**
 * Mobile friendly scoring
 */
export function calculateMobileFriendlyScore(
    viewportAnalysis: any,
    touchTargets: any,
    responsiveDesign: any,
    pageSpeed: any,
    images: any[]
) {
    const scores = {
        viewport: 0,
        touchTargets: 0,
        responsiveDesign: 0,
        textReadability: 0,
        imageOptimization: 0,
        pageSpeed: 0
    } as any;

    if (viewportAnalysis.isOptimal) {
        scores.viewport = 20;
    } else if (viewportAnalysis.hasWidth && viewportAnalysis.hasInitialScale) {
        scores.viewport = 15;
    } else if (viewportAnalysis.hasWidth || viewportAnalysis.hasInitialScale) {
        scores.viewport = 10;
    } else {
        scores.viewport = 0;
    }

    scores.touchTargets = Math.round((touchTargets.score / 100) * 20);
    scores.responsiveDesign = Math.round((responsiveDesign.score / 100) * 25);

    const readableBreakpoints = responsiveDesign.breakpoints.filter((bp: any) => bp.textReadable);
    scores.textReadability = Math.round((readableBreakpoints.length / responsiveDesign.breakpoints.length) * 15);

    if (images.length === 0) {
        scores.imageOptimization = 10;
    } else {
        const responsiveImages = responsiveDesign.imageResponsiveness;
        scores.imageOptimization = Math.round((responsiveImages / 100) * 10);
    }

    if (pageSpeed.loadTime) {
        if (pageSpeed.loadTime < 3000) scores.pageSpeed = 10;
        else if (pageSpeed.loadTime < 5000) scores.pageSpeed = 7;
        else if (pageSpeed.loadTime < 8000) scores.pageSpeed = 4;
        else scores.pageSpeed = 1;
    } else {
        scores.pageSpeed = 5;
    }

    const overall = (Object.values(scores) as number[]).reduce((sum, score) => sum + score, 0);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    const issues = [
        ...viewportAnalysis.issues,
        ...responsiveDesign.issues
    ];

    if (touchTargets.tooSmall > 0) {
        issues.push(`${touchTargets.tooSmall} touch targets are too small`);
    }
    if (touchTargets.tooClose > 0) {
        issues.push(`${touchTargets.tooClose} touch targets are too close together`);
    }

    const recommendations = [
        ...viewportAnalysis.recommendations,
        ...responsiveDesign.recommendations
    ];

    if (scores.touchTargets < 15) {
        recommendations.push('Increase touch target sizes to at least 44x44 pixels');
        recommendations.push('Add adequate spacing between interactive elements');
    }

    if (scores.pageSpeed < 7) {
        recommendations.push('Improve page loading speed for better mobile experience');
    }

    return {
        overall,
        breakdown: scores,
        grade,
        issues: issues.slice(0, 20),
        recommendations: recommendations.slice(0, 15)
    };
}

/**
 * Backlink / Anchor text helpers
 */
export function calculateDomainAuthority(domain: string, backlinks: any[], age: number, trustMetrics: any): number {
    let authority = 0;

    if (age > 10) authority += 20;
    else if (age > 5) authority += 15;
    else if (age > 2) authority += 10;
    else if (age > 1) authority += 5;

    const qualityBacklinks = backlinks.filter(bl => bl.authority > 30 && bl.spamScore < 30);
    const backlinkScore = Math.min(40, qualityBacklinks.length * 2);
    authority += backlinkScore;

    const uniqueDomains = new Set(backlinks.map(bl => bl.domain)).size;
    const diversityScore = Math.min(25, uniqueDomains * 0.5);
    authority += diversityScore;

    if (trustMetrics.trustFlow > 50) authority += 15;
    else if (trustMetrics.trustFlow > 30) authority += 10;
    else if (trustMetrics.trustFlow > 15) authority += 5;

    return Math.min(100, Math.round(authority));
}

export function calculatePageAuthority(pageUrl: string, pageBacklinks: any[], domainAuthority: number): number {
    let authority = domainAuthority * 0.3;

    const qualityPageBacklinks = pageBacklinks.filter(bl => bl.authority > 20 && bl.spamScore < 40);
    authority += Math.min(40, qualityPageBacklinks.length * 3);

    const internalLinks = pageBacklinks.filter(bl => bl.type === 'internal');
    authority += Math.min(15, internalLinks.length * 0.5);

    const anchorTexts = new Set(pageBacklinks.map(bl => bl.anchorText));
    authority += Math.min(15, anchorTexts.size * 0.3);

    return Math.min(100, Math.round(authority));
}

export function calculateAnchorDiversityScore(anchors: any[]): number {
    if (anchors.length === 0) return 0;

    let diversity = 0;
    const total = anchors.reduce((sum, a) => sum + a.count, 0);

    anchors.forEach(anchor => {
        const proportion = anchor.count / total;
        if (proportion > 0) {
            diversity -= proportion * Math.log2(proportion);
        }
    });

    const maxDiversity = Math.log2(Math.min(anchors.length, 20));
    return Math.round((diversity / maxDiversity) * 100);
}

export function generateAnchorRecommendations(
    brandedRatio: number,
    exactMatchRatio: number,
    diversityScore: number,
    overOptimizedAnchors: string[],
    spammyAnchors: string[]
): string[] {
    const recommendations: string[] = [];

    if (brandedRatio < 30) {
        recommendations.push('Increase branded anchor text ratio to 30-40% for natural link profile');
    }

    if (exactMatchRatio > 20) {
        recommendations.push('Reduce exact match anchor text ratio below 15% to avoid over-optimization');
    }

    if (diversityScore < 60) {
        recommendations.push('Improve anchor text diversity with more varied, natural anchor texts');
    }

    if (overOptimizedAnchors.length > 0) {
        recommendations.push(`Address over-optimized anchors: ${overOptimizedAnchors.slice(0, 3).join(', ')}`);
    }

    if (spammyAnchors.length > 0) {
        recommendations.push(`Review and potentially disavow spammy anchor texts: ${spammyAnchors.slice(0, 2).join(', ')}`);
    }

    return recommendations;
}

export function categorizeAnchorText(text: string, brandName?: string): 'branded' | 'exact-match' | 'partial-match' | 'generic' | 'naked-url' | 'image' {
    const lowerText = text.toLowerCase();

    if (brandName && lowerText.includes(brandName.toLowerCase())) {
        return 'branded';
    }

    if (lowerText.includes('http') || lowerText.includes('www.') || lowerText.match(/\.\w{2,4}$/)) {
        return 'naked-url';
    }

    if (lowerText.includes('[image]') || lowerText.includes('<img') || lowerText === 'image') {
        return 'image';
    }

    const genericTerms = ['click here', 'read more', 'learn more', 'website', 'homepage', 'link', 'here', 'this', 'more'];
    if (genericTerms.some(term => lowerText.includes(term))) {
        return 'generic';
    }

    if (text.split(' ').length > 3) {
        return 'partial-match';
    }

    return 'exact-match';
}

export function assessAnchorRisk(text: string, percentage: number, type: string): 'low' | 'medium' | 'high' {
    if (percentage > 20 && type === 'exact-match') return 'high';
    if (percentage > 30 && type !== 'branded') return 'high';
    if (text.length > 100) return 'high';

    const spamIndicators = ['buy', 'cheap', 'best', 'top rated', 'discount', 'sale'];
    if (spamIndicators.some(indicator => text.toLowerCase().includes(indicator)) && percentage > 10) {
        return 'high';
    }

    if (percentage > 10 && type === 'exact-match') return 'medium';
    if (percentage > 15 && type === 'partial-match') return 'medium';

    return 'low';
}

export function analyzeAnchorTexts(backlinks: any[], brandName?: string) {
    const anchorMap: Record<string, { count: number; domains: Set<string>; examples: any[] }> = {};
    const totalAnchors = backlinks.length;

    backlinks.forEach(link => {
        const anchor = (link.anchorText || '').trim().toLowerCase();
        if (!anchor || anchor === '') return;

        if (!anchorMap[anchor]) {
            anchorMap[anchor] = { count: 0, domains: new Set(), examples: [] };
        }

        anchorMap[anchor].count++;
        anchorMap[anchor].domains.add(link.domain);
        if (anchorMap[anchor].examples.length < 3) {
            anchorMap[anchor].examples.push({
                domain: link.domain,
                url: link.url,
                authority: link.authority || 0
            });
        }
    });

    const anchorDistribution = Object.entries(anchorMap)
        .map(([text, data]) => {
            const percentage = (data.count / totalAnchors) * 100;
            const type = categorizeAnchorText(text, brandName);
            const riskLevel = assessAnchorRisk(text, percentage, type);

            return {
                text,
                count: data.count,
                percentage: Math.round(percentage * 100) / 100,
                type,
                riskLevel,
                referringDomains: Array.from(data.domains),
                examples: data.examples
            };
        })
        .sort((a, b) => b.count - a.count);

    const brandedAnchors = anchorDistribution.filter(a => a.type === 'branded');
    const exactMatchAnchors = anchorDistribution.filter(a => a.type === 'exact-match');

    const brandedRatio = brandedAnchors.reduce((sum, a) => sum + a.percentage, 0);
    const exactMatchRatio = exactMatchAnchors.reduce((sum, a) => sum + a.percentage, 0);
    const diversityScore = calculateAnchorDiversityScore(anchorDistribution);

    const overOptimizedAnchors = anchorDistribution
        .filter(a => a.percentage > 15 && a.type === 'exact-match')
        .map(a => a.text);

    const spammyAnchors = anchorDistribution
        .filter(a => a.riskLevel === 'high')
        .map(a => a.text);

    const recommendations = generateAnchorRecommendations(
        brandedRatio,
        exactMatchRatio,
        diversityScore,
        overOptimizedAnchors,
        spammyAnchors
    );

    return {
        totalAnchors,
        anchorDistribution: anchorDistribution.slice(0, 50),
        riskAnalysis: {
            overOptimizedAnchors,
            spammyAnchors,
            brandedRatio: Math.round(brandedRatio * 100) / 100,
            exactMatchRatio: Math.round(exactMatchRatio * 100) / 100,
            diversityScore,
            recommendations
        }
    };
}
