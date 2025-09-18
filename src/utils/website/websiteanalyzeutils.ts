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
            timeout: 15000,
            validateStatus: (status) => status < 500
        });
        const loadTime = Date.now() - startTime;
        const $ = cheerio.load(response.data, { xmlMode: true, decodeEntities: false, recognizeCDATA: true });
        const pageHostname = new URL(pageUrl).hostname;
        const externalStylesheets = await extractExternalStylesheets($, pageUrl);
        const [metadata, fonts, colors, spacing, dimensions, mediaQueries, cssStats, structure, screenshots] = await Promise.all([
            extractMetadata($),
            extractFonts($, externalStylesheets),
            extractColors($, externalStylesheets),
            extractSpacing($, externalStylesheets),
            extractDimensions($, externalStylesheets),
            extractMediaQueries($, externalStylesheets),
            extractCSSStats($, externalStylesheets),
            extractStructure($, pageHostname),
            captureScreenshots(pageUrl)
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
            structure,
            screenshots
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
    const websiteName = $('meta[property="og:site_name"]').attr('content') || 'Not found';
    const websiteIcon = $('link[rel="icon"]').attr('href') || 'Not found';

    console.log(`Website Name: ${websiteName}`);
    console.log(`Website Icon: ${websiteIcon}`);

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
function extractColors($: CheerioAPI, externalStylesheets?: ExternalStylesheet[]): ColorInfo {
    const colors: ColorInfo = { text: [], background: [], border: [], other: [] };
    $('[style]').each((i, el) => { const style = $(el).attr('style'); if (style) extractColorProperties(style, colors); });
    $('style').each((i, el) => { const cssText = $(el).html(); if (cssText) extractColorsFromCSS(cssText, colors); });
    if (externalStylesheets && externalStylesheets.length) externalStylesheets.forEach(s => { if (s.content) extractColorsFromCSS(s.content, colors); });
    return colors;
}

function extractColorProperties(style: string, colors: ColorInfo): void {
    const colorProps = [{ prop: 'color', category: 'text' }, { prop: 'background-color', category: 'background' }, { prop: 'border-color', category: 'border' }, { prop: 'border-top-color', category: 'border' }, { prop: 'border-right-color', category: 'border' }, { prop: 'border-bottom-color', category: 'border' }, { prop: 'border-left-color', category: 'border' }, { prop: 'outline-color', category: 'other' }];
    colorProps.forEach(({ prop, category }) => { const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'); const match = style.match(regex); if (match) { const color = match[1].trim(); if (!colors[category as keyof ColorInfo].includes(color)) colors[category as keyof ColorInfo].push(color); } });
}

function extractColorsFromCSS(cssText: string, colors: ColorInfo): void {
    try {
        const ast = parse(cssText);
        if (!ast.stylesheet || !ast.stylesheet.rules) return;
        ast.stylesheet.rules.forEach(rule => { if (rule.type === 'rule' && rule.declarations) { rule.declarations.forEach((decl: any) => { if (decl.type === 'declaration' && decl.property && decl.property.includes('color') && decl.value) { let category: keyof ColorInfo = 'other'; if (decl.property === 'color') category = 'text'; else if (decl.property.includes('background')) category = 'background'; else if (decl.property.includes('border')) category = 'border'; if (!colors[category].includes(decl.value)) colors[category].push(decl.value); } }); } });
    } catch (e) {
        extractColorsWithRegex(cssText, colors);
    }
}

// Fallback regex-based color extraction
function extractColorsWithRegex(cssText: string, colors: ColorInfo): void {
    const colorMatches = cssText.match(/color\s*:\s*([^;}]+)/gi) || [];
    colorMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !colors.text.includes(v)) colors.text.push(v); });
    const bgMatches = cssText.match(/background-color\s*:\s*([^;}]+)/gi) || [];
    bgMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !colors.background.includes(v)) colors.background.push(v); });
    const borderMatches = cssText.match(/border-color\s*:\s*([^;}]+)/gi) || [];
    borderMatches.forEach(m => { const v = m.split(':')[1]?.trim(); if (v && !colors.border.includes(v)) colors.border.push(v); });
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
        const isVercel = process.env.VERCEL === '1';
        const navTimeout = isVercel ? 25000 : 30000;
        const defaultTimeout = isVercel ? 20000 : 30000;
        
        page.setDefaultNavigationTimeout(navTimeout);
        page.setDefaultTimeout(defaultTimeout);

        // Desktop screenshot
        console.log('Capturing desktop screenshot');
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

        console.log('Mobile screenshot captured');

        // Optionally save to disk when environment variable SAVE_SCREENSHOTS=true
        try {
            if (process.env.SAVE_SCREENSHOTS === 'true') {
                const desktopPath = path.join(screenshotsDir, `desktop_${Date.now()}.png`);
                const mobilePath = path.join(screenshotsDir, `mobile_${Date.now()}.png`);
                fs.writeFileSync(desktopPath, desktopBase64, { encoding: 'base64' });
                fs.writeFileSync(mobilePath, mobileBase64, { encoding: 'base64' });
                console.log(`Screenshots saved: ${desktopPath}, ${mobilePath}`);
            }
        } catch (writeErr: any) {
            console.warn(`Failed to write screenshots to disk: ${(writeErr instanceof Error) ? writeErr.message : String(writeErr)}`);
        }

        console.log('Screenshot capture completed successfully');
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