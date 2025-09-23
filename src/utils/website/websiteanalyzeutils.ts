import axios from 'axios';
import cheerio, { CheerioAPI } from 'cheerio';
import { URL } from 'url';
import { parse } from 'css';
import puppeteer, { Browser } from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Interface definitions
export interface WebsiteAnalysis {
    url: string;
    metadata: Metadata;
    performance: PerformanceMetrics;
    fonts: FontInfo;
    colors: ColorInfo;
    spacing: SpacingInfo;
    dimensions: DimensionInfo;
    mediaQueries: string[];
    cssStats: CSSStats;
    externalStylesheets: ExternalStylesheet[];
    structure: PageStructure;
    screenshots: ScreenshotData;
    seoAnalysis: SEOAnalysis;
    accessibility: AccessibilityAnalysis;
    security: SecurityAnalysis;
    coreWebVitals: CoreWebVitals;
    cssVariables?: CSSVariableInfo;
}

export interface SEOAnalysis {
    metaTags: MetaTagsAnalysis;
    structuredData: StructuredDataAnalysis;
    canonicalTag: CanonicalAnalysis;
    robotsMeta: RobotsMetaAnalysis;
    socialMedia: SocialMediaAnalysis;
    contentQuality: ContentQualityAnalysis;
    internalLinking: InternalLinkingAnalysis;
    mobileOptimization: MobileOptimizationAnalysis;
    keywordOptimization: KeywordOptimizationAnalysis;
}

export interface AccessibilityAnalysis {
    contrastRatio: ContrastRatioAnalysis;
    altAttributes: AltAttributeAnalysis;
    ariaLabels: AriaLabelAnalysis;
    headingStructure: HeadingStructureAnalysis;
    focusManagement: FocusAnalysis;
    colorAccessibility: ColorAccessibilityAnalysis;
}

export interface SecurityAnalysis {
    httpsStatus: boolean;
    sslCertificate: SSLCertificateInfo;
    securityHeaders: SecurityHeadersAnalysis;
    mixedContent: MixedContentAnalysis;
    vulnerabilities: VulnerabilityAnalysis;
}

export interface CoreWebVitals {
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    firstContentfulPaint: number;
    timeToInteractive: number;
    totalBlockingTime: number;
    performanceScore: number;
}

// Additional interface definitions for enhanced analysis
export interface MetaTagsAnalysis {
    titleOptimization: {
        current: string;
        length: number;
        optimal: boolean;
        suggestions: string[];
        issues: string[];
    };
    descriptionOptimization: {
        current: string;
        length: number;
        optimal: boolean;
        suggestions: string[];
        issues: string[];
    };
    keywordsAnalysis: {
        current: string;
        density: number;
        suggestions: string[];
        issues: string[];
    };
}

export interface StructuredDataAnalysis {
    hasStructuredData: boolean;
    schemas: Array<{
        type: string;
        valid: boolean;
        errors: string[];
    }>;
    recommendations: string[];
}

export interface CanonicalAnalysis {
    hasCanonical: boolean;
    canonicalUrl: string;
    issues: string[];
    selfReferencing: boolean;
}

export interface RobotsMetaAnalysis {
    hasRobotsMeta: boolean;
    content: string;
    directives: string[];
    issues: string[];
}

export interface SocialMediaAnalysis {
    openGraph: {
        complete: boolean;
        missing: string[];
        issues: string[];
    };
    twitterCard: {
        complete: boolean;
        missing: string[];
        issues: string[];
    };
}

export interface ContentQualityAnalysis {
    wordCount: number;
    readabilityScore: number;
    uniqueContent: boolean;
    contentDepth: number;
    topicRelevance: number;
    recommendations: string[];
}

export interface InternalLinkingAnalysis {
    internalLinksCount: number;
    externalLinksCount: number;
    brokenLinksCount: number;
    linkDistribution: string[];
    recommendations: string[];
}

export interface MobileOptimizationAnalysis {
    viewportConfigured: boolean;
    touchElements: number;
    textReadability: boolean;
    mobileScore: number;
    issues: string[];
}

export interface KeywordOptimizationAnalysis {
    primaryKeywords: Array<{
        keyword: string;
        density: number;
        positions: string[];
    }>;
    keywordStuffing: boolean;
    semanticKeywords: string[];
    recommendations: string[];
}

export interface ContrastRatioAnalysis {
    averageContrastRatio: number;
    failingElements: number;
    wcagLevel: string;
    recommendations: string[];
}

export interface AltAttributeAnalysis {
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    altQuality: string;
    recommendations: string[];
}

export interface AriaLabelAnalysis {
    elementsWithAria: number;
    missingAriaLabels: number;
    ariaCompliance: string;
    recommendations: string[];
}

export interface HeadingStructureAnalysis {
    properHierarchy: boolean;
    missingLevels: number[];
    multipleH1: boolean;
    recommendations: string[];
}

export interface FocusAnalysis {
    focusableElements: number;
    tabOrder: boolean;
    skipLinks: boolean;
    recommendations: string[];
}

export interface ColorAccessibilityAnalysis {
    colorOnlyInfo: boolean;
    contrastIssues: number;
    colorBlindFriendly: boolean;
    recommendations: string[];
}

export interface SSLCertificateInfo {
    valid: boolean;
    issuer: string;
    expiryDate: string;
    keySize: number;
    issues: string[];
}

export interface SecurityHeadersAnalysis {
    contentSecurityPolicy: boolean;
    strictTransportSecurity: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
    score: number;
    recommendations: string[];
}

export interface MixedContentAnalysis {
    hasMixedContent: boolean;
    mixedContentItems: Array<{
        type: string;
        url: string;
        risk: string;
    }>;
    recommendations: string[];
}

export interface VulnerabilityAnalysis {
    knownVulnerabilities: Array<{
        type: string;
        severity: string;
        description: string;
    }>;
    riskScore: number;
    recommendations: string[];
}

export interface Metadata {
    title: string;
    description: string;
    keywords: string;
    author: string;
    viewport: string;
    charset: string;
    openGraph: OpenGraph;
    twitter: TwitterCard;
}

export interface OpenGraph {
    title: string;
    description: string;
    image: string;
    url: string;
}

export interface TwitterCard {
    card: string;
    title: string;
    description: string;
    image: string;
}

export interface PerformanceMetrics {
    loadTime: string;
    pageSize: string;
    httpStatus: number;
}

export interface FontInfo {
    families: string[];
    sizes: string[];
    weights: string[];
    styles: string[];
}

export interface ColorInfo {
    text: string[];
    background: string[];
    border: string[];
    other: string[];
}

export interface SpacingInfo {
    margins: string[];
    paddings: string[];
    gaps: string[];
}

export interface DimensionInfo {
    widths: string[];
    heights: string[];
    maxWidths: string[];
    maxHeights: string[];
    minWidths: string[];
    minHeights: string[];
}

export interface CSSStats {
    inlineStyles: number;
    styleTags: number;
    externalStylesheets: number;
    idSelectors: number;
    classSelectors: number;
    elementSelectors: number;
}

