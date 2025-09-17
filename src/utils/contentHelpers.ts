import puppeteer, { Browser } from 'puppeteer';
import axios from 'axios';
import { generateTitleSuggestions, generateDescriptionSuggestions, generateKeywordsSuggestions, generateHeadingSuggestions, analyzeContentLength } from './content/seoHelpers';

let browserInstance: Browser | null = null;

export async function getBrowserInstance(): Promise<Browser> {
    if (!browserInstance || browserInstance.isConnected() === false) {
        if (browserInstance) {
            await browserInstance.close().catch(() => { });
            browserInstance = null;
        }
        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-web-security',
                '--no-zygote',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ],
            timeout: 60000
        });
    }
    return browserInstance as Browser;
}

export async function closeBrowserInstance(): Promise<void> {
    if (browserInstance) {
        await browserInstance.close().catch(() => { });
        browserInstance = null;
    }
}

process.on('beforeExit', closeBrowserInstance);
process.on('SIGINT', closeBrowserInstance);
process.on('SIGTERM', closeBrowserInstance);

export function analyzeThinContent(text: string, wordCount: number, headings: Array<{ level: number; text: string }>) {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const isThinContent = wordCount < 300;

    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const uniqueParagraphs = [...new Set(paragraphs.map(p => p.trim().toLowerCase()))].length;

    const averageParagraphLength = paragraphs.length > 0
        ? paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length
        : 0;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = text.split(/\s+/).length;
    const averageSentenceLength = sentences.length > 0 ? totalWords / sentences.length : 0;
    const sentenceComplexity = averageSentenceLength > 15 ?
        Math.min(100, (averageSentenceLength / 25) * 100) :
        (averageSentenceLength / 15) * 50;

    const uniqueWords = new Set(
        text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !isStopWord(word))
    );
    const topicCoverage = Math.min(100, (uniqueWords.size / Math.max(100, wordCount)) * 100);

    let contentDepthScore = 0;
    if (wordCount >= 1000) contentDepthScore += 40;
    else if (wordCount >= 500) contentDepthScore += 30;
    else if (wordCount >= 300) contentDepthScore += 20;
    else if (wordCount >= 150) contentDepthScore += 10;

    const paragraphDiversityRatio = paragraphs.length > 0 ? uniqueParagraphs / paragraphs.length : 0;
    contentDepthScore += paragraphDiversityRatio * 20;

    contentDepthScore += (sentenceComplexity / 100) * 20;
    contentDepthScore += (topicCoverage / 100) * 20;

    contentDepthScore = Math.round(contentDepthScore);

    if (isThinContent) {
        issues.push(`Content is too short (${wordCount} words, minimum recommended: 300)`);
        recommendations.push('Expand content to at least 300 words with valuable, detailed information');
    }

    if (paragraphs.length < 3) {
        issues.push('Too few paragraphs - content appears unstructured');
        recommendations.push('Break content into more paragraphs for better readability');
    }

    if (averageParagraphLength < 15) {
        issues.push('Paragraphs are too short and may lack depth');
        recommendations.push('Develop paragraphs with more detailed explanations and examples');
    }

    if (uniqueParagraphs < paragraphs.length * 0.8) {
        issues.push('High paragraph similarity detected - content may be repetitive');
        recommendations.push('Reduce repetitive content and add unique value in each paragraph');
    }

    if (headings.length === 0) {
        issues.push('No headings found - content lacks structure');
        recommendations.push('Add headings (H1, H2, H3) to structure your content');
    } else if (headings.length < Math.ceil(wordCount / 200)) {
        issues.push('Too few headings for content length');
        recommendations.push('Add more headings to break up long content sections');
    }

    if (topicCoverage < 30) {
        issues.push('Limited topic coverage - content may lack comprehensive information');
        recommendations.push('Add more diverse, relevant keywords and cover the topic more thoroughly');
    }

    if (sentenceComplexity < 20) {
        issues.push('Sentences are too simple - content may lack depth');
        recommendations.push('Use more varied sentence structures and detailed explanations');
    }

    return {
        isThinContent,
        contentDepthScore,
        uniqueParagraphs,
        averageParagraphLength: Math.round(averageParagraphLength),
        sentenceComplexity: Math.round(sentenceComplexity),
        topicCoverage: Math.round(topicCoverage),
        issues,
        recommendations
    };
}

export function generateSEOContentSuggestions(
    title: string,
    description: string,
    keywords: string,
    headings: Array<{ level: number; text: string }>,
    wordCount: number,
    topKeywords: string[]
) {
    const metaTagSuggestions = {
        title: generateTitleSuggestions(title, topKeywords),
        description: generateDescriptionSuggestions(description, title, topKeywords),
        keywords: generateKeywordsSuggestions(keywords, topKeywords)
    };

    const headingSuggestions = generateHeadingSuggestions(headings, topKeywords);
    const contentLengthAnalysis = analyzeContentLength(wordCount, title, headings);

    return {
        metaTagSuggestions,
        headingSuggestions,
        contentLengthAnalysis
    };
}

