export interface AnalyzeResult {
    url: string;
    timestamp: string;
    metadata: {
        favicon?: { exists: boolean; url?: string; status?: number; contentType?: string };
        logo?: { src?: string; alt?: string; title?: string; width?: number; height?: number; detectedBy?: string };
        brandColors?: Array<{ hex: string; source: string }>;
        title?: string;
        metaDescription?: string;
        metaKeywords?: string;
        canonicalUrl?: string;
        robots?: string;
        viewport?: string;
        charset?: string;
        lang?: string;
        author?: string;
        og: Record<string, any>;
        twitter: Record<string, any>;
        schema?: any[];
        h1s: string[];
        h2s: string[];
        h3s: string[];
        allHeadings: Array<{ tag: string; text: string; level: number }>;
        images: Array<{ src: string; alt: string; title?: string; width?: string; height?: string; naturalWidth?: number; naturalHeight?: number; missingAlt?: boolean; altQuality?: 'good' | 'poor' | 'missing' }>;
        links: Array<{ href: string; text: string; title?: string; rel?: string; external: boolean; broken?: boolean; status?: number }>;
        forms: Array<{ action: string; method: string; inputs: number }>;
        scripts: Array<{ src?: string; inline: boolean; async: boolean; defer: boolean }>;
        styles: Array<{ href?: string; inline: boolean; media?: string }>;
        fontFamilies: string[];
        wordCount: number;
        readabilityScore?: number;
        robotsTxt?: { exists: boolean; content?: string; sitemaps?: string[] };
        sitemapXml?: { exists: boolean; url?: string };
    };
    backlinks: {
        overview: {
            totalBacklinks: number;
            referringDomains: number;
            followLinks: number;
            nofollowLinks: number;
            domainAuthority: number;
            pageAuthority: number;
            spamScore: number;
            trustFlow: number;
            citationFlow: number;
            lastUpdated: string;
        };
        referringDomains: Array<{
            domain: string;
            domainAuthority: number;
            pageAuthority: number;
            spamScore: number;
            backlinksCount: number;
            firstSeen: string;
            lastSeen: string;
            linkType: 'dofollow' | 'nofollow';
            linkStatus: 'active' | 'lost' | 'broken';
            anchorTexts: Array<{ text: string; count: number; percentage: number }>;
            sourcePages: Array<{ url: string; title: string; authority: number }>;
        }>;
        anchorTextAnalysis: {
            totalAnchors: number;
            anchorDistribution: Array<{
                text: string;
                count: number;
                percentage: number;
                type: 'branded' | 'exact-match' | 'partial-match' | 'generic' | 'naked-url' | 'image';
                riskLevel: 'low' | 'medium' | 'high';
                referringDomains: string[];
                examples: Array<{ domain: string; url: string; authority: number }>;
            }>;
            riskAnalysis: {
                overOptimizedAnchors: string[];
                spammyAnchors: string[];
                brandedRatio: number;
                exactMatchRatio: number;
                diversityScore: number;
                recommendations: string[];
            };
        };
        spamAnalysis: {
            overallSpamScore: number;
            riskLevel: 'low' | 'medium' | 'high' | 'very-high';
            spamSignals: Array<{
                signal: string;
                severity: 'low' | 'medium' | 'high' | 'critical';
                description: string;
                affectedDomains: number;
                recommendation: string;
            }>;
            toxicDomains: Array<{
                domain: string;
                spamScore: number;
                toxicityReasons: string[];
                backlinksCount: number;
                recommendation: 'disavow' | 'monitor' | 'keep';
            }>;
            disavowRecommendations: Array<{
                domain: string;
                reason: string;
                priority: 'high' | 'medium' | 'low';
                expectedImpact: string;
            }>;
        };
        linkGrowth: {
            trend: 'growing' | 'stable' | 'declining';
            newLinksLast30Days: number;
            lostLinksLast30Days: number;
            netGrowth: number;
            growthRate: number;
            monthlyData: Array<{
                month: string;
                newLinks: number;
                lostLinks: number;
                netGrowth: number;
                referringDomains: number;
            }>;
        };
        topPages: Array<{
            url: string;
            title: string;
            backlinks: number;
            referringDomains: number;
            pageAuthority: number;
            traffic: number;
            topKeywords: string[];
        }>;
        competitorComparison: {
            averageDomainAuthority: number;
            averageBacklinks: number;
            averageReferringDomains: number;
            positionVsCompetitors: number;
            strengthsVsCompetitors: string[];
            weaknessesVsCompetitors: string[];
            opportunities: string[];
        };
        linkOpportunities: Array<{
            domain: string;
            url: string;
            authority: number;
            relevanceScore: number;
            difficulty: 'easy' | 'medium' | 'hard';
            contactInfo?: string;
            reason: string;
            potentialValue: 'high' | 'medium' | 'low';
        }>;
        alerts: Array<{
            type: 'new-backlink' | 'lost-backlink' | 'spam-detected' | 'authority-change';
            severity: 'info' | 'warning' | 'critical';
            message: string;
            domain?: string;
            url?: string;
            timestamp: string;
            actionRequired?: string;
        }>;
    };
    seoAnalysis: {
        titleLength: number;
        descriptionLength: number;
        hasH1: boolean;
        h1Count: number;
        hasMetaDescription: boolean;
        hasMetaKeywords: boolean;
        hasCanonical: boolean;
        hasRobots: boolean;
        hasViewport: boolean;
        imagesWithoutAlt: number;
        imagesWithPoorAlt: number;
        imagesWithGoodAlt: number;
        linksWithoutTitle: number;
        internalLinksCount: number;
        externalLinksCount: number;
        brokenLinksCount: number;
        seoIssues: string[];
        recommendations: string[];
        keywordAnalysis: {
            topKeywords: Array<{ keyword: string; count: number; density: number; prominence: number }>;
            keywordDensity: number;
            overOptimizedKeywords: string[];
            underOptimizedKeywords: string[];
            keywordDistribution: {
                title: Record<string, number>;
                description: Record<string, number>;
                headings: Record<string, number>;
                content: Record<string, number>;
                altText: Record<string, number>;
            };
        };
        internalLinkingStructure: {
            depth: number;
            orphanPages: number;
            linkEquity: number;
            anchorTextAnalysis: Array<{ text: string; count: number; targets: string[] }>;
            topLinkedPages: Array<{ url: string; inboundLinks: number; anchorTexts: string[] }>;
            linkingIssues: string[];
            recommendations: string[];
        };
        duplicateContent: {
            duplicateElements: Array<{ type: 'title' | 'description' | 'heading' | 'content'; content: string; count: number; locations: string[] }>;
            duplicatePercentage: number;
            issues: string[];
            recommendations: string[];
        };
    };
    performance: {
        lighthouse: {
            performanceScore?: number;
            accessibilityScore?: number;
            bestPracticesScore?: number;
            seoScore?: number;
            pwaScore?: number;
            metrics: Record<string, any>;
            audits: Record<string, any>;
            opportunities: Array<{ title: string; description: string; savings?: string }>;
        };
        pageSpeed: {
            loadTime?: number;
            domContentLoaded?: number;
            firstContentfulPaint?: number;
            largestContentfulPaint?: number;
            cumulativeLayoutShift?: number;
            timeToInteractive?: number;
        };
    };
    technical: {
        statusCode: number;
        responseHeaders: Record<string, string>;
        serverTechnology?: string;
        securityHeaders: {
            hasHttps: boolean;
            hasHSTS: boolean;
            hasCSP: boolean;
            hasXFrameOptions: boolean;
            hasXContentTypeOptions: boolean;
        };
        mobileOptimization: {
            hasViewport: boolean;
            isResponsive?: boolean;
            mobileScore?: number;
            viewportAnalysis?: {
                content: string;
                hasWidth: boolean;
                hasInitialScale: boolean;
                hasUserScalable: boolean;
                width: string;
                initialScale: string;
                userScalable: string;
                isOptimal: boolean;
                issues: string[];
                recommendations: string[];
            };
            touchTargets?: {
                totalElements: number;
                tooSmall: number;
                tooClose: number;
                adequateSize: number;
                score: number;
                issues: Array<{
                    element: string;
                    issue: string;
                    position: { x: number; y: number };
                    size: { width: number; height: number };
                }>;
            };
            responsiveDesign?: {
                score: number;
                breakpoints: Array<{
                    width: number;
                    height: number;
                    issues: string[];
                    hasHorizontalScroll: boolean;
                    contentOverflow: boolean;
                    textReadable: boolean;
                }>;
                mediaQueries: number;
                flexboxUsage: boolean;
                gridUsage: boolean;
                imageResponsiveness: number;
                fontSizeResponsive: boolean;
                issues: string[];
                recommendations: string[];
            };
            mobileFriendlyScore?: {
                overall: number;
                breakdown: {
                    viewport: number;
                    touchTargets: number;
                    responsiveDesign: number;
                    textReadability: number;
                    imageOptimization: number;
                    pageSpeed: number;
                };
                grade: 'A' | 'B' | 'C' | 'D' | 'F';
                issues: string[];
                recommendations: string[];
            };
        };
    };
    colors: Array<{ hex: string; population: number; name: string }>;
    screenshot?: string;
    accessibility: {
        issues: Array<{ type: string; description: string; impact: string; help?: string; nodes?: number }>;
        score?: number; // 0-100 based on axe severity weighting
        recommendations: string[];
        raw?: any;
    };
    content: {
        textContent: string;
        wordCount: number;
        readingTime: number;
        languageDetection?: string;
        sentiment?: 'positive' | 'negative' | 'neutral';
        readabilityScores: {
            fleschKincaid: number;
            fleschReadingEase: number;
            gunningFog: number;
            colemanLiau: number;
            automatedReadabilityIndex: number;
            smog: number;
            averageGradeLevel: number;
            readabilityGrade: 'very-easy' | 'easy' | 'fairly-easy' | 'standard' | 'fairly-difficult' | 'difficult' | 'very-difficult';
        };
        plagiarismCheck: {
            duplicateContentPercentage: number;
            suspiciousBlocks: Array<{
                text: string;
                startIndex: number;
                endIndex: number;
                similarity: number;
                potentialSource?: string;
            }>;
            uniquenessScore: number;
            riskLevel: 'low' | 'medium' | 'high';
        };
        thinContentAnalysis: {
            isThinContent: boolean;
            contentDepthScore: number;
            uniqueParagraphs: number;
            averageParagraphLength: number;
            sentenceComplexity: number;
            topicCoverage: number;
            issues: string[];
            recommendations: string[];
        };
        seoContentSuggestions: {
            metaTagSuggestions: {
                title: {
                    current: string;
                    suggestions: string[];
                    optimalLength: string;
                    issues: string[];
                };
                description: {
                    current: string;
                    suggestions: string[];
                    optimalLength: string;
                    issues: string[];
                };
                keywords: {
                    current: string;
                    suggestions: string[];
                    issues: string[];
                };
            };
            headingSuggestions: {
                missingH1: boolean;
                multipleH1: boolean;
                headingStructure: Array<{
                    level: number;
                    current: string;
                    suggestions: string[];
                    issues: string[];
                }>;
                hierarchyIssues: string[];
            };
            contentLengthAnalysis: {
                currentLength: number;
                recommendedMinLength: number;
                recommendedMaxLength: number;
                contentType: 'blog-post' | 'product-page' | 'landing-page' | 'about-page' | 'other';
                lengthVerdict: 'too-short' | 'optimal' | 'too-long';
                suggestions: string[];
            };
        };
    };
}