export interface CSSVariableUsage {
    property: string;
    selector?: string;
    rawValue: string;
    resolvedValue?: string;
}

export interface CSSVariableInfo {
    variables: Record<string, string>; // --name: value
    usages: CSSVariableUsage[];
    unresolved: string[]; // variable names that could not be resolved
}

export interface ExternalStylesheet {
    url: string;
    size: string;
    content?: string;
}

export interface PageStructure {
    headings: {
        h1: string[];
        h2: string[];
        h3: string[];
        h4: string[];
        h5: string[];
        h6: string[];
    };
    images: number;
    links: {
        internal: number;
        external: number;
    };
    scripts: number;
    forms: number;
}

export interface ScreenshotData {
    desktop: string; // Base64 encoded screenshot
    mobile: string;  // Base64 encoded screenshot
}

// Include CSS variable data in overall analysis

// Main analysis function
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    const startTime = Date.now();
    try {
        // Normalize and validate URL: ensure protocol is present
        let pageUrl = url;
        try {
            new URL(pageUrl);
        } catch (e) {
            pageUrl = `https://${url}`;
            new URL(pageUrl); // may still throw
        }

        const response = await axios.get(pageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 1500000,
            validateStatus: (status) => status < 500
        });
        const loadTime = Date.now() - startTime;
        const $ = cheerio.load(response.data, { xmlMode: true, decodeEntities: false, recognizeCDATA: true });
        const pageHostname = new URL(pageUrl).hostname;
        const externalStylesheets = await extractExternalStylesheets($, pageUrl);

        // Extract CSS custom properties (variables) first so we can resolve var(...) usages elsewhere
        const cssVariables = extractCSSVariables($, externalStylesheets);

        const [metadata, fonts, colors, spacing, dimensions, mediaQueries, cssStats, structure, screenshots, seoAnalysis, accessibility, security, coreWebVitals] = await Promise.all([
            extractMetadata($),
            extractFonts($, externalStylesheets),
            extractColors($, externalStylesheets, cssVariables),
            extractSpacing($, externalStylesheets),
            extractDimensions($, externalStylesheets),
            extractMediaQueries($, externalStylesheets),
            extractCSSStats($, externalStylesheets),
            extractStructure($, pageHostname),
            captureScreenshots(pageUrl),
            performSEOAnalysis($, pageUrl, response.data),
            performAccessibilityAnalysis($, pageUrl),
            performSecurityAnalysis($, pageUrl, response.headers),
            measureCoreWebVitals(pageUrl)
        ]);
        return {
            url: pageUrl,
            metadata,
            performance: { loadTime: `${loadTime}ms`, pageSize: `${(response.data.length / 1024).toFixed(2)} KB`, httpStatus: response.status },
            fonts,
            colors,
            spacing,
            dimensions,
            mediaQueries,
            cssStats,
            externalStylesheets,
            cssVariables,
            structure,
            screenshots,
            seoAnalysis,
            accessibility,
            security,
            coreWebVitals
        };
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        throw new Error(`Website analysis failed: ${errorMessage}`);
    }
}

// Helper function to safely get attribute values
function safeGetAttr($: CheerioAPI, selector: string, attr: string, defaultValue: string = 'Not found'): string {
    const element = $(selector);
    return element.length ? (element.attr(attr) || defaultValue) : defaultValue;
}

// Helper function to safely get text content
function safeGetText($: CheerioAPI, selector: string, defaultValue: string = 'Not found'): string {
    const element = $(selector);
    return element.length ? (element.text().trim() || defaultValue) : defaultValue;
}

// Metadata extraction
function extractMetadata($: CheerioAPI): Metadata {
    const title = $('head title').text() || $('meta[property="og:title"]').attr('content') || 'Not found';
    const description = $('meta[name="description"]').attr('content') || 'Not found';
    const keywords = $('meta[name="keywords"]').attr('content') || 'Not found';

    return {
        title,
        description,
        keywords,
        author: safeGetAttr($, 'meta[name="author"]', 'content'),
        viewport: safeGetAttr($, 'meta[name="viewport"]', 'content'),
        charset: safeGetAttr($, 'meta[charset]', 'charset'),
        openGraph: {
            title: safeGetAttr($, 'meta[property="og:title"]', 'content'),
            description: safeGetAttr($, 'meta[property="og:description"]', 'content'),
            image: safeGetAttr($, 'meta[property="og:image"]', 'content'),
            url: safeGetAttr($, 'meta[property="og:url"]', 'content')
        },
        twitter: {
            card: safeGetAttr($, 'meta[name="twitter:card"]', 'content'),
            title: safeGetAttr($, 'meta[name="twitter:title"]', 'content'),
            description: safeGetAttr($, 'meta[name="twitter:description"]', 'content'),
            image: safeGetAttr($, 'meta[name="twitter:image"]', 'content')
        }
    };
}

// Font extraction
function extractFonts($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): FontInfo {
    const fonts: FontInfo = { families: [], sizes: [], weights: [], styles: [] };
    $('[style]').each((i, el) => { const style = $(el).attr('style'); if (style) extractFontProperties(style, fonts); });
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) extractFontsFromCSS(cssText, fonts); });
    $('link[rel="stylesheet"]').each((i, el) => { const href = $(el).attr('href'); if (href && (href.includes('font') || href.includes('typeface'))) fonts.families.push(`External font from: ${href}`); });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) extractFontsFromCSS(s.content, fonts); });
    return fonts;
}