export function analyzeKeywords(text: string, title?: string, description?: string, headings: string[] = [], altTexts: string[] = []) {
    const cleanText = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = cleanText.split(' ').filter(word =>
        word.length > 2 &&
        !isStopWord(word) &&
        !/^\d+$/.test(word)
    );

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const totalWords = words.length;
    const keywords = Object.entries(wordFreq)
        .map(([keyword, count]) => ({
            keyword,
            count,
            density: (count / totalWords) * 100,
            prominence: calculateKeywordProminence(keyword, title, description, headings, altTexts)
        }))
        .sort((a, b) => b.density - a.density)
        .slice(0, 20);

    const analyzeTextKeywords = (t: string) => {
        const ct = t.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        return ct.split(' ').filter(w => w.length > 2 && !isStopWord(w)).reduce((acc: Record<string, number>, w) => {
            acc[w] = (acc[w] || 0) + 1; return acc;
        }, {});
    };

    const keywordDistribution = {
        title: analyzeTextKeywords(title || ''),
        description: analyzeTextKeywords(description || ''),
        headings: analyzeTextKeywords(headings.join(' ')),
        content: analyzeTextKeywords(text),
        altText: analyzeTextKeywords(altTexts.join(' '))
    };

    const overOptimizedKeywords = keywords.filter(k => k.density > 3).map(k => k.keyword);
    const underOptimizedKeywords = keywords
        .filter(k => k.count >= 5 && k.prominence < 2)
        .map(k => k.keyword);

    const averageDensity = keywords.reduce((sum, k) => sum + k.density, 0) / keywords.length || 0;

    return {
        topKeywords: keywords,
        keywordDensity: averageDensity,
        overOptimizedKeywords,
        underOptimizedKeywords,
        keywordDistribution
    };
}

export function isStopWord(word: string): boolean {
    const stopWords = [
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'
    ];
    return stopWords.includes(word.toLowerCase());
}

export function calculateKeywordProminence(keyword: string, title?: string, description?: string, headings: string[] = [], altTexts: string[] = []): number {
    let prominence = 0;

    if (title && title.toLowerCase().includes(keyword)) prominence += 5;
    if (description && description.toLowerCase().includes(keyword)) prominence += 3;
    if (headings.some(h => h.toLowerCase().includes(keyword))) prominence += 4;
    if (altTexts.some(alt => alt.toLowerCase().includes(keyword))) prominence += 2;

    return prominence;
}

export function detectDuplicateContent(elements: Array<{ type: string; content: string; location: string }>) {
    const contentMap: Record<string, Array<{ type: string; location: string }>> = {};

    elements.forEach(element => {
        const normalizedContent = element.content.trim().toLowerCase();
        if (normalizedContent.length > 10) {
            if (!contentMap[normalizedContent]) {
                contentMap[normalizedContent] = [];
            }
            contentMap[normalizedContent].push({
                type: element.type,
                location: element.location
            });
        }
    });

    const duplicates = Object.entries(contentMap)
        .filter(([content, occurrences]) => occurrences.length > 1)
        .map(([content, occurrences]) => ({
            type: occurrences[0].type as 'title' | 'description' | 'heading' | 'content',
            content,
            count: occurrences.length,
            locations: occurrences.map(occ => occ.location)
        }));

    const totalElements = elements.length;
    const duplicatePercentage = totalElements > 0 ? (duplicates.length / totalElements) * 100 : 0;

    return {
        duplicateElements: duplicates,
        duplicatePercentage,
        issues: generateDuplicateContentIssues(duplicates),
        recommendations: generateDuplicateContentRecommendations(duplicates, duplicatePercentage)
    };
}

function generateDuplicateContentIssues(duplicates: Array<{ type: string; content: string; count: number; locations: string[] }>): string[] {
    const issues: string[] = [];

    duplicates.forEach(duplicate => {
        if (duplicate.type === 'title') {
            issues.push(`Duplicate title found in ${duplicate.count} locations: "${duplicate.content.substring(0, 50)}..."`);
        } else if (duplicate.type === 'description') {
            issues.push(`Duplicate meta description found in ${duplicate.count} locations`);
        } else if (duplicate.type === 'heading') {
            issues.push(`Duplicate heading found ${duplicate.count} times: "${duplicate.content.substring(0, 50)}..."`);
        } else if (duplicate.type === 'content') {
            issues.push(`Duplicate content block found in ${duplicate.count} locations`);
        }
    });

    return issues;
}

function generateDuplicateContentRecommendations(duplicates: Array<any>, duplicatePercentage: number): string[] {
    const recommendations: string[] = [];

    if (duplicatePercentage > 20) {
        recommendations.push('Reduce duplicate content to improve SEO performance');
    }

    if (duplicates.some(d => d.type === 'title')) {
        recommendations.push('Create unique, descriptive titles for each page');
    }

    if (duplicates.some(d => d.type === 'description')) {
        recommendations.push('Write unique meta descriptions for each page');
    }

    if (duplicates.some(d => d.type === 'heading')) {
        recommendations.push('Use varied heading structures and content');
    }

    if (duplicates.length > 5) {
        recommendations.push('Implement canonical tags for similar content');
        recommendations.push('Consider consolidating similar pages');
    }

    return recommendations;
}