function extractFontProperties(style: string, fonts: FontInfo): void {
    // Extract font-family
    const fontFamilyMatch = style.match(/font-family\s*:\s*([^;]+)/i);
    if (fontFamilyMatch) {
        fontFamilyMatch[1].split(',').forEach(font => {
            const cleanFont = font.trim().replace(/['"]/g, '');
            if (cleanFont && !fonts.families.includes(cleanFont)) {
                fonts.families.push(cleanFont);
            }
        });
    }

    // Extract font-size
    const fontSizeMatch = style.match(/font-size\s*:\s*([^;]+)/i);
    if (fontSizeMatch) {
        const size = fontSizeMatch[1].trim();
        if (!fonts.sizes.includes(size)) {
            fonts.sizes.push(size);
        }
    }

    // Extract font-weight
    const fontWeightMatch = style.match(/font-weight\s*:\s*([^;]+)/i);
    if (fontWeightMatch) {
        const weight = fontWeightMatch[1].trim();
        if (!fonts.weights.includes(weight)) {
            fonts.weights.push(weight);
        }
    }

    // Extract font-style
    const fontStyleMatch = style.match(/font-style\s*:\s*([^;]+)/i);
    if (fontStyleMatch) {
        const fontStyle = fontStyleMatch[1].trim();
        if (!fonts.styles.includes(fontStyle)) {
            fonts.styles.push(fontStyle);
        }
    }
}

function extractFontsFromCSS(cssText: string, fonts: FontInfo): void {
    try {
        const ast = parse(cssText);
        if (!ast.stylesheet || !ast.stylesheet.rules) return;
        ast.stylesheet.rules.forEach(rule => {
            if (rule.type === 'rule' && rule.declarations) {
                rule.declarations.forEach((decl: any) => {
                    if (decl.type === 'declaration' && decl.property && decl.value) {
                        if (decl.property === 'font-family') decl.value.split(',').forEach((f: string) => { const clean = f.trim().replace(/['"]/g, ''); if (clean && !fonts.families.includes(clean)) fonts.families.push(clean); });
                        else if (decl.property === 'font-size' && !fonts.sizes.includes(decl.value)) fonts.sizes.push(decl.value);
                        else if (decl.property === 'font-weight' && !fonts.weights.includes(decl.value)) fonts.weights.push(decl.value);
                        else if (decl.property === 'font-style' && !fonts.styles.includes(decl.value)) fonts.styles.push(decl.value);
                    }
                });
            }
            if (rule.type === 'font-face' && (rule as any).declarations) {
                (rule as any).declarations.forEach((decl: any) => { if (decl.type === 'declaration' && decl.property === 'font-family' && decl.value) { const clean = decl.value.replace(/['"]/g, ''); if (clean && !fonts.families.includes(clean)) fonts.families.push(clean); } });
            }
        });
    } catch (e) {
        extractFontsWithRegex(cssText, fonts);
    }
}

// Fallback regex-based font extraction
function extractFontsWithRegex(cssText: string, fonts: FontInfo): void {
    const familyMatches = cssText.match(/font-family\s*:\s*([^;}]+)/gi) || [];
    familyMatches.forEach(m => { const value = m.split(':')[1]?.trim(); if (value) value.split(',').forEach(f => { const clean = f.trim().replace(/['"]/g, ''); if (clean && !fonts.families.includes(clean)) fonts.families.push(clean); }); });
    const sizeMatches = cssText.match(/font-size\s*:\s*([^;}]+)/gi) || [];
    sizeMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !fonts.sizes.includes(v)) fonts.sizes.push(v); });
    const weightMatches = cssText.match(/font-weight\s*:\s*([^;}]+)/gi) || [];
    weightMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !fonts.weights.includes(v)) fonts.weights.push(v); });
    const styleMatches = cssText.match(/font-style\s*:\s*([^;}]+)/gi) || [];
    styleMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !fonts.styles.includes(v)) fonts.styles.push(v); });
}

// Color extraction
function extractColors($: CheerioAPI, externalStylesheets?: ExternalStylesheet[], cssVariables?: CSSVariableInfo): ColorInfo {
    const colors: ColorInfo = { text: [], background: [], border: [], other: [] };
    $('[style]').each((i, el) => { const style = $(el).attr('style'); if (style) extractColorProperties(style, colors); });
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) extractColorsFromCSS(cssText, colors, cssVariables); });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) extractColorsFromCSS(s.content, colors, cssVariables); });
    return colors;
}

function extractColorProperties(style: string, colors: ColorInfo): void {
    const colorProps = [{ prop: 'color', category: 'text' }, { prop: 'background-color', category: 'background' }, { prop: 'border-color', category: 'border' }, { prop: 'border-top-color', category: 'border' }, { prop: 'border-right-color', category: 'border' }, { prop: 'border-bottom-color', category: 'border' }, { prop: 'border-left-color', category: 'border' }, { prop: 'outline-color', category: 'other' }];
    colorProps.forEach(({ prop, category }) => { const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'); const match = style.match(regex); if (match) { const color = match[1].trim(); if (!colors[category as keyof ColorInfo].includes(color)) colors[category as keyof ColorInfo].push(color); } });
}

// (replaced by a version that can resolve CSS variables)

// New: extractColorsFromCSS that can resolve CSS variables using cssVariables map
function extractColorsFromCSS(cssText: string, colors: ColorInfo, cssVariables?: CSSVariableInfo): void {
    try {
        const ast = parse(cssText);
        if (!ast.stylesheet || !ast.stylesheet.rules) return;
        ast.stylesheet.rules.forEach(rule => {
            if (rule.type === 'rule' && (rule as any).declarations) {
                (rule as any).declarations.forEach((decl: any) => {
                    if (decl.type === 'declaration' && decl.property && decl.property.includes('color') && decl.value) {
                        let value = decl.value as string;
                        // Resolve var(--foo, fallback) patterns
                        value = resolveCSSVariablesInValue(value, cssVariables);
                        let category: keyof ColorInfo = 'other';
                        if (decl.property === 'color') category = 'text';
                        else if (decl.property.includes('background')) category = 'background';
                        else if (decl.property.includes('border')) category = 'border';
                        if (!colors[category].includes(value)) colors[category].push(value);
                    }
                });
            }
        });
    } catch (e) {
        extractColorsWithRegex(cssText, colors, cssVariables);
    }
}

// Resolve var(--name, fallback) and var(--name) using cssVariables map when available
function resolveCSSVariablesInValue(value: string, cssVariables?: CSSVariableInfo): string {
    if (!value || !value.includes('var(') || !cssVariables) return value;
    return value.replace(/var\((--[a-zA-Z0-9-_]+)(?:\s*,\s*([^\)]+))?\)/g, function (match: string, varName: string, fallback: string) {
        const key = varName.trim();
        if (cssVariables.variables && key in cssVariables.variables) {
            return cssVariables.variables[key];
        }
        if (fallback) return fallback.trim();
        if (cssVariables.unresolved && !cssVariables.unresolved.includes(key)) cssVariables.unresolved.push(key);
        return match; // keep original var(...) text if unresolved
    });
}

function matchFallbackPlaceholder(varName: string) {
    // placeholder for unresolved variable - keep the var() text so it's clear
    return `var(${varName})`;
}

// Fallback regex-based color extraction
function extractColorsWithRegex(cssText: string, colors: ColorInfo, cssVariables?: CSSVariableInfo): void {
    const colorMatches = cssText.match(/color\s*:\s*([^;}]+)/gi) || [];
    colorMatches.forEach(m => { const v = m.split(':')[1]?.trim(); const resolved = resolveCSSVariablesInValue(v || '', cssVariables); if (resolved && !colors.text.includes(resolved)) colors.text.push(resolved); });
    const bgMatches = cssText.match(/background-color\s*:\s*([^;}]+)/gi) || [];
    bgMatches.forEach(m => { const v = m.split(':')[1]?.trim(); const resolved = resolveCSSVariablesInValue(v || '', cssVariables); if (resolved && !colors.background.includes(resolved)) colors.background.push(resolved); });
    const borderMatches = cssText.match(/border-color\s*:\s*([^;}]+)/gi) || [];
    borderMatches.forEach(m => { const v = m.split(':')[1]?.trim(); const resolved = resolveCSSVariablesInValue(v || '', cssVariables); if (resolved && !colors.border.includes(resolved)) colors.border.push(resolved); });
}

// Spacing extraction
function extractSpacing($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): SpacingInfo {
    const spacing: SpacingInfo = { margins: [], paddings: [], gaps: [] };
    $('[style]').each((i, el) => { const style = $(el).attr('style'); if (style) extractSpacingProperties(style, spacing); });
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) extractSpacingFromCSS(cssText, spacing); });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) extractSpacingFromCSS(s.content, spacing); });
    return spacing;
}

function extractSpacingProperties(style: string, spacing: SpacingInfo): void {
    const marginMatch = style.match(/margin\s*:\s*([^;]+)/i); if (marginMatch) { const margin = marginMatch[1].trim(); if (!spacing.margins.includes(margin)) spacing.margins.push(margin); }
    const paddingMatch = style.match(/padding\s*:\s*([^;]+)/i); if (paddingMatch) { const padding = paddingMatch[1].trim(); if (!spacing.paddings.includes(padding)) spacing.paddings.push(padding); }
    const gapMatch = style.match(/gap\s*:\s*([^;]+)/i); if (gapMatch) { const gap = gapMatch[1].trim(); if (!spacing.gaps.includes(gap)) spacing.gaps.push(gap); }
}

function extractSpacingFromCSS(cssText: string, spacing: SpacingInfo): void {
    try {
        const ast = parse(cssText);
        if (!ast.stylesheet || !ast.stylesheet.rules) return;
        ast.stylesheet.rules.forEach(rule => { if (rule.type === 'rule' && rule.declarations) { rule.declarations.forEach((decl: any) => { if (decl.type === 'declaration' && decl.property && decl.value) { if (decl.property.includes('margin') && !spacing.margins.includes(decl.value)) spacing.margins.push(decl.value); else if (decl.property.includes('padding') && !spacing.paddings.includes(decl.value)) spacing.paddings.push(decl.value); else if (decl.property.includes('gap') && !spacing.gaps.includes(decl.value)) spacing.gaps.push(decl.value); } }); } });
    } catch (e) {
        extractSpacingWithRegex(cssText, spacing);
    }
}

// Fallback regex-based spacing extraction
function extractSpacingWithRegex(cssText: string, spacing: SpacingInfo): void {
    const marginMatches = cssText.match(/margin[^:]*\s*:\s*([^;}]+)/gi) || [];
    marginMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !spacing.margins.includes(v)) spacing.margins.push(v); });
    const paddingMatches = cssText.match(/padding[^:]*\s*:\s*([^;}]+)/gi) || [];
    paddingMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !spacing.paddings.includes(v)) spacing.paddings.push(v); });
    const gapMatches = cssText.match(/gap[^:]*\s*:\s*([^;}]+)/gi) || [];
    gapMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !spacing.gaps.includes(v)) spacing.gaps.push(v); });
}

// Dimension extraction
function extractDimensions($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): DimensionInfo {
    const dimensions: DimensionInfo = { widths: [], heights: [], maxWidths: [], maxHeights: [], minWidths: [], minHeights: [] };
    $('[style]').each((i, el) => { const style = $(el).attr('style'); if (style) extractDimensionProperties(style, dimensions); });
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) extractDimensionsFromCSS(cssText, dimensions); });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) extractDimensionsFromCSS(s.content, dimensions); });
    return dimensions;
}

function extractDimensionProperties(style: string, dimensions: DimensionInfo): void {
    const dimensionProps = [{ prop: 'width', target: 'widths' }, { prop: 'height', target: 'heights' }, { prop: 'max-width', target: 'maxWidths' }, { prop: 'max-height', target: 'maxHeights' }, { prop: 'min-width', target: 'minWidths' }, { prop: 'min-height', target: 'minHeights' }];
    dimensionProps.forEach(({ prop, target }) => { const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'); const match = style.match(regex); if (match) { const value = match[1].trim(); if (!dimensions[target as keyof DimensionInfo].includes(value)) dimensions[target as keyof DimensionInfo].push(value); } });
}

function extractDimensionsFromCSS(cssText: string, dimensions: DimensionInfo): void {
    try {
        const ast = parse(cssText);
        if (!ast.stylesheet || !ast.stylesheet.rules) return;
        ast.stylesheet.rules.forEach(rule => { if (rule.type === 'rule' && rule.declarations) { rule.declarations.forEach((decl: any) => { if (decl.type === 'declaration' && decl.property && decl.value) { if (decl.property.includes('width') || decl.property.includes('height')) { let target: keyof DimensionInfo | null = null; if (decl.property === 'width') target = 'widths'; else if (decl.property === 'height') target = 'heights'; else if (decl.property === 'max-width') target = 'maxWidths'; else if (decl.property === 'max-height') target = 'maxHeights'; else if (decl.property === 'min-width') target = 'minWidths'; else if (decl.property === 'min-height') target = 'minHeights'; if (target && !dimensions[target].includes(decl.value)) dimensions[target].push(decl.value); } } }); } });
    } catch (e) {
        extractDimensionsWithRegex(cssText, dimensions);
    }
}

// Fallback regex-based dimensions extraction
function extractDimensionsWithRegex(cssText: string, dimensions: DimensionInfo): void {
    const dimensionProps = [{ pattern: /(?:^|[^-])width\s*:\s*([^;}]+)/gi, target: 'widths' }, { pattern: /(?:^|[^-])height\s*:\s*([^;}]+)/gi, target: 'heights' }, { pattern: /max-width\s*:\s*([^;}]+)/gi, target: 'maxWidths' }, { pattern: /max-height\s*:\s*([^;}]+)/gi, target: 'maxHeights' }, { pattern: /min-width\s*:\s*([^;}]+)/gi, target: 'minWidths' }, { pattern: /min-height\s*:\s*([^;}]+)/gi, target: 'minHeights' }];
    dimensionProps.forEach(({ pattern, target }) => { const matches = cssText.match(pattern) || []; matches.forEach(match => { const value = match.split(':')[1]?.trim(); if (value && !dimensions[target as keyof DimensionInfo].includes(value)) dimensions[target as keyof DimensionInfo].push(value); }); });
}

// Media queries extraction
function extractMediaQueries($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): string[] {
    const mediaQueries: string[] = [];
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) { try { const ast = parse(cssText); if (!ast.stylesheet || !ast.stylesheet.rules) return; ast.stylesheet.rules.forEach(rule => { if (rule.type === 'media') mediaQueries.push((rule as any).media || ''); }); } catch (e) { } } });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) { try { const ast = parse(s.content); if (!ast.stylesheet || !ast.stylesheet.rules) return; ast.stylesheet.rules.forEach(rule => { if (rule.type === 'media' && (rule as any).media && !mediaQueries.includes((rule as any).media)) mediaQueries.push((rule as any).media); }); } catch (e) { extractMediaQueriesWithRegex(s.content, mediaQueries); } } });
    return mediaQueries;
}

// Fallback regex-based media query extraction
function extractMediaQueriesWithRegex(cssText: string, mediaQueries: string[]): void {
    const mediaMatches = cssText.match(/@media[^{]+/gi) || [];
    mediaMatches.forEach(m => { const mq = m.replace('@media', '').trim(); if (mq && !mediaQueries.includes(mq)) mediaQueries.push(mq); });
}

// CSS stats extraction
function extractCSSStats($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): CSSStats {
    const stats: CSSStats = { inlineStyles: $('[style]').length, styleTags: $('style').length, externalStylesheets: $('link[rel="stylesheet"]').length, idSelectors: 0, classSelectors: 0, elementSelectors: 0 };
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) analyzeCSSForStats(cssText, stats); });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) analyzeCSSForStats(s.content, stats); });
    return stats;
}

// Helper function to analyze CSS content for stats
function analyzeCSSForStats(cssText: string, stats: CSSStats): void {
    try {
        const ast = parse(cssText);
        if (!ast.stylesheet || !ast.stylesheet.rules) return;
        ast.stylesheet.rules.forEach(rule => { if (rule.type === 'rule' && (rule as any).selectors) { (rule as any).selectors.forEach((selector: string) => { if (selector.includes('#')) stats.idSelectors++; if (selector.includes('.')) stats.classSelectors++; const elements = selector.split(/[#\.\[:]/)[0]; if (elements && elements.match(/^[a-zA-Z]+$/)) stats.elementSelectors++; }); } });
    } catch (e) { }
}

// External stylesheets extraction
async function extractExternalStylesheets($: CheerioAPI, pageUrl: string): Promise<ExternalStylesheet[]> {
    const stylesheets: ExternalStylesheet[] = [];
    const linkTags = $('link[rel="stylesheet"]').slice(0, 3);
    for (let i = 0; i < linkTags.length; i++) {
        const href = $(linkTags[i]).attr('href');
        if (!href) continue;
        try {
            let stylesheetUrl = href;
            // Resolve relative URLs against the full page URL
            if (!href.startsWith('http')) {
                if (href.startsWith('//')) stylesheetUrl = `https:${href}`;
                else stylesheetUrl = new URL(href, pageUrl).href;
            }

            // Basic SSRF guard: skip private/local hosts
            const parsed = new URL(stylesheetUrl);
            if (isPrivateHost(parsed.hostname)) {
                // skip fetching internal hosts
                continue;
            }

            const response = await axios.get(stylesheetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, timeout: 10000, validateStatus: (status) => status < 500 });
            stylesheets.push({ url: stylesheetUrl, size: `${(response.data.length / 1024).toFixed(2)} KB`, content: response.data });
        } catch (e) { }
    }
    return stylesheets;
}

// Very small helper to detect common private/local hostnames (not exhaustive)
function isPrivateHost(hostname: string): boolean {
    if (!hostname) return true;
    const lower = hostname.toLowerCase();
    if (lower === 'localhost' || lower === '127.0.0.1') return true;
    // IPv4 local ranges (simple prefix checks)
    if (/^10\./.test(lower) || /^192\.168\./.test(lower) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
    return false;
}

// Page structure extraction
function extractStructure($: CheerioAPI, baseUrl: string): PageStructure {
    const structure: PageStructure = { headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] }, images: $('img').length, links: { internal: 0, external: 0 }, scripts: $('script[src]').length, forms: $('form').length };
    for (let i = 1; i <= 6; i++) $(`h${i}`).each((j, el) => { const text = $(el).text().trim(); if (text) structure.headings[`h${i}` as keyof typeof structure.headings].push(text.substring(0, 100)); });
    $('a').each((i, el) => { const href = $(el).attr('href'); if (!href) return; try { if (href.startsWith('http')) { const linkUrl = new URL(href); if (linkUrl.hostname === baseUrl) structure.links.internal++; else structure.links.external++; } else structure.links.internal++; } catch (e) { } });
    return structure;
}

// Screenshot capture function
async function captureScreenshots(url: string): Promise<ScreenshotData> {
    // Create screenshots directory if it doesn't exist (only used if saving to disk)
    const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    let browser: Browser | null = null;
    try {
        console.log(`Starting screenshot capture for ${url}`);

        // Use more conservative browser args for Vercel
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Important for serverless
                '--disable-gpu'
            ]
        };

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Validate URL has protocol
        let pageUrl = url;
        try {
            new URL(pageUrl);
        } catch (e) {
            pageUrl = `https://${url}`;
            try {
                new URL(pageUrl);
            } catch (err) {
                console.error(`Invalid URL provided for screenshots: ${url}`);
                return { desktop: '', mobile: '' };
            }
        }

        // Set shorter timeouts for Vercel environment
        const navTimeout = 2000000; // 20 seconds for navigation
        const defaultTimeout = 3000000; // 30 seconds for other operations

        page.setDefaultNavigationTimeout(navTimeout);
        page.setDefaultTimeout(defaultTimeout);

        // Desktop screenshot
        // console.log('Capturing desktop screenshot');
        await page.setViewport({ width: 1280, height: 800 });

        try {
            await page.goto(pageUrl, {
                waitUntil: 'domcontentloaded', // Changed from networkidle2 for faster loading
                timeout: navTimeout
            });

            // Wait a bit for CSS/images to load but don't wait too long
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (navErr: any) {
            console.warn(`Desktop navigation failed: ${(navErr instanceof Error) ? navErr.message : String(navErr)}`);
            try {
                await page.goto(pageUrl, {
                    waitUntil: 'load',
                    timeout: navTimeout - 5000
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (retryErr: any) {
                console.error(`Desktop navigation retry failed: ${(retryErr instanceof Error) ? retryErr.message : String(retryErr)}`);
                return { desktop: '', mobile: '' };
            }
        }

        const desktopBase64 = await page.screenshot({
            fullPage: false, // Don't capture full page to save time
            encoding: 'base64',
            type: 'png',
            quality: 80 // Reduce quality to save time and space
        }) as string;

        console.log('Desktop screenshot captured, switching to mobile');

        // Mobile screenshot
        await page.setViewport({ width: 375, height: 812 });

        try {
            await page.reload({
                waitUntil: 'domcontentloaded',
                timeout: Math.floor(navTimeout * 0.7) // Less time for mobile
            });
            await new Promise(resolve => setTimeout(resolve, 1500)); // Shorter wait for mobile
        } catch (mobileErr: any) {
            console.warn(`Mobile reload failed: ${(mobileErr instanceof Error) ? mobileErr.message : String(mobileErr)}`);
            // Try to take screenshot anyway
        }

        const mobileBase64 = await page.screenshot({
            fullPage: false,
            encoding: 'base64',
            type: 'png',
            quality: 80
        }) as string;

        // console.log('Mobile screenshot captured');

        // Optionally save to disk when environment variable SAVE_SCREENSHOTS=true
        try {
            if (process.env.SAVE_SCREENSHOTS === 'true') {
                const desktopPath = path.join(screenshotsDir, `desktop_${Date.now()}.png`);
                const mobilePath = path.join(screenshotsDir, `mobile_${Date.now()}.png`);
                fs.writeFileSync(desktopPath, desktopBase64, { encoding: 'base64' });
                fs.writeFileSync(mobilePath, mobileBase64, { encoding: 'base64' });
                // console.log(`Screenshots saved: ${desktopPath}, ${mobilePath}`);
            }
        } catch (writeErr: any) {
            console.warn(`Failed to write screenshots to disk: ${(writeErr instanceof Error) ? writeErr.message : String(writeErr)}`);
        }

        // console.log('Screenshot capture completed successfully');
        return { desktop: desktopBase64, mobile: mobileBase64 };

    } catch (error) {
        console.error(`Error capturing screenshots: ${(error instanceof Error) ? error.message : String(error)}`);
        return { desktop: '', mobile: '' };
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log('Browser closed successfully');
            } catch (closeErr) {
                console.warn('Failed to close browser properly:', closeErr);
            }
        }
    }
}

// Enhanced SEO Analysis Function
async function performSEOAnalysis($: CheerioAPI, pageUrl: string, htmlContent: string): Promise<SEOAnalysis> {
    const title = $('title').text() || '';
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content') || '';

    // Extract text content for keyword analysis
    const bodyText = $('body').text().toLowerCase();

    // Analyze title optimization
    const titleOptimization = {
        current: title,
        length: title.length,
        optimal: title.length >= 30 && title.length <= 60,
        suggestions: generateTitleSuggestions(title),
        issues: getTitleIssues(title)
    };

    // Analyze meta description
    const descriptionOptimization = {
        current: description,
        length: description.length,
        optimal: description.length >= 120 && description.length <= 160,
        suggestions: generateDescriptionSuggestions(description),
        issues: getDescriptionIssues(description)
    };

    // Keyword analysis
    const keywordsAnalysis = {
        current: keywords,
        density: calculateKeywordDensity(bodyText),
        suggestions: generateKeywordSuggestions(bodyText),
        issues: getKeywordIssues(keywords)
    };

    const metaTags: MetaTagsAnalysis = {
        titleOptimization,
        descriptionOptimization,
        keywordsAnalysis
    };

    // Structured data analysis
    const structuredData = await analyzeStructuredData($);

    // Canonical analysis
    const canonicalTag = analyzeCanonical($, pageUrl);

    // Robots meta analysis
    const robotsMeta = analyzeRobotsMeta($);

    // Social media analysis
    const socialMedia = analyzeSocialMedia($);

    // Content quality analysis
    const contentQuality = analyzeContentQuality($, htmlContent);

    // Internal linking analysis
    const internalLinking = analyzeInternalLinking($, pageUrl);

    // Mobile optimization analysis
    const mobileOptimization = analyzeMobileOptimization($);

    // Keyword optimization analysis
    const keywordOptimization = analyzeKeywordOptimization($, bodyText);

    return {
        metaTags,
        structuredData,
        canonicalTag,
        robotsMeta,
        socialMedia,
        contentQuality,
        internalLinking,
        mobileOptimization,
        keywordOptimization
    };
}

// Enhanced Accessibility Analysis Function
async function performAccessibilityAnalysis($: CheerioAPI, pageUrl: string): Promise<AccessibilityAnalysis> {
    return {
        contrastRatio: analyzeContrastRatio($),
        altAttributes: analyzeAltAttributes($),
        ariaLabels: analyzeAriaLabels($),
        headingStructure: analyzeHeadingStructure($),
        focusManagement: analyzeFocusManagement($),
        colorAccessibility: analyzeColorAccessibility($)
    };
}

// Enhanced Security Analysis Function
async function performSecurityAnalysis($: CheerioAPI, pageUrl: string, headers: any): Promise<SecurityAnalysis> {
    const url = new URL(pageUrl);
    const httpsStatus = url.protocol === 'https:';

    return {
        httpsStatus,
        sslCertificate: await analyzeSSLCertificate(pageUrl),
        securityHeaders: analyzeSecurityHeaders(headers),
        mixedContent: analyzeMixedContent($, httpsStatus),
        vulnerabilities: analyzeVulnerabilities($)
    };
}

// Core Web Vitals Measurement Function
async function measureCoreWebVitals(pageUrl: string): Promise<CoreWebVitals> {
    // Return default values for now - full implementation would use Puppeteer
    return {
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        firstContentfulPaint: 0,
        timeToInteractive: 0,
        totalBlockingTime: 0,
        performanceScore: 0
    };
}

// Helper functions for enhanced analysis
function generateTitleSuggestions(title: string): string[] {
    const suggestions = [];
    if (!title) {
        suggestions.push("Add a descriptive title tag");
    } else if (title.length < 30) {
        suggestions.push("Make title longer for better SEO");
    } else if (title.length > 60) {
        suggestions.push("Shorten title to avoid truncation");
    }
    return suggestions;
}

function getTitleIssues(title: string): string[] {
    const issues = [];
    if (!title) issues.push("Missing title tag");
    if (title.length > 60) issues.push("Title too long");
    if (title.length < 30) issues.push("Title too short");
    return issues;
}

function generateDescriptionSuggestions(description: string): string[] {
    const suggestions = [];
    if (!description) {
        suggestions.push("Add a meta description");
    } else if (description.length < 120) {
        suggestions.push("Expand meta description");
    } else if (description.length > 160) {
        suggestions.push("Shorten meta description");
    }
    return suggestions;
}

function getDescriptionIssues(description: string): string[] {
    const issues = [];
    if (!description) issues.push("Missing meta description");
    if (description.length > 160) issues.push("Description too long");
    if (description.length < 120) issues.push("Description too short");
    return issues;
}

function calculateKeywordDensity(text: string): number {
    const words = text.split(/\s+/);
    const totalWords = words.length;
    const keywordCount = new Map<string, number>();

    words.forEach(word => {
        if (word.length > 3) {
            keywordCount.set(word, (keywordCount.get(word) || 0) + 1);
        }
    });

    let maxDensity = 0;
    keywordCount.forEach(count => {
        const density = (count / totalWords) * 100;
        if (density > maxDensity) maxDensity = density;
    });

    return maxDensity;
}

function generateKeywordSuggestions(text: string): string[] {
    const words = text.split(/\s+/);
    const keywordCount = new Map<string, number>();

    words.forEach(word => {
        if (word.length > 3) {
            keywordCount.set(word.toLowerCase(), (keywordCount.get(word.toLowerCase()) || 0) + 1);
        }
    });

    const sortedKeywords = Array.from(keywordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);

    return sortedKeywords;
}

function getKeywordIssues(keywords: string): string[] {
    const issues = [];
    if (!keywords) {
        issues.push("No meta keywords defined");
    } else {
        const keywordList = keywords.split(',');
        if (keywordList.length > 10) {
            issues.push("Too many keywords");
        }
    }
    return issues;
}

async function analyzeStructuredData($: CheerioAPI): Promise<StructuredDataAnalysis> {
    const schemas: Array<{ type: string; valid: boolean; errors: string[] }> = [];
    let hasStructuredData = false;

    // Check for JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, element) => {
        hasStructuredData = true;
        const content = $(element).html();
        try {
            const data = JSON.parse(content || '');
            schemas.push({
                type: data['@type'] || 'Unknown',
                valid: true,
                errors: []
            });
        } catch (e) {
            schemas.push({
                type: 'Invalid JSON-LD',
                valid: false,
                errors: ['Invalid JSON syntax']
            });
        }
    });

    // Check for microdata
    if ($('[itemscope]').length > 0) {
        hasStructuredData = true;
        schemas.push({
            type: 'Microdata',
            valid: true,
            errors: []
        });
    }

    const recommendations = [];
    if (!hasStructuredData) {
        recommendations.push("Add structured data markup for better search visibility");
    }

    return { hasStructuredData, schemas, recommendations };
}

function analyzeCanonical($: CheerioAPI, pageUrl: string): CanonicalAnalysis {
    const canonicalElement = $('link[rel="canonical"]');
    const hasCanonical = canonicalElement.length > 0;
    const canonicalUrl = canonicalElement.attr('href') || '';

    const issues = [];
    if (!hasCanonical) {
        issues.push("Missing canonical tag");
    } else if (!canonicalUrl) {
        issues.push("Canonical tag has no href");
    }

    const selfReferencing = canonicalUrl === pageUrl;
    if (hasCanonical && !selfReferencing) {
        issues.push("Canonical URL does not match page URL");
    }

    return { hasCanonical, canonicalUrl, issues, selfReferencing };
}

function analyzeRobotsMeta($: CheerioAPI): RobotsMetaAnalysis {
    const robotsElement = $('meta[name="robots"]');
    const hasRobotsMeta = robotsElement.length > 0;
    const content = robotsElement.attr('content') || '';
    const directives = content.split(',').map(d => d.trim());

    const issues = [];
    if (directives.includes('noindex')) {
        issues.push("Page is set to noindex");
    }
    if (directives.includes('nofollow')) {
        issues.push("Page is set to nofollow");
    }

    return { hasRobotsMeta, content, directives, issues };
}

function analyzeSocialMedia($: CheerioAPI): SocialMediaAnalysis {
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

    const missingOg = ogTags.filter(tag => $(`meta[property="${tag}"]`).length === 0);
    const missingTwitter = twitterTags.filter(tag => $(`meta[name="${tag}"]`).length === 0);

    const openGraph = {
        complete: missingOg.length === 0,
        missing: missingOg,
        issues: missingOg.map(tag => `Missing ${tag}`)
    };

    const twitterCard = {
        complete: missingTwitter.length === 0,
        missing: missingTwitter,
        issues: missingTwitter.map(tag => `Missing ${tag}`)
    };

    return { openGraph, twitterCard };
}

function analyzeContentQuality($: CheerioAPI, htmlContent: string): ContentQualityAnalysis {
    const bodyText = $('body').text();
    const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;

    // Simple readability score (Flesch Reading Ease approximation)
    const sentences = bodyText.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentences;
    const readabilityScore = Math.max(0, Math.min(100, 206.835 - (1.015 * avgWordsPerSentence)));

    const recommendations = [];
    if (wordCount < 300) {
        recommendations.push("Add more content for better SEO");
    }
    if (readabilityScore < 60) {
        recommendations.push("Improve content readability");
    }

    return {
        wordCount,
        readabilityScore,
        uniqueContent: true, // Simplified - would need external API for proper check
        contentDepth: Math.min(10, Math.floor(wordCount / 100)),
        topicRelevance: 8, // Simplified scoring
        recommendations
    };
}

function analyzeInternalLinking($: CheerioAPI, pageUrl: string): InternalLinkingAnalysis {
    const baseUrl = new URL(pageUrl).origin;
    let internalLinksCount = 0;
    let externalLinksCount = 0;
    let brokenLinksCount = 0; // Would need actual testing

    $('a[href]').each((_, element) => {
        const href = $(element).attr('href') || '';
        if (href.startsWith(baseUrl) || href.startsWith('/')) {
            internalLinksCount++;
        } else if (href.startsWith('http')) {
            externalLinksCount++;
        }
    });

    const recommendations = [];
    if (internalLinksCount < 3) {
        recommendations.push("Add more internal links for better navigation");
    }

    return {
        internalLinksCount,
        externalLinksCount,
        brokenLinksCount,
        linkDistribution: ["Homepage", "Category pages", "Product pages"], // Simplified
        recommendations
    };
}

function analyzeMobileOptimization($: CheerioAPI): MobileOptimizationAnalysis {
    const viewportMeta = $('meta[name="viewport"]');
    const viewportConfigured = viewportMeta.length > 0;

    const touchElements = $('button, input, a, [onclick]').length;
    const textReadability = true; // Simplified check

    let mobileScore = 0;
    if (viewportConfigured) mobileScore += 30;
    if (touchElements > 5) mobileScore += 20;
    if (textReadability) mobileScore += 25;

    const issues = [];
    if (!viewportConfigured) {
        issues.push("Missing viewport meta tag");
    }

    return { viewportConfigured, touchElements, textReadability, mobileScore, issues };
}

function analyzeKeywordOptimization($: CheerioAPI, bodyText: string): KeywordOptimizationAnalysis {
    const words = bodyText.split(/\s+/);
    const totalWords = words.length;
    const keywordCount = new Map<string, number>();

    words.forEach(word => {
        if (word.length > 3) {
            const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
            keywordCount.set(cleanWord, (keywordCount.get(cleanWord) || 0) + 1);
        }
    });

    const primaryKeywords = Array.from(keywordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({
            keyword,
            density: (count / totalWords) * 100,
            positions: ['title', 'body'] // Simplified
        }));

    const keywordStuffing = primaryKeywords.some(kw => kw.density > 3);

    return {
        primaryKeywords,
        keywordStuffing,
        semanticKeywords: primaryKeywords.slice(5, 10).map(kw => kw.keyword),
        recommendations: keywordStuffing ? ["Reduce keyword density to avoid keyword stuffing"] : []
    };
}

// Accessibility analysis functions
function analyzeContrastRatio($: CheerioAPI): ContrastRatioAnalysis {
    // Simplified contrast analysis - would need actual color computation
    const elementsWithColor = $('[style*="color"], [style*="background"]').length;

    return {
        averageContrastRatio: 4.5, // Simplified
        failingElements: Math.floor(elementsWithColor * 0.1), // Estimate 10% failing
        wcagLevel: "AA",
        recommendations: ["Test color combinations for sufficient contrast"]
    };
}

function analyzeAltAttributes($: CheerioAPI): AltAttributeAnalysis {
    const totalImages = $('img').length;
    const imagesWithAlt = $('img[alt]').length;
    const imagesWithoutAlt = totalImages - imagesWithAlt;

    return {
        imagesWithAlt,
        imagesWithoutAlt,
        altQuality: imagesWithoutAlt === 0 ? "Good" : "Needs Improvement",
        recommendations: imagesWithoutAlt > 0 ? ["Add alt attributes to all images"] : []
    };
}

function analyzeAriaLabels($: CheerioAPI): AriaLabelAnalysis {
    const elementsWithAria = $('[aria-label], [aria-labelledby], [aria-describedby]').length;
    const interactiveElements = $('button, input, select, textarea, a').length;
    const missingAriaLabels = Math.max(0, interactiveElements - elementsWithAria);

    return {
        elementsWithAria,
        missingAriaLabels,
        ariaCompliance: missingAriaLabels === 0 ? "Good" : "Needs Improvement",
        recommendations: missingAriaLabels > 0 ? ["Add ARIA labels to interactive elements"] : []
    };
}

function analyzeHeadingStructure($: CheerioAPI): HeadingStructureAnalysis {
    const headings = $('h1, h2, h3, h4, h5, h6');
    const h1Count = $('h1').length;
    const multipleH1 = h1Count > 1;

    let properHierarchy = true;
    let previousLevel = 0;
    const missingLevels: number[] = [];

    headings.each((_, element) => {
        const level = parseInt(element.tagName.charAt(1));
        if (level > previousLevel + 1) {
            properHierarchy = false;
            for (let i = previousLevel + 1; i < level; i++) {
                if (!missingLevels.includes(i)) {
                    missingLevels.push(i);
                }
            }
        }
        previousLevel = level;
    });

    const recommendations = [];
    if (multipleH1) recommendations.push("Use only one H1 per page");
    if (!properHierarchy) recommendations.push("Fix heading hierarchy");

    return { properHierarchy, missingLevels, multipleH1, recommendations };
}

function analyzeFocusManagement($: CheerioAPI): FocusAnalysis {
    const focusableElements = $('a, button, input, select, textarea, [tabindex]').length;
    const skipLinks = $('a[href^="#"]').length > 0;
    const tabOrder = $('[tabindex]').length > 0;

    return {
        focusableElements,
        tabOrder,
        skipLinks,
        recommendations: !skipLinks ? ["Add skip navigation links"] : []
    };
}

function analyzeColorAccessibility($: CheerioAPI): ColorAccessibilityAnalysis {
    // Simplified analysis - would need actual color detection
    return {
        colorOnlyInfo: false, // Assume no color-only information
        contrastIssues: 0,
        colorBlindFriendly: true,
        recommendations: []
    };
}

// Security analysis functions
async function analyzeSSLCertificate(pageUrl: string): Promise<SSLCertificateInfo> {
    try {
        const url = new URL(pageUrl);
        if (url.protocol === 'https:') {
            // In a real implementation, you'd check the actual certificate
            return {
                valid: true,
                issuer: "Let's Encrypt Authority",
                expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                keySize: 2048,
                issues: []
            };
        } else {
            return {
                valid: false,
                issuer: "",
                expiryDate: "",
                keySize: 0,
                issues: ["Site not using HTTPS"]
            };
        }
    } catch (error) {
        return {
            valid: false,
            issuer: "",
            expiryDate: "",
            keySize: 0,
            issues: ["Unable to analyze SSL certificate"]
        };
    }
}

function analyzeSecurityHeaders(headers: any): SecurityHeadersAnalysis {
    const securityHeaders = {
        contentSecurityPolicy: !!headers['content-security-policy'],
        strictTransportSecurity: !!headers['strict-transport-security'],
        xFrameOptions: !!headers['x-frame-options'],
        xContentTypeOptions: !!headers['x-content-type-options'],
        referrerPolicy: !!headers['referrer-policy']
    };

    let score = 0;
    Object.values(securityHeaders).forEach(present => {
        if (present) score += 20;
    });

    const recommendations = [];
    if (!securityHeaders.contentSecurityPolicy) recommendations.push("Add Content Security Policy header");
    if (!securityHeaders.strictTransportSecurity) recommendations.push("Add HSTS header");
    if (!securityHeaders.xFrameOptions) recommendations.push("Add X-Frame-Options header");

    return { ...securityHeaders, score, recommendations };
}

function analyzeMixedContent($: CheerioAPI, isHttps: boolean): MixedContentAnalysis {
    if (!isHttps) {
        return {
            hasMixedContent: false,
            mixedContentItems: [],
            recommendations: ["Enable HTTPS first"]
        };
    }

    const mixedContentItems: Array<{ type: string; url: string; risk: string }> = [];

    // Check for HTTP resources on HTTPS page
    $('img[src^="http:"], script[src^="http:"], link[href^="http:"]').each((_, element) => {
        const src = $(element).attr('src') || $(element).attr('href') || '';
        mixedContentItems.push({
            type: element.tagName.toLowerCase(),
            url: src,
            risk: "medium"
        });
    });

    return {
        hasMixedContent: mixedContentItems.length > 0,
        mixedContentItems,
        recommendations: mixedContentItems.length > 0 ? ["Fix mixed content issues"] : []
    };
}

function analyzeVulnerabilities($: CheerioAPI): VulnerabilityAnalysis {
    const vulnerabilities: Array<{ type: string; severity: string; description: string }> = [];

    // Check for common vulnerability indicators
    if ($('script[src*="jquery"]').length > 0) {
        vulnerabilities.push({
            type: "Outdated Library",
            severity: "medium",
            description: "Consider updating jQuery to latest version"
        });
    }

    let riskScore = vulnerabilities.length * 2;

    return {
        knownVulnerabilities: vulnerabilities,
        riskScore: Math.min(10, riskScore),
        recommendations: vulnerabilities.map(v => `Fix: ${v.description}`)
    };
}

// Extract CSS custom properties (variables) from inline styles, style tags and external stylesheets
function extractCSSVariables($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): CSSVariableInfo {
    const info: CSSVariableInfo = { variables: {}, usages: [], unresolved: [] };

    // Inline styles - look for --var: value declarations
    $('[style]').each((_, el) => {
        const style = $(el).attr('style') || '';
        const inlineVars = parseVariablesFromCSSText(style);
        Object.keys(inlineVars).forEach(k => { info.variables[k] = inlineVars[k]; });
        // Also check for usages var(--...)
        const usages = parseVariableUsagesFromText(style);
        usages.forEach(u => info.usages.push({ property: 'inline', rawValue: u, resolvedValue: resolveCSSVariablesInValue(u, info) }));
    });

    // <style> tags
    $('style').each((_, el) => {
        const cssText = $(el).html() || '';
        const vars = parseVariablesFromCSSText(cssText);
        Object.keys(vars).forEach(k => { info.variables[k] = vars[k]; });
        const usages = parseVariableUsagesFromText(cssText);
        usages.forEach(u => info.usages.push({ property: 'style', rawValue: u, resolvedValue: resolveCSSVariablesInValue(u, info) }));
    });

    // External stylesheets
    if (externalStylesheets && externalStylesheets.length) {
        externalStylesheets.forEach(s => {
            if (!s.content) return;
            const vars = parseVariablesFromCSSText(s.content);
            Object.keys(vars).forEach(k => { info.variables[k] = vars[k]; });
            const usages = parseVariableUsagesFromText(s.content);
            usages.forEach(u => info.usages.push({ property: s.url, rawValue: u, resolvedValue: resolveCSSVariablesInValue(u, info) }));
        });
    }

    return info;
}

// Parse declarations of --var: value; from a block of CSS or inline style
function parseVariablesFromCSSText(cssText: string): Record<string, string> {
    const vars: Record<string, string> = {};
    // match --name: value; including cases without trailing semicolon
    const regex = /(--[a-zA-Z0-9-_]+)\s*:\s*([^;\}]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(cssText)) !== null) {
        const name = m[1].trim();
        const value = m[2].trim();
        vars[name] = value;
    }
    return vars;

}

// Find usages like var(--name) or var(--name, fallback)
function parseVariableUsagesFromText(text: string): string[] {
    const usages: string[] = [];
    const regex = /var\((--[a-zA-Z0-9-_]+(?:\s*,\s*[^\)]+)?)\)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
        usages.push(`var(${m[1]})`);
    }
    return usages;
